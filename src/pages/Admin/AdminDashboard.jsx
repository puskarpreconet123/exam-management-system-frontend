import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
    const { showToast } = useToast();
    const [stats, setStats] = useState({
        totalExams: 0,
        upcomingExams: 0,
        activeStudents: 24, // Mocked for now
        avgPassRate: 82     // Mocked for now
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate()
    
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/admin/exams');
                const exams = res.data.data || [];

                const now = new Date();
                const upcoming = exams.filter(e => new Date(e.startTime) > now).length;

                setStats(prev => ({
                    ...prev,
                    totalExams: exams.length,
                    upcomingExams: upcoming
                }));
            } catch (err) {
                setError('Failed to fetch dashboard statistics');
                showToast('Error loading stats', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [showToast]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin size-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
        </div>
    );


    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Administrative Overview
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Monitor system performance and exam metrics in real-time.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">download</span>
                        Export Report
                    </button>
                    <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2"
                    onClick={()=>navigate("/admin/exams")}>
                        <span className="material-symbols-outlined text-lg">add</span>
                        Create Exam
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-500/20 font-bold">
                    {error}
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Exams"
                    value={stats.totalExams}
                    icon="assignment"
                    color="text-indigo-600"
                    bgColor="bg-indigo-50 dark:bg-indigo-500/10"
                    trend="+4"
                />
                <StatCard
                    title="Upcoming"
                    value={stats.upcomingExams}
                    icon="event"
                    color="text-amber-600"
                    bgColor="bg-amber-50 dark:bg-amber-500/10"
                    trend="Next 7 days"
                />
                <StatCard
                    title="Active Students"
                    value={stats.activeStudents}
                    icon="group"
                    color="text-emerald-600"
                    bgColor="bg-emerald-50 dark:bg-emerald-500/10"
                    trend="Live now"
                />
                <StatCard
                    title="Avg. Pass Rate"
                    value={`${stats.avgPassRate}%`}
                    icon="trending_up"
                    color="text-blue-600"
                    bgColor="bg-blue-50 dark:bg-blue-500/10"
                    trend="+2.1%"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Logs/Activity */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent System Activity</h2>
                        <button className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">View Audit Log</button>
                    </div>
                    <div className="space-y-4">
                        <ActivityItem
                            type="security"
                            title="Suspicious Activity Detected"
                            desc="Student ID #88291 switched tabs 4 times during Math Final."
                            time="2 mins ago"
                        />
                        <ActivityItem
                            type="success"
                            title="Exam Published"
                            desc="Advance Physics II is now live for all enrolled students."
                            time="15 mins ago"
                        />
                        <ActivityItem
                            type="info"
                            title="Backend Sync Profile"
                            desc="Database optimization task completed successfully."
                            time="1 hour ago"
                        />
                    </div>
                </div>

                {/* Quick Actions / Tips */}
                <div className="bg-linear-to-br from-indigo-700 to-violet-900 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20">
                    <h3 className="text-xl font-bold mb-4">Proctoring Tip</h3>
                    <p className="text-indigo-100 text-sm leading-relaxed mb-6">
                        Enable "Strict Mode" for high-stakes exams to automatically lock down the browser and record all tab-switching violations.
                    </p>
                    <button className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold border border-white/20 transition-all text-sm">
                        View Security Settings
                    </button>
                </div>
            </div>
        </div>
    );
}

const StatCard = ({ title, value, icon, color, bgColor, trend }) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/30 transition-all group">
        <div className="flex items-center justify-between mb-4">
            <div className={`size-12 rounded-2xl ${bgColor} flex items-center justify-center ${color} shrink-0 group-hover:scale-110 transition-transform`}>
                <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{trend}</span>
        </div>
        <div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{value}</h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{title}</p>
        </div>
    </div>
);

const ActivityItem = ({ type, title, desc, time }) => {
    const icons = {
        security: { icon: 'security', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
        success: { icon: 'check_circle', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
        info: { icon: 'info', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' }
    };
    const style = icons[type] || icons.info;

    return (
        <div className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
            <div className={`size-10 rounded-xl ${style.bg} flex items-center justify-center ${style.color} shrink-0`}>
                <span className="material-symbols-outlined text-xl">{style.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{title}</p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight shrink-0">{time}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{desc}</p>
            </div>
        </div>
    );
};
