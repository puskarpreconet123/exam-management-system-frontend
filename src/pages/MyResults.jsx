import React from 'react';

export default function MyResults() {
    return (
        <div className="flex h-screen bg-background-light dark:bg-background-dark">
            <main className="flex-1 overflow-y-auto">
                <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 flex items-center sticky top-0 z-10">
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">My Performance</h1>
                </header>

                <div className="p-8 max-w-7xl mx-auto">
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                        <div className="relative">
                            <div className="size-32 bg-primary/10 rounded-full flex items-center justify-center text-primary animate-pulse">
                                <span className="material-symbols-outlined text-6xl">analytics</span>
                            </div>
                            <div className="absolute -bottom-2 -right-2 size-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg">
                                <span className="material-symbols-outlined text-amber-500">auto_awesome</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Stay Tuned!</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-md">
                                Detailed analytics, grade trends, and downloadable certificates are <strong>building in process</strong>.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-sm">
                                Performance Graphs (Coming Soon)
                            </div>
                            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-sm">
                                Export PDF (Coming Soon)
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}