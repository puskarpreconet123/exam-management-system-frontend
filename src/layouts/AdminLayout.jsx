import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { ThemeToggle } from '../components/ThemeContext';
import NotificationDropdown from '../components/NotificationDropdown';

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const appTitle = import.meta.env.VITE_APP_TITLE || 'EduDash';

    const navItems = [
        { to: "/admin/dashboard", icon: "dashboard", label: "Overview", permission: "dashboard" },
        { to: "/admin/exams", icon: "description", label: "Exams", permission: "exams" },
        { to: "/admin/questions", icon: "quiz", label: "Question Bank", permission: "questions" },
        { to: "/admin/monitoring", icon: "monitoring", label: "Live Monitoring", permission: "monitoring" },
        { to: "/admin/evaluation", icon: "fact_check", label: "Evaluation", permission: "evaluation" },
        { to: "/admin/referrals", icon: "group_add", label: "Referrals", permission: "referrals" },
        { to: "/admin/students", icon: "manage_accounts", label: "Students", permission: "students" },
        { to: "/admin/employees", icon: "badge", label: "Employees", adminOnly: true },
    ];

    const filteredNavItems = navItems.filter(item => {
        if (user?.role === 'admin') return true;
        if (item.adminOnly) return false;
        if (user?.role === 'employee') {
            return user.permissions?.includes(item.permission) || item.permission === 'dashboard';
        }
        return false;
    });

    return (
        <div className="flex h-screen w-full bg-[#fffcf0] dark:bg-[#0c0a09] overflow-hidden font-sans">
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-800 
                flex flex-col h-full
                transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-5 flex items-center gap-3 shrink-0">
                    <div className="size-8 bg-orange-500 rounded-lg flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                        <span className="material-symbols-outlined text-xl font-bold">local_library</span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">{appTitle}</h2>
                </div>

                {/* User Profile Section at top of sidebar */}
                <div className="px-5 pb-4 mb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                        <div className="relative shrink-0">
                            <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold overflow-hidden">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
                                ) : (
                                    user?.name?.charAt(0).toUpperCase() || 'A'
                                )}
                            </div>
                            <span className="absolute bottom-0 right-0 size-2.5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                                {user?.name || 'Admin User'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {user?.role === 'admin' ? 'Administrator' : 'Employee'}
                            </p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto custom-scrollbar">
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setMobileMenuOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 ${isActive
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 font-semibold'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 font-medium'
                                }`
                            }
                        >
                            <span className="material-symbols-outlined text-xl">{item.icon}</span>
                            <span className="text-sm">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all font-medium text-sm border-none"
                    >
                        <span className="material-symbols-outlined text-xl">logout</span>
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 bg-white dark:bg-slate-900 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4 flex-1">
                        <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <ThemeToggle />
                        </div>
                        <NotificationDropdown />
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto custom-scrollbar">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
