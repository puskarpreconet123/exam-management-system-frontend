import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';

export default function StudentDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const location = useLocation();

    const [stats, setStats] = useState({ liveSession: [], submitted: [], expired: [], upcoming: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [result, setResult] = useState({ publishedAttempts: [] })

    useEffect(() => {
        if (location.state?.terminated) {
            showToast("Your previous exam session was terminated by an administrator.", "error", 8000);
            // Clear the state so it doesn't show again on manual refresh
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const res = await api.get(`/exam/${user.id}`);
                setStats(res.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load exams');
            } finally {
                setLoading(false);
            }
        };
        fetchExams();
    }, [user.id]);

    useEffect(() => {
    const fetchResult = async () => {
        try {
            const res = await api.get(`/exam/results`);
            setResult(res.data);
            console.log(res.data)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load Results');
        }
    };

    fetchResult();
}, [user.id]);

    const handleJoinLobby = async (examId) => {
        try {
            const res = await api.post(`/exam/start/${examId}`);
            navigate(`/exam/${res.data.attemptId}`);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to join lobby');
        }
    };

    const activeExams = [...stats.liveSession, ...stats.upcoming];

let averageScore = 0;

if (result?.publishedAttempts?.length > 0) {
  const attempts = result.publishedAttempts;

  const totalPercentage = attempts.reduce((acc, curr) => {
    const percent = (curr.score * 100) / curr.examId.totalQuestions;
    return acc + percent;
  }, 0);

  averageScore = Math.round(totalPercentage / attempts.length);
}
    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin size-10 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
    );

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Hero Section */}
            <div className="relative overflow-hidden bg-linear-to-br from-primary to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-primary/20">
                <div className="relative z-10">
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                        Welcome back, {user?.name?.split(' ')[0]}!
                    </h1>
                    <p className="text-primary-foreground/80 mt-2 text-lg font-medium">
                        You have {stats.upcoming.length} upcoming exams. Stay focused and good luck!
                    </p>
                </div>
                {/* Decorative background circle */}
                <div className="absolute -top-24 -right-24 size-64 bg-white/10 rounded-full blur-3xl"></div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-500/20 font-bold">
                    {error}
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Completed"
                    value={stats.submitted.length}
                    icon="verified"
                    color="text-emerald-500"
                    bgColor="bg-emerald-50 dark:bg-emerald-500/10"
                />
                <StatCard
                    title="Avg Score"
                    value={`${averageScore}%`}
                    icon="insights"
                    color="text-blue-500"
                    bgColor="bg-blue-50 dark:bg-blue-500/10"
                />
                <StatCard
                    title="Missed"
                    value={stats.expired.length}
                    icon="event_busy"
                    color="text-rose-500"
                    bgColor="bg-rose-50 dark:bg-rose-500/10"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Exam List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <span className="size-2 rounded-full bg-primary animate-pulse"></span>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active & Upcoming</h2>
                    </div>

                    <div className="space-y-4">
                        {activeExams.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-500 font-medium">
                                No upcoming exams scheduled at the moment.
                            </div>
                        ) : activeExams.map((exam) => {
                            const isLive = !!exam.attemptId || (new Date() >= new Date(exam.startTime));
                            return (
                                <div key={exam._id} className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md">
                                    <div className="flex items-center gap-4">
                                        <div className="size-14 shrink-0 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-3xl">terminal</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white text-lg">{exam.title}</h4>
                                            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">
                                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">calendar_today</span> {new Date(exam.startTime).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">schedule</span> {exam.duration} Mins</span>
                                            </div>
                                        </div>
                                    </div>

                                    {isLive ? (
                                        <button
                                            onClick={() => exam.attemptId ? navigate(`/exam/${exam.attemptId}`) : handleJoinLobby(exam._id)}
                                            className="w-full md:w-auto px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all"
                                        >
                                            {exam.attemptId ? 'Resume' : 'Join Lobby'}
                                        </button>
                                    ) : (
                                        <button className="w-full md:w-auto px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl font-bold cursor-not-allowed">
                                            Upcoming
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sidebar Results */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white px-2">Recent Results</h2>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                        {result.publishedAttempts.length === 0 ? (
                            <p className="text-center text-slate-500 py-6 font-medium">No recent activity</p>
                        ) : (
                            <ul className="space-y-6 list-none p-0 m-0">
                                {result.publishedAttempts.map(sub => (
                                    <li key={sub._id} className="flex items-center gap-4 group">
                                        <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                                            <span className="material-symbols-outlined text-xl font-bold">check</span>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex justify-between items-center gap-2">
                                                <p className="text-sm font-bold truncate text-slate-800 dark:text-white">{sub.examId.title}</p>
                                                <span className="text-emerald-500 font-black text-sm shrink-0">{(sub.score * 100)/ sub.examId.totalQuestions}%</span>
                                            </div>
                                            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-0.5">
                                                {new Date(sub.submittedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Sub-component for consistent stat cards
const StatCard = ({ title, value, icon, color, bgColor }) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
        <div className={`size-14 rounded-2xl ${bgColor} flex items-center justify-center ${color} shrink-0`}>
            <span className="material-symbols-outlined text-3xl">{icon}</span>
        </div>
        <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-0.5">{value}</h3>
        </div>
    </div>
);