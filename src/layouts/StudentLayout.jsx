import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { ThemeToggle } from '../components/ThemeContext';

export default function StudentLayout() {
    const { user, logout } = useAuth();
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { to: "/dashboard", icon: "dashboard", label: "Dashboard" },
        { to: "/results", icon: "analytics", label: "My Results" },
        { to: "/settings", icon: "settings", label: "Settings" },
    ];

    return (
        <div className="flex h-screen w-full bg-slate-50 dark:bg-[#0f172a] overflow-hidden">
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 
                flex flex-col h-full /* <--- IMPORTANT: This allows mt-auto to work */
                transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* 1. Brand Logo Area */}
                <div className="p-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="size-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <span className="material-symbols-outlined text-xl font-bold">school</span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">ExamCore</h2>
                </div>
                
                {/* 2. Navigation Area (Scrollable) */}
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => (
                        <NavLink 
                            key={item.to}
                            to={item.to}
                            onClick={() => setMobileMenuOpen(false)}
                            className={({ isActive }) => 
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                                    isActive 
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`
                            }
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            <span className="text-sm font-semibold">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* 3. PROFILE & LOGOUT SECTION (Pinned to bottom) */}
                <div className="mt-auto p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                    {/* User Card */}
                    <div className="flex items-center gap-3 p-2 mb-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer">
                        <div className="relative shrink-0">
                            <div className="size-10 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 size-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                                {user?.name || 'Student'}
                            </p>
                            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                                Active Session
                            </p>
                        </div>
                    </div>

                    {/* Logout Button */}
                    <button 
                        onClick={logout} 
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-all border-none"
                    >
                        <span className="material-symbols-outlined text-lg">logout</span>
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <div className="flex items-center gap-2 text-xs md:text-sm font-medium">
                            <span className="text-slate-400 hidden sm:inline">Portal</span>
                            <span className="text-slate-300 hidden sm:inline">/</span>
                            <span className="text-slate-900 dark:text-white font-bold">Student Dashboard</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                            <span className="size-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Live</span>
                        </div>
                        <ThemeToggle />
                        <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors relative">
                            <span className="material-symbols-outlined">notifications</span>
                            <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto custom-scrollbar">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}