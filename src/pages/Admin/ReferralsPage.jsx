import React, { useState, useEffect } from "react";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";

export default function ReferralsPage() {
    const { showToast } = useToast();
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newReferral, setNewReferral] = useState({ code: "", schoolName: "", paymentType: "offline", message: "" });
    const [shareModal, setShareModal] = useState({ isOpen: false, referral: null });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, referralId: null, referralCode: '' });

    const fetchReferrals = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/referrals");
            setReferrals(res.data.referrals || []);
        } catch (error) {
            console.error("Error fetching referrals:", error);
            showToast("Failed to fetch referral codes.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReferrals();
    }, []);

    const handleCreateReferral = async (e) => {
        e.preventDefault();
        try {
            setIsCreating(true);
            const res = await api.post("/admin/referrals", newReferral);
            showToast("Referral code created successfully!", "success");
            setReferrals([res.data.referral, ...referrals]);
            setNewReferral({ code: "", schoolName: "", paymentType: "offline", message: "" });
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error("Error creating referral:", error);
            showToast(error.response?.data?.message || "Failed to create referral code.", "error");
        } finally {
            setIsCreating(false);
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        try {
            await api.patch(`/admin/referrals/${id}/toggle`);
            showToast(`Referral code ${currentStatus ? "deactivated" : "activated"} successfully.`, "success");
            setReferrals(referrals.map((ref) => 
                ref._id === id ? { ...ref, isActive: !currentStatus } : ref
            ));
        } catch (error) {
            console.error("Error toggling referralstatus:", error);
            showToast("Failed to update status.", "error");
        }
    };

    const handleDeleteReferral = async () => {
        try {
            setLoading(true);
            await api.delete(`/admin/referrals/${deleteModal.referralId}`);
            showToast("Referral code deleted successfully.", "success");
            setReferrals(referrals.filter(ref => ref._id !== deleteModal.referralId));
            setDeleteModal({ isOpen: false, referralId: null, referralCode: '' });
        } catch (error) {
            console.error("Error deleting referral:", error);
            showToast("Failed to delete referral code.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Referral Management
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Create and manage referral codes for partner schools or promotional campaigns.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined">add_circle</span>
                    Generate New Code
                </button>
            </div>

            {/* Stats Overview (Optional, following Exams style) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Referrals</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{referrals.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Codes</p>
                    <p className="text-3xl font-black text-emerald-500 mt-1">{referrals.filter(r => r.isActive).length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inactive Codes</p>
                    <p className="text-3xl font-black text-slate-400 mt-1">{referrals.filter(r => !r.isActive).length}</p>
                </div>
            </div>

            {/* Referral List - Full Width */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-orange-500">list_alt</span>
                        Existing Referral Codes
                    </h2>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="animate-spin size-10 border-4 border-orange-600 border-t-transparent rounded-full mb-4"></div>
                        <p className="text-sm font-bold text-slate-500">Syncing database...</p>
                    </div>
                ) : referrals.length === 0 ? (
                    <div className="p-20 text-center flex flex-col items-center">
                        <div className="size-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 mb-6">
                            <span className="material-symbols-outlined text-5xl">inbox</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-xs">No records found</h3>
                        <p className="text-slate-500 mt-2">Generate your first code using the button above.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Referral Code</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Entity Name</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Type</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Share</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {referrals.map((ref) => (
                                    <tr key={ref._id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="font-mono font-black text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 px-4 py-2 rounded-xl inline-block text-sm border border-orange-100 dark:border-orange-500/20 shadow-sm uppercase tracking-wider">
                                                {ref.code}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                {ref.schoolName}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${ref.paymentType === 'online' ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/10' : 'bg-orange-50 text-orange-600 dark:bg-orange-500/10'}`}>
                                                {ref.paymentType || 'Offline'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            {ref.isActive ? (
                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:bg-emerald-500/10">
                                                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                                                    <span className="size-2 rounded-full bg-slate-400"></span>
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <button
                                                onClick={() => setShareModal({ isOpen: true, referral: ref })}
                                                className="size-10 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-xl inline-flex items-center justify-center transition-all"
                                                title="Share Link & QR"
                                            >
                                                <span className="material-symbols-outlined text-xl">share</span>
                                            </button>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => handleToggleStatus(ref._id, ref.isActive)}
                                                    className={`size-10 rounded-xl border flex items-center justify-center transition-all ${
                                                        ref.isActive 
                                                        ? "text-orange-600 border-orange-100 bg-orange-50 hover:bg-orange-100 dark:border-orange-500/20 dark:bg-orange-500/10" 
                                                        : "text-emerald-600 border-emerald-100 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                                                    }`}
                                                    title={ref.isActive ? "Deactivate Code" : "Activate Code"}
                                                >
                                                    <span className="material-symbols-outlined text-xl">
                                                        {ref.isActive ? "block" : "check_circle"}
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() => setDeleteModal({ isOpen: true, referralId: ref._id, referralCode: ref.code })}
                                                    className="size-10 rounded-xl border border-rose-100 bg-rose-50 text-rose-500 hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 flex items-center justify-center transition-all"
                                                    title="Delete Code"
                                                >
                                                    <span className="material-symbols-outlined text-xl">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Creation Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-4">
                                <div className="size-10 bg-orange-600 rounded-xl flex items-center justify-center text-white">
                                    <span className="material-symbols-outlined">add_box</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Generate Code</h2>
                                    <p className="text-xs font-bold text-slate-400 mt-1">Configure your new referral link</p>
                                </div>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-all text-slate-400">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        
                        <div className="p-8">
                            <form onSubmit={handleCreateReferral} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Referral Code</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. SCHOOL2026"
                                            value={newReferral.code}
                                            onChange={(e) => setNewReferral({ ...newReferral, code: e.target.value.toUpperCase() })}
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none uppercase"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Entity / School Name</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Springfield High"
                                            value={newReferral.schoolName}
                                            onChange={(e) => setNewReferral({ ...newReferral, schoolName: e.target.value })}
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Payment Type</label>
                                        <select
                                            value={newReferral.paymentType}
                                            onChange={(e) => setNewReferral({ ...newReferral, paymentType: e.target.value })}
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white focus:border-orange-500 transition-all outline-none"
                                        >
                                            <option value="offline">Offline</option>
                                            <option value="online">Online</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Optional Message</label>
                                        <textarea
                                            placeholder="e.g. Welcome to our school registration portal!"
                                            value={newReferral.message}
                                            onChange={(e) => setNewReferral({ ...newReferral, message: e.target.value })}
                                            rows={3}
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white focus:border-orange-500 transition-all outline-none resize-none"
                                        />
                                    </div>
                                </div>
                                <div className="pt-2 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold rounded-2xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreating}
                                        className="flex-[2] py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                    >
                                        {isCreating ? (
                                            <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined">rocket_launch</span>
                                                Generate Code
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {shareModal.isOpen && shareModal.referral && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl relative border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setShareModal({ isOpen: false, referral: null })}
                            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <div className="text-center space-y-6">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Share Referral</h3>
                                <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mt-1">
                                    {shareModal.referral.schoolName} ({shareModal.referral.code})
                                </p>
                            </div>
                            <div className="flex justify-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl mx-auto items-center">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/register?ref=' + shareModal.referral.code)}`} 
                                    alt="QR Code" 
                                    className="rounded-xl shadow-xl border-4 border-white dark:border-slate-700 size-48 bg-white p-2"
                                />
                            </div>
                            <div>
                                <input 
                                    readOnly 
                                    value={`${window.location.origin}/register?ref=${shareModal.referral.code}`}
                                    className="w-full text-center px-4 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 outline-none select-all focus:ring-4 focus:ring-orange-500/10"
                                />
                            </div>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/register?ref=${shareModal.referral.code}`);
                                    showToast("Link copied to clipboard!", "success");
                                }}
                                className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex justify-center items-center gap-2 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-xl">content_copy</span>
                                Copy Link
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="text-center space-y-6">
                            <div className="size-20 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mx-auto animate-bounce">
                                <span className="material-symbols-outlined text-4xl">warning</span>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Delete Referral?</h3>
                                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                    Are you sure you want to delete <span className="text-rose-500 font-black">"{deleteModal.referralCode}"</span>? This action is permanent.
                                </p>
                            </div>
                            
                            <div className="flex gap-4 pt-2">
                                <button 
                                    onClick={() => setDeleteModal({ isOpen: false, referralId: null, referralCode: '' })}
                                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold rounded-2xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleDeleteReferral}
                                    className="flex-[2] py-4 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-rose-500/20 active:scale-95"
                                >
                                    Yes, Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
