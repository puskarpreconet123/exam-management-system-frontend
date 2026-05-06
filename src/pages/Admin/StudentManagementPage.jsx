import React, { useState, useEffect } from "react";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

export default function StudentManagementPage() {
    const { showToast } = useToast();
    
    // State for students listing
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedBoard, setSelectedBoard] = useState("All");
    const [selectedClass, setSelectedClass] = useState("All");
    const [selectedReferral, setSelectedReferral] = useState("All");
    const [referralCodes, setReferralCodes] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
    const [searchTrigger, setSearchTrigger] = useState(0);

    // Modal state
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    // Form state for editing
    const [formData, setFormData] = useState({
        name: "", email: "", role: "", paymentStatus: ""
    });

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/admin/users?page=${pagination.page}&limit=${pagination.limit}&search=${search}&board=${selectedBoard}&class=${selectedClass}&referralCode=${selectedReferral}`);
            setStudents(res.data.users || []);
            setPagination(prev => ({ ...prev, total: res.data.total, pages: res.data.pages }));
        } catch (error) {
            console.error(error);
            showToast("Failed to fetch students.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line
    }, [pagination.page, pagination.limit, searchTrigger, selectedBoard, selectedClass, selectedReferral]);

    useEffect(() => {
        const fetchReferrals = async () => {
            try {
                const res = await api.get('/admin/referrals');
                setReferralCodes(res.data.referrals || []);
            } catch (error) {
                console.error("Failed to fetch referral codes", error);
            }
        };
        fetchReferrals();
    }, []);

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

    const openModal = (student) => {
        setSelectedStudent(student);
        setIsEditMode(false);
        setFormData({
            name: student.name,
            email: student.email,
            role: student.role,
            paymentStatus: student.paymentStatus || 'pending'
        });
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const res = await api.put(`/admin/users/${selectedStudent._id}`, formData);
            showToast("Student updated successfully!", "success");
            
            // Update local state
            setStudents(students.map(u => u._id === selectedStudent._id ? res.data.user : u));
            setSelectedStudent(res.data.user);
            setIsEditMode(false);
        } catch (error) {
            console.error(error);
            showToast(error.response?.data?.message || "Failed to update student", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (student) => {
        setDeleteTarget(student);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await api.delete(`/admin/users/${deleteTarget._id}`);
            showToast("Student deleted successfully", "success");
            setDeleteTarget(null);
            setSelectedStudent(null);
            fetchUsers();
        } catch (error) {
            console.error(error);
            showToast("Failed to delete student", "error");
        } finally {
            setIsDeleting(false);
        }
    };

    const cancelDelete = () => {
        setDeleteTarget(null);
    };

    const handleExportExcel = async () => {
        try {
            setIsExporting(true);
            // Fetch all matching data for export (no pagination limit)
            const res = await api.get(`/admin/users?limit=10000&search=${search}&board=${selectedBoard}&class=${selectedClass}&referralCode=${selectedReferral}`);
            const allStudents = res.data.users || [];

            if (allStudents.length === 0) {
                showToast("No data to export", "warning");
                return;
            }

            // Map data for Excel
            const excelData = allStudents.map(s => {
                const addressStr = [
                    s.address?.locality,
                    s.address?.district === 'Other' ? s.address?.customDistrict : s.address?.district,
                    s.address?.state === 'Other' ? s.address?.customState : s.address?.state,
                    s.address?.country,
                    s.address?.pin
                ].filter(Boolean).join(", ");

                return {
                    "Student Name": s.name,
                    "Student Email": s.email,
                    "Student Contact": s.studentDetails?.studentContact || "N/A",
                    "Student DOB": s.studentDetails?.dob || "N/A",
                    "Board": s.studentDetails?.board || "N/A",
                    "Class": s.studentDetails?.className || "N/A",
                    "School Name": s.studentDetails?.schoolName || "N/A",
                    "Guardian Name": s.guardianDetails?.guardianName || "N/A",
                    "Guardian Contact": s.guardianDetails?.guardianContact || "N/A",
                    "Guardian Email": s.guardianDetails?.guardianEmail || "N/A",
                    "Full Address": addressStr || "N/A",
                    "Locality": s.address?.locality || "N/A",
                    "District": (s.address?.district === 'Other' ? s.address?.customDistrict : s.address?.district) || "N/A",
                    "State": (s.address?.state === 'Other' ? s.address?.customState : s.address?.state) || "N/A",
                    "Pincode": s.address?.pin || "N/A",
                    "Payment Status": s.paymentStatus || "pending",
                    "Transaction ID": s.transactionId || "N/A",
                    "Referral Code Used": s.usedReferralCode || "N/A",
                    "Joined Date": dayjs(s.createdAt).format("DD MMM YYYY, hh:mm A")
                };
            });

            console.log("Exporting students data:", allStudents);
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
            XLSX.writeFile(workbook, `Students_Data_${dayjs().format("YYYY-MM-DD_HH-mm")}.xlsx`);
            
            showToast("Exported successfully!", "success");
        } catch (error) {
            console.error(error);
            showToast("Failed to export data", "error");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Student Management
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Manage all platform students, their details, and system access.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={handleExportExcel}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition shadow-lg shadow-emerald-500/20 disabled:opacity-60"
                    >
                        <span className="material-symbols-outlined text-[20px]">
                            {isExporting ? "sync" : "download"}
                        </span>
                        {isExporting ? "Exporting..." : "Export Excel"}
                    </button>
                    
                    <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input 
                                type="text" 
                                placeholder="Search name, email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-4 focus:ring-orange-500/10 outline-none text-slate-900 dark:text-white"
                            />
                            {search && (
                                <button type="button" onClick={handleClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            )}
                        </div>
                        <button type="submit" className="px-5 py-2.5 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition shadow-lg shadow-orange-500/20">
                            Search
                        </button>
                    </form>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-[20px]">filter_list</span>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Filters:</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500">Board:</label>
                        <select
                            value={selectedBoard}
                            onChange={(e) => {
                                setSelectedBoard(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                        >
                            <option value="All">All Boards</option>
                            <option value="General">General</option>
                            <option value="CBSE">CBSE</option>
                            <option value="ICSE">ICSE</option>
                            <option value="State Board">State Board</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500">Class:</label>
                        <select
                            value={selectedClass}
                            onChange={(e) => {
                                setSelectedClass(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                        >
                            <option value="All">All Classes</option>
                            <option value="General">General</option>
                            <option value="Class 5">Class 5</option>
                            <option value="Class 6">Class 6</option>
                            <option value="Class 7">Class 7</option>
                            <option value="Class 8">Class 8</option>
                            <option value="Class 9">Class 9</option>
                            <option value="Class 10">Class 10</option>
                            <option value="Class 11">Class 11</option>
                            <option value="Class 12">Class 12</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500">Referral:</label>
                        <select
                            value={selectedReferral}
                            onChange={(e) => {
                                setSelectedReferral(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                        >
                            <option value="All">All Referrals</option>
                            {referralCodes.map(ref => (
                                <option key={ref._id} value={ref.code}>{ref.code} ({ref.schoolName})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm relative min-h-[400px]">
                {loading && (
                    <div className="absolute inset-0 z-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">
                        <div className="animate-spin size-10 border-4 border-orange-600 border-t-transparent rounded-full"></div>
                    </div>
                )}
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                <th className="p-4">Student Info</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Board & Class</th>
                                <th className="p-4 text-center">Payment</th>
                                <th className="p-4 text-right">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {students.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="material-symbols-outlined text-4xl text-slate-300">group_off</span>
                                            <p className="text-sm font-bold text-slate-500">No students found matching your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {students.map(student => (
                                <tr 
                                    key={student._id} 
                                    onClick={() => openModal(student)}
                                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group"
                                >
                                    <td className="p-4">
                                        <div className="font-bold text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors">{student.name}</div>
                                        <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">phone</span>
                                            {student.studentDetails?.studentContact || "No Phone"}
                                        </div>
                                    </td>
                                    <td className="p-4 font-medium text-slate-600 dark:text-slate-300">{student.email}</td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="px-2 py-0.5 w-fit text-[10px] font-black rounded-md bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 border border-orange-100 dark:border-orange-500/20">
                                                {student.studentDetails?.board || "General"}
                                            </span>
                                            <span className="text-[11px] font-bold text-slate-500">
                                                {student.studentDetails?.className || "General"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 ${student.paymentStatus === 'completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20'}`}>
                                            <span className={`size-1.5 rounded-full ${student.paymentStatus === 'completed' ? 'bg-emerald-500' : 'bg-orange-500'}`}></span>
                                            {student.paymentStatus === 'completed' ? 'Paid' : 'Pending'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">
                                        {dayjs(student.createdAt).format("DD MMM YYYY")}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            Page {pagination.page} of {pagination.pages} <span className="mx-2 text-slate-300">•</span> {pagination.total} Total Students
                        </div>
                        <div className="flex gap-2">
                            <button 
                                disabled={pagination.page <= 1}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 transition shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                            </button>
                            <button 
                                disabled={pagination.page >= pagination.pages}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 transition shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>

            {/* Details Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedStudent(null)}></div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl relative border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col">
                        
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0 font-black text-xl">
                                    {selectedStudent.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Student Profile</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {selectedStudent._id}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => isEditMode ? setIsEditMode(false) : setIsEditMode(true)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition flex items-center gap-2 ${isEditMode ? 'bg-slate-200 text-slate-700 hover:bg-slate-300  dark:bg-slate-700 dark:text-slate-200' : 'bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-400'}`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">{isEditMode ? "chevron_backward" : "edit"}</span>
                                    {isEditMode ? "Back" : "Edit"}
                                </button>
                                <button onClick={() => setSelectedStudent(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition">
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
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Full Name</label>
                                            <input 
                                                value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-bold focus:ring-4 focus:ring-orange-500/10 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Email Address</label>
                                            <input 
                                                value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-bold focus:ring-4 focus:ring-orange-500/10 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Payment Status</label>
                                            <select 
                                                value={formData.paymentStatus} onChange={(e) => setFormData({...formData, paymentStatus: e.target.value})}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-bold focus:ring-4 focus:ring-orange-500/10 outline-none"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="completed">Completed</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                                        <button onClick={() => handleDelete(selectedStudent)} className="px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center gap-2 mr-auto transition">
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                            Delete Student
                                        </button>
                                        <button onClick={handleSave} disabled={isSaving} className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-widest transition flex items-center gap-2 shadow-lg shadow-orange-500/20">
                                            {isSaving ? "Saving..." : "Save Changes"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* Core Info */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                        <DetailItem icon="badge" label="Name" value={selectedStudent.name} />
                                        <DetailItem icon="mail" label="Email" value={selectedStudent.email} />
                                        <DetailItem icon={selectedStudent.role === 'admin' ? "admin_panel_settings" : "person"} label="Role" value={<span className="uppercase text-[10px] font-black tracking-widest text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-500/10">{selectedStudent.role}</span>} />
                                        <DetailItem icon="event" label="Joined On" value={dayjs(selectedStudent.createdAt).format("DD MMM YYYY, hh:mm A")} />
                                        
                                        <DetailItem icon="verified" label="Email Verified" value={selectedStudent.emailVerified ? <span className="text-emerald-500 font-bold">Yes</span> : <span className="text-orange-500 font-bold">No</span>} />
                                        <DetailItem icon="phone_iphone" label="Phone Verified" value={selectedStudent.phoneVerified ? <span className="text-emerald-500 font-bold">Yes</span> : <span className="text-orange-500 font-bold">No</span>} />
                                    </div>

                                    {/* Student Specifics */}
                                    {selectedStudent.role === 'student' && (
                                        <>
                                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800/50">
                                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[18px]">school</span> Student Details
                                                </h3>
                                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                                    <DetailItem label="Class & Board" value={`${selectedStudent.studentDetails?.className || 'N/A'} - ${selectedStudent.studentDetails?.board || 'N/A'}`} />
                                                    <DetailItem label="School" value={selectedStudent.studentDetails?.schoolName || 'N/A'} />
                                                    <DetailItem label="Contact" value={selectedStudent.studentDetails?.studentContact || 'N/A'} />
                                                    <DetailItem label="DOB" value={selectedStudent.studentDetails?.dob || 'N/A'} />
                                                    <DetailItem label="Referral Code Used" value={selectedStudent.usedReferralCode || <span className="text-slate-400 italic">None</span>} />
                                                    <DetailItem label="Transaction ID" value={selectedStudent.transactionId || <span className="text-slate-400 italic">None</span>} />
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800/50">
                                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[18px]">family_restroom</span> Guardian Details
                                                </h3>
                                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                                    <DetailItem label="Guardian Name" value={selectedStudent.guardianDetails?.guardianName || 'N/A'} />
                                                    <DetailItem label="Contact" value={selectedStudent.guardianDetails?.guardianContact || 'N/A'} />
                                                    <DetailItem label="Email" value={selectedStudent.guardianDetails?.guardianEmail || 'N/A'} />
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800/50">
                                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[18px]">location_on</span> Address
                                                </h3>
                                                <div className="grid grid-cols-1">
                                                    <DetailItem 
                                                        label="Full Address" 
                                                        value={[
                                                            selectedStudent.address?.locality,
                                                            selectedStudent.address?.district === 'Other' ? selectedStudent.address?.customDistrict : selectedStudent.address?.district,
                                                            selectedStudent.address?.state === 'Other' ? selectedStudent.address?.customState : selectedStudent.address?.state,
                                                            selectedStudent.address?.country,
                                                            selectedStudent.address?.pin
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
            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={cancelDelete}
                    ></div>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
                        <div className="p-8 text-center">
                            <div className="size-20 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-6 animate-bounce">
                                <span className="material-symbols-outlined text-4xl">person_remove</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Delete Student?</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                You are about to permanently delete <span className="text-rose-500 font-bold">"{deleteTarget.name}"</span>. 
                                This action cannot be undone and will remove all their data from the system.
                            </p>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
                            <button
                                onClick={cancelDelete}
                                className="flex-1 py-4 text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="flex-[2] py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-600/20 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Deleting...
                                    </>
                                ) : (
                                    'Confirm Delete'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function DetailItem({ icon, label, value }) {
    if(!value) return null;
    return (
        <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {icon && <span className="material-symbols-outlined text-[14px] shrink-0">{icon}</span>}
                <span className="truncate">{label}</span>
            </div>
            <div className="font-bold text-slate-800 dark:text-white text-sm break-all">
                {value}
            </div>
        </div>
    );
}
