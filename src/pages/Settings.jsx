import React from 'react';
import { useAuth } from '../components/AuthContext';

export default function Settings() {
    const { user, logout } = useAuth();

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-8 text-center border-b border-slate-100 dark:border-slate-800">
                    <div className="size-24 rounded-full bg-primary/20 flex items-center justify-center text-primary text-3xl font-bold mx-auto mb-4">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{user?.name}</h2>
                    <p className="text-slate-500 dark:text-slate-400">{user?.email}</p>
                </div>

                <div className="p-12 text-center">
                    <div className="inline-flex items-center justify-center size-16 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 mb-4">
                        <span className="material-symbols-outlined text-3xl">construction</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Content Building in Progress</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        We're working on giving you more control over your profile and notification preferences. Stay tuned!
                    </p>
                </div>
            </div>
        </div>
    );
}