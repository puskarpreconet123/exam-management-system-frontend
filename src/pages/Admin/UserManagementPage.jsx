import React, { useState, useEffect } from "react";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import dayjs from "dayjs";

export default function UserManagementPage() {
    const { showToast } = useToast();
    
    // State for users listing
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
    const [searchTrigger, setSearchTrigger] = useState(0);

    // Modal state
    const [selectedUser, setSelectedUser] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form state for editing
    const [formData, setFormData] = useState({
        name: "", email: "", role: "", paymentStatus: ""
    });

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/admin/users?page=${pagination.page}&limit=${pagination.limit}&search=${search}`);
            setUsers(res.data.users || []);
            setPagination(prev => ({ ...prev, total: res.data.total, pages: res.data.pages }));
        } catch (error) {
            console.error(error);
            showToast("Failed to fetch users.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line
    }, [pagination.page, pagination.limit, searchTrigger]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        setSearchTrigger(prev => prev + 1);
    };

    const handleClearSearch = () => {
        setSearch("");
        setPagination(prev => ({ ...prev, page: 1 }));
        setSearchTrigger(prev => prev + 1);
    };

    const openModal = (user) => {
        setSelectedUser(user);
        setIsEditMode(false);
        setFormData({
            name: user.name,
            email: user.email,
            role: user.role,
            paymentStatus: user.paymentStatus || 'pending'
        });
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const res = await api.put(`/admin/users/${selectedUser._id}`, formData);
            showToast("User updated successfully!", "success");
            
            // Update local state
            setUsers(users.map(u => u._id === selectedUser._id ? res.data.user : u));
            setSelectedUser(res.data.user);
            setIsEditMode(false);
        } catch (error) {
            console.error(error);
            showToast(error.response?.data?.message || "Failed to update user", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) return;
        try {
            await api.delete(`/admin/users/${id}`);
            showToast("User deleted successfully", "success");
            setSelectedUser(null);
            fetchUsers();
        } catch (error) {
            console.error(error);
            showToast("Failed to delete user", "error");
        }
    };

    return (
        <>
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        User Management
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Manage all platform users, their roles, and system access.
                    </p>
                </div>
                
                <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input 
                            type="text" 
                            placeholder="Search name, email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none text-slate-900 dark:text-white"
                        />
                        {search && (
                            <button type="button" onClick={handleClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        )}
                    </div>
                    <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20">
                        Search
                    </button>
                </form>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm relative min-h-[400px]">
                {loading && (
                    <div className="absolute inset-0 z-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">
                        <div className="animate-spin size-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
                    </div>
                )}
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                                <th className="p-4">Name</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Role</th>
                                <th className="p-4 text-center">Payment</th>
                                <th className="p-4 text-right">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {users.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            )}
                            {users.map(user => (
                                <tr 
                                    key={user._id} 
                                    onClick={() => openModal(user)}
                                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group"
                                >
                                    <td className="p-4">
                                        <div className="font-bold text-slate-900 dark:text-white">{user.name}</div>
                                        <div className="text-xs text-slate-500">{user.studentDetails?.studentContact || "No Phone"}</div>
                                    </td>
                                    <td className="p-4 font-medium text-slate-600 dark:text-slate-300">{user.email}</td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wide inline-flex items-center gap-1 ${user.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                                            <span className="material-symbols-outlined text-[14px]">
                                                {user.role === 'admin' ? 'admin_panel_settings' : 'person'}
                                            </span>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        {user.role === 'admin' ? (
                                            <span className="text-slate-400 font-medium text-xs">N/A</span>
                                        ) : (
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${user.paymentStatus === 'completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20'}`}>
                                                <span className={`size-1.5 rounded-full ${user.paymentStatus === 'completed' ? 'bg-emerald-500' : 'bg-orange-500'}`}></span>
                                                {user.paymentStatus === 'completed' ? 'Paid' : 'Pending'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right text-sm font-medium text-slate-500">
                                        {dayjs(user.createdAt).format("DD MMM YYYY")}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="text-sm font-semibold text-slate-500">
                            Page {pagination.page} of {pagination.pages} <span className="mx-2">•</span> {pagination.total} Total Users
                        </div>
                        <div className="flex gap-2">
                            <button 
                                disabled={pagination.page <= 1}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                            </button>
                            <button 
                                disabled={pagination.page >= pagination.pages}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>

            {/* Details Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)}></div>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl relative border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col">
                        
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 font-black text-xl">
                                    {selectedUser.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">User Profile</h2>
                                    <p className="text-sm font-medium text-slate-500">ID: {selectedUser._id}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => isEditMode ? setIsEditMode(false) : setIsEditMode(true)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-1 ${isEditMode ? 'bg-slate-200 text-slate-700 hover:bg-slate-300  dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-indigo-500/20' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20'}`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">{isEditMode ? "chevron_backward" : "edit"}</span>
                                    {isEditMode ? "Back" : "Edit"}
                                </button>
                                <button onClick={() => setSelectedUser(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            {isEditMode ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                                            <input 
                                                value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                                            <input 
                                                value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Role</label>
                                            <select 
                                                value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="student">Student</option>
                                                <option value="admin">Administrator</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Status</label>
                                            <select 
                                                value={formData.paymentStatus} onChange={(e) => setFormData({...formData, paymentStatus: e.target.value})}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="completed">Completed</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                                        <button onClick={() => handleDelete(selectedUser._id)} className="px-5 py-3 rounded-xl font-bold bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-2 mr-auto transition">
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                            Delete User
                                        </button>
                                        <button onClick={handleSave} disabled={isSaving} className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                                            {isSaving ? "Saving..." : "Save Changes"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* Core Info */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                        <DetailItem icon="badge" label="Name" value={selectedUser.name} />
                                        <DetailItem icon="mail" label="Email" value={selectedUser.email} />
                                        <DetailItem icon={selectedUser.role === 'admin' ? "admin_panel_settings" : "person"} label="Role" value={<span className="uppercase text-xs font-black tracking-wider text-indigo-600 dark:text-indigo-400">{selectedUser.role}</span>} />
                                        <DetailItem icon="event" label="Joined On" value={dayjs(selectedUser.createdAt).format("DD MMM YYYY, hh:mm A")} />
                                        
                                        <DetailItem icon="verified" label="Email Verified" value={selectedUser.emailVerified ? <span className="text-emerald-500 font-bold">Yes</span> : <span className="text-orange-500 font-bold">No</span>} />
                                        <DetailItem icon="phone_iphone" label="Phone Verified" value={selectedUser.phoneVerified ? <span className="text-emerald-500 font-bold">Yes</span> : <span className="text-orange-500 font-bold">No</span>} />
                                    </div>

                                    {/* Student Specifics */}
                                    {selectedUser.role === 'student' && (
                                        <>
                                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800/50">
                                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[18px]">school</span> Student Details
                                                </h3>
                                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                                    <DetailItem label="Class & Board" value={`${selectedUser.studentDetails?.className || 'N/A'} - ${selectedUser.studentDetails?.board || 'N/A'}`} />
                                                    <DetailItem label="School" value={selectedUser.studentDetails?.schoolName || 'N/A'} />
                                                    <DetailItem label="Contact" value={selectedUser.studentDetails?.studentContact || 'N/A'} />
                                                    <DetailItem label="DOB" value={selectedUser.studentDetails?.dob || 'N/A'} />
                                                    <DetailItem label="Referral Code Used" value={selectedUser.usedReferralCode || <span className="text-slate-400 italic">None</span>} />
                                                    <DetailItem label="Transaction ID" value={selectedUser.transactionId || <span className="text-slate-400 italic">None</span>} />
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800/50">
                                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[18px]">family_restroom</span> Guardian Details
                                                </h3>
                                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                                    <DetailItem label="Guardian Name" value={selectedUser.guardianDetails?.guardianName || 'N/A'} />
                                                    <DetailItem label="Contact" value={selectedUser.guardianDetails?.guardianContact || 'N/A'} />
                                                    <DetailItem label="Email" value={selectedUser.guardianDetails?.guardianEmail || 'N/A'} />
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800/50">
                                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[18px]">location_on</span> Address
                                                </h3>
                                                <div className="grid grid-cols-1">
                                                    <DetailItem 
                                                        label="Full Address" 
                                                        value={[
                                                            selectedUser.address?.locality,
                                                            selectedUser.address?.district === 'Other' ? selectedUser.address?.customDistrict : selectedUser.address?.district,
                                                            selectedUser.address?.state === 'Other' ? selectedUser.address?.customState : selectedUser.address?.state,
                                                            selectedUser.address?.country,
                                                            selectedUser.address?.pin
                                                        ].filter(Boolean).join(", ")} 
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            <style jsx="true">{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #334155; }
            `}</style>
        </>
    );
}

function DetailItem({ icon, label, value }) {
    if(!value) return null;
    return (
        <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
                {icon && <span className="material-symbols-outlined text-[16px] shrink-0">{icon}</span>}
                <span className="truncate">{label}</span>
            </div>
            <div className="font-semibold text-slate-900 dark:text-white text-base break-all">
                {value}
            </div>
        </div>
    );
}
