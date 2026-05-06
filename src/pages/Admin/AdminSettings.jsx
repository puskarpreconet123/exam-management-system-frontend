import React, { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';

export default function AdminSettings() {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({
        registrationAmount: '',
        razorpayKeyId: '',
        razorpayKeySecret: '',
        razorpayWebhookSecret: '',
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/settings');
            setSettings({
                registrationAmount: res.data.registrationAmount || '',
                razorpayKeyId: res.data.razorpayKeyId || '',
                razorpayKeySecret: res.data.razorpayKeySecret || '',
                razorpayWebhookSecret: res.data.razorpayWebhookSecret || '',
            });
        } catch (err) {
            showToast('Failed to fetch settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await api.patch('/admin/settings', settings);
            showToast('Integration settings updated successfully', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Integration Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium text-sm">Configure payment gateways and third-party services.</p>
                </div>
            </header>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {loading && !settings.registrationAmount ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full size-12 border-b-2 border-orange-500 mx-auto"></div>
                    </div>
                ) : (
                    <form onSubmit={handleUpdate}>
                        <div className="p-6 md:p-8 space-y-8">
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                                    <div className="size-12 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 flex items-center justify-center">
                                        <span className="material-symbols-outlined">payments</span>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Payment Configuration</h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Manage Razorpay keys and registration fees.</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Registration Amount (INR)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                            <input
                                                type="number"
                                                value={settings.registrationAmount}
                                                onChange={(e) => setSettings({ ...settings, registrationAmount: e.target.value })}
                                                placeholder="e.g. 500"
                                                min={1}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-2 font-medium">This amount will be charged during student registration.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Razorpay Key ID</label>
                                            <input
                                                type="text"
                                                value={settings.razorpayKeyId}
                                                onChange={(e) => setSettings({ ...settings, razorpayKeyId: e.target.value })}
                                                placeholder="rzp_test_..."
                                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white font-mono text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Razorpay Key Secret</label>
                                            <input
                                                type="password"
                                                value={settings.razorpayKeySecret}
                                                onChange={(e) => setSettings({ ...settings, razorpayKeySecret: e.target.value })}
                                                placeholder="••••••••••••••••"
                                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white font-mono text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4 space-y-6">
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Razorpay Webhook Secret</label>
                                            <input
                                                type="password"
                                                value={settings.razorpayWebhookSecret}
                                                onChange={(e) => setSettings({ ...settings, razorpayWebhookSecret: e.target.value })}
                                                placeholder="••••••••••••••••"
                                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white font-mono text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-2 font-medium">Used to verify the authenticity of Razorpay webhook notifications.</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Webhook Endpoint URL</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={`${window.location.origin.replace('5173', '5000')}/api/payment/webhook`}
                                                    readOnly
                                                    className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-mono text-xs cursor-default outline-none"
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`${window.location.origin.replace('5173', '5000')}/api/payment/webhook`);
                                                        showToast("URL copied to clipboard", "success");
                                                    }}
                                                    className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-sm">content_copy</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 bg-amber-50 dark:bg-amber-500/5 rounded-xl border border-amber-100 dark:border-amber-500/10 flex gap-3">
                                        <span className="material-symbols-outlined text-amber-600">info</span>
                                        <p className="text-xs text-amber-800 dark:text-amber-200/70 leading-relaxed font-medium">
                                            Ensure your Razorpay keys are correct. If left empty, the system will use the default account specified in the environment variables.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`
                                    px-8 py-3 rounded-xl bg-orange-500 text-white font-black uppercase tracking-widest text-xs
                                    hover:bg-orange-600 shadow-lg shadow-orange-500/25 transition-all
                                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
