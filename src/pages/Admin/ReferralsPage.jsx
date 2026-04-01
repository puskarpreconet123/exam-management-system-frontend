import React, { useState, useEffect } from "react";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";

export default function ReferralsPage() {
    const { showToast } = useToast();
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newReferral, setNewReferral] = useState({ code: "", schoolName: "", paymentType: "offline" });
    const [shareModal, setShareModal] = useState({ isOpen: false, referral: null });

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
            setNewReferral({ code: "", schoolName: "", paymentType: "offline" });
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

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Referral Management
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Create and manage referral codes for partner schools or promotional campaigns.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form to Add New Referral */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm sticky top-24">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                <span className="material-symbols-outlined text-xl">add_box</span>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create New Code</h2>
                        </div>
                        
                        <form onSubmit={handleCreateReferral} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Referral Code
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. SCHOOL2026"
                                    value={newReferral.code}
                                    onChange={(e) => setNewReferral({ ...newReferral, code: e.target.value.toUpperCase() })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50 uppercase"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Entity / School Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Springfield High"
                                    value={newReferral.schoolName}
                                    onChange={(e) => setNewReferral({ ...newReferral, schoolName: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Payment Type
                                </label>
                                <select
                                    value={newReferral.paymentType}
                                    onChange={(e) => setNewReferral({ ...newReferral, paymentType: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                >
                                    <option value="offline">Offline</option>
                                    <option value="online">Online</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={isCreating}
                                className="w-full py-3.5 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {isCreating ? (
                                    <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">add</span>
                                        Generate Code
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Referral List */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500">list_alt</span>
                                Existing Codes
                            </h2>
                            <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold">
                                Total: {referrals.length}
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center p-12">
                                <div className="animate-spin size-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
                            </div>
                        ) : referrals.length === 0 ? (
                            <div className="p-12 text-center flex flex-col items-center">
                                <div className="size-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
                                    <span className="material-symbols-outlined text-3xl">inbox</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Referral Codes Found</h3>
                                <p className="text-slate-500 mt-1">Generate your first code using the form on the left.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                                            <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Code</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Entity Name</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Status</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Share</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {referrals.map((ref) => (
                                            <tr key={ref._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                                <td className="p-4">
                                                    <div className="font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg inline-block text-sm border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
                                                        {ref.code}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                        {ref.schoolName}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-md text-xs font-bold capitalize ${ref.paymentType === 'online' ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'}`}>
                                                        {ref.paymentType || 'Offline'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {ref.isActive ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-500/20">
                                                            <span className="size-1.5 rounded-full bg-emerald-500"></span>
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold border border-slate-200 dark:border-slate-700">
                                                            <span className="size-1.5 rounded-full bg-slate-400"></span>
                                                            Inactive
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button
                                                        onClick={() => setShareModal({ isOpen: true, referral: ref })}
                                                        className="p-1.5 text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 rounded-lg inline-flex items-center justify-center"
                                                        title="Share Link & QR"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">share</span>
                                                    </button>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => handleToggleStatus(ref._id, ref.isActive)}
                                                        className={`p-2 rounded-xl border text-sm font-bold flex items-center justify-center size-9 ml-auto transition-all ${
                                                            ref.isActive 
                                                            ? "text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 dark:border-red-500/20 dark:bg-red-500/10 dark:hover:bg-red-500/20" 
                                                            : "text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20"
                                                        }`}
                                                        title={ref.isActive ? "Deactivate Code" : "Activate Code"}
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">
                                                            {ref.isActive ? "block" : "check_circle"}
                                                        </span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Share Modal */}
            {shareModal.isOpen && shareModal.referral && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setShareModal({ isOpen: false, referral: null })}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <div className="text-center space-y-4">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Share Referral</h3>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                {shareModal.referral.schoolName} ({shareModal.referral.code})
                            </p>
                            <div className="flex justify-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl mx-auto items-center">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/register?ref=' + shareModal.referral.code)}`} 
                                    alt="QR Code" 
                                    className="rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 size-48 bg-white p-2"
                                />
                            </div>
                            <div>
                                <input 
                                    readOnly 
                                    value={`${window.location.origin}/register?ref=${shareModal.referral.code}`}
                                    className="w-full text-center px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 outline-none select-all focus:ring-2 focus:ring-indigo-500/50"
                                />
                            </div>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/register?ref=${shareModal.referral.code}`);
                                    showToast("Link copied to clipboard!", "success");
                                }}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-500/20 flex justify-center items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[20px]">content_copy</span>
                                Copy Link
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
