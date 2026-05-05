import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

export default function AdminDashboard() {
    const { showToast } = useToast();
    const [stats, setStats] = useState({
        totalExams: 0,
        upcomingExams: 0,
        avgPassRate: 0,
        totalQuestions: 0,
        pendingEvaluations: 0,
        activeStudents: 0
    });
    const [dashboardData, setDashboardData] = useState(null);
    const [upcomingExamsList, setUpcomingExamsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/admin/dashboard/stats');
                const data = res.data;
                
                setDashboardData(data);
                setStats({
                    totalExams: data.totalExams,
                    upcomingExams: data.upcomingExams,
                    avgPassRate: data.avgPassRate,
                    totalQuestions: data.totalQuestions,
                    pendingEvaluations: data.pendingEvaluations,
                    activeStudents: data.totalStudents
                });
                setUpcomingExamsList(data.upcomingExamsList || []);

            } catch (err) {
                console.error(err);
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
            <div className="animate-spin size-10 border-4 border-orange-500 border-t-transparent rounded-full"></div>
        </div>
    );

    const completionData = dashboardData?.distribution || { completed: 0, pending: 0, failed: 0, excused: 0 };
    const totalAttempts = Object.values(completionData).reduce((a, b) => a + b, 0) || 1;
    const getPercent = (val) => Math.round((val / totalAttempts) * 100);

    const last12Months = Array.from({ length: 12 }, (_, i) => {
        const d = dayjs().subtract(11 - i, 'month');
        return {
            label: d.format('MMM'),
            month: d.month() + 1,
            year: d.year()
        };
    });

    const getUsageHeight = (m, y) => {
        if (!dashboardData?.usageStats) return 0;
        const found = dashboardData.usageStats.find(s => s._id.month === m && s._id.year === y);
        if (!found) return 5; // minimum height for visibility
        const max = Math.max(...dashboardData.usageStats.map(s => s.count), 1);
        return Math.max((found.count / max) * 100, 5);
    };

    return (
        <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                    Dashboard
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{import.meta.env.VITE_APP_TITLE || 'EduDash'} → </span> 
                    Manage your exams, track student performance, and view system analytics.
                </p>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-md border border-red-100 dark:border-red-500/20 font-medium text-sm">
                    {error}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Side (approx 70%) */}
                <div className="flex-1 flex flex-col gap-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 content-start">
                        <StatCard
                            title="Total Exams"
                            value={stats.totalExams.toLocaleString()}
                            icon="assignment"
                            color="text-orange-500"
                            bgColor="bg-orange-50 dark:bg-orange-500/10"
                            trend="Real-time"
                            trendColor="text-orange-500"
                        />
                        <StatCard
                            title="Upcoming Exams"
                            value={stats.upcomingExams.toLocaleString()}
                            icon="event"
                            color="text-amber-600"
                            bgColor="bg-amber-50 dark:bg-amber-500/10"
                            trend="Next 30 days"
                            trendColor="text-orange-500"
                        />
                        <StatCard
                            title="Active Students"
                            value={stats.activeStudents.toLocaleString()}
                            icon="group"
                            color="text-orange-500"
                            bgColor="bg-orange-50 dark:bg-orange-500/10"
                            trend="Total Enrolled"
                            trendColor="text-orange-500"
                        />
                        <StatCard
                            title="Total Questions"
                            value={stats.totalQuestions.toLocaleString()}
                            icon="quiz"
                            color="text-orange-600"
                            bgColor="bg-orange-50 dark:bg-orange-500/10"
                            trend="Question Bank"
                            trendColor="text-orange-500"
                        />
                        <StatCard
                            title="Pending Evals"
                            value={stats.pendingEvaluations.toLocaleString()}
                            icon="fact_check"
                            color="text-green-500"
                            bgColor="bg-green-50 dark:bg-green-500/10"
                            trend="Needs Attention"
                            trendColor="text-orange-500"
                            onClick={() => navigate('/admin/evaluation')}
                        />
                        <StatCard
                            title="Avg. Pass Rate"
                            value={`${stats.avgPassRate}%`}
                            icon="trending_up"
                            color="text-amber-500"
                            bgColor="bg-amber-50 dark:bg-amber-500/10"
                            trend="Overall performance"
                            trendColor="text-orange-500"
                        />
                    </div>

                    {/* Usage Statistics panel */}
                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 p-5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] dark:shadow-none h-64 flex flex-col">
                        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Exam Attempts (Last 12 Months)</h3>
                        <div className="flex-1 flex items-end gap-2 text-xs text-slate-400 justify-around">
                            {last12Months.map((m, i) => {
                                const h = getUsageHeight(m.month, m.year);
                                return (
                                    <div key={i} className="w-full max-w-[30px] flex flex-col items-center gap-2 h-full group">
                                        <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-t-sm relative h-full flex items-end">
                                            <div 
                                                className="w-full bg-orange-400 dark:bg-orange-500 rounded-t-sm transition-all group-hover:bg-orange-600" 
                                                style={{height: `${h}%`}}
                                            ></div>
                                            {/* Tooltip */}
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                {dashboardData?.usageStats?.find(s => s._id.month === m.month && s._id.year === m.year)?.count || 0} attempts
                                            </div>
                                        </div>
                                        <span>{m.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Side Panels */}
                <div className="w-full lg:w-[350px] space-y-6 shrink-0">
                    {/* Exam Completion Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 p-5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] dark:shadow-none">
                        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Exam Completion</h3>
                        
                        <div className="flex gap-1 h-10 w-full mb-6 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                            <div className="bg-orange-500 transition-all duration-500" style={{width: `${getPercent(completionData.completed)}%`}} title={`Completed: ${completionData.completed}`}></div>
                            <div className="bg-orange-400 transition-all duration-500" style={{width: `${getPercent(completionData.pending)}%`}} title={`Pending: ${completionData.pending}`}></div>
                            <div className="bg-purple-500 transition-all duration-500" style={{width: `${getPercent(completionData.failed)}%`}} title={`Failed: ${completionData.failed}`}></div>
                            <div className="bg-green-500 transition-all duration-500" style={{width: `${getPercent(completionData.excused)}%`}} title={`Excused: ${completionData.excused}`}></div>
                        </div>

                        <div className="space-y-3">
                            <LegendItem color="bg-orange-500" label="Completed" value={`${getPercent(completionData.completed)}%`} />
                            <LegendItem color="bg-orange-400" label="Pending" value={`${getPercent(completionData.pending)}%`} />
                            <LegendItem color="bg-purple-500" label="Failed" value={`${getPercent(completionData.failed)}%`} />
                            <LegendItem color="bg-green-500" label="Excused" value={`${getPercent(completionData.excused)}%`} />
                        </div>
                    </div>

                    {/* Calendar */}
                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 p-5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] dark:shadow-none flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-bold text-slate-800 dark:text-white">Calendar</h3>
                            <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-md uppercase tracking-wider">
                                {dayjs().format('MMMM YYYY')}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-4">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                <div key={d} className="font-semibold text-slate-400 py-1">{d}</div>
                            ))}
                            {Array.from({length: dayjs().startOf('month').day()}).map((_, i) => <div key={`e-${i}`}></div>)}
                            {Array.from({length: dayjs().daysInMonth()}).map((_, i) => {
                                const day = i + 1;
                                const isToday = dayjs().date() === day;
                                return (
                                    <div key={i} className={`py-1.5 rounded-full flex items-center justify-center ${isToday ? 'bg-orange-500 text-white font-bold shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'}`}>
                                        {day}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const StatCard = ({ title, value, icon, color, bgColor, trend, trendColor, onClick }) => (
    <div 
        onClick={onClick}
        className={`bg-white dark:bg-slate-900 p-5 rounded-lg shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] dark:shadow-none dark:border dark:border-slate-800 flex flex-col gap-3 ${onClick ? 'cursor-pointer hover:border-orange-500 dark:hover:border-orange-500 transition-all' : ''}`}
    >
        <div className="flex items-center gap-4">
            <div className={`size-12 rounded-full ${bgColor} flex items-center justify-center ${color} shrink-0`}>
                <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
            </div>
        </div>
        <div className="mt-1">
            <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{value}</h3>
            <div className="flex items-center gap-1 mt-2">
                <span className={`text-[10px] font-semibold ${trendColor}`}>{trend}</span>
            </div>
        </div>
    </div>
);

const LegendItem = ({ color, label, value }) => (
    <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
            <span className={`size-3 rounded-sm ${color}`}></span>
            <span className="text-slate-600 dark:text-slate-400 font-medium">{label}</span>
        </div>
        <span className="font-semibold text-slate-800 dark:text-white">{value}</span>
    </div>
);
