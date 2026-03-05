import React from 'react';
import { useAuth } from '../../components/AuthContext';

export default function AdminSettings() {
    const { user } = useAuth();

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">System Settings</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Configure portal preferences and administrative controls.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-8 text-center border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
                    <div className="size-24 rounded-3xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-3xl font-black mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                        {user?.name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{user?.name || 'Administrator'}</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">{user?.email}</p>
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-200 dark:border-indigo-500/20">
                        <span className="size-2 bg-indigo-500 rounded-full"></span>
                        Full Access Root
                    </div>
                </div>

                <div className="p-12 text-center">
                    <div className="inline-flex items-center justify-center size-20 rounded-4xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 mb-6">
                        <span className="material-symbols-outlined text-4xl">settings_suggest</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">Admin Console In Development</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto font-medium leading-relaxed">
                        We are currently building advanced management tools for user permissions, system audits, and global notification settings.
                    </p>
                    <div className="mt-8 flex justify-center gap-3">
                        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">Version 2.4.0-Stable</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
