import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import dayjs from 'dayjs';

export default function StudentDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const location = useLocation();

    const [stats, setStats] = useState({ liveSession: [], submitted: [], expired: [], upcoming: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [result, setResult] = useState({ publishedAttempts: [] });

    useEffect(() => {
        if (location.state?.terminated) {
            showToast("Your previous exam session was terminated by an administrator.", "error", 8000);
            window.history.replaceState({}, document.title);
        }
    }, [location, showToast]);

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
            <div className="animate-spin size-10 border-4 border-orange-500 border-t-transparent rounded-full"></div>
        </div>
    );

    return (
        <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                    Student Dashboard
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{import.meta.env.VITE_APP_TITLE || 'EduDash'} → </span> 
                    Welcome back, {user?.name}. You have {stats.upcoming.length} upcoming exams.
                </p>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-500/20 font-medium text-sm">
                    {error}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Side (approx 70%) */}
                <div className="flex-1 flex flex-col gap-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 content-start">
                        <StatCard
                            title="Completed Exams"
                            value={stats.submitted.length}
                            icon="verified"
                            color="text-emerald-500"
                            bgColor="bg-emerald-50 dark:bg-emerald-500/10"
                        />
                        <StatCard
                            title="Average Score"
                            value={`${averageScore}%`}
                            icon="insights"
                            color="text-amber-600"
                            bgColor="bg-amber-50 dark:bg-amber-500/10"
                        />
                        <StatCard
                            title="Missed Exams"
                            value={stats.expired.length}
                            icon="event_busy"
                            color="text-rose-500"
                            bgColor="bg-rose-50 dark:bg-rose-500/10"
                        />
                    </div>

                    {/* Active & Upcoming Exams Panel */}
                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 p-6 shadow-[0_2px_10px_-3px_rgba(255,140,50,0.1)] dark:shadow-none flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-orange-500 animate-pulse"></span>
                            <h3 className="text-base font-bold text-slate-800 dark:text-white">Active & Upcoming</h3>
                        </div>

                        <div className="space-y-4">
                            {activeExams.length === 0 ? (
                                <div className="border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl p-10 text-center text-slate-400 font-medium">
                                    No upcoming exams scheduled at the moment.
                                </div>
                            ) : activeExams.map((exam) => {
                                const isLive = !!exam.attemptId || (new Date() >= new Date(exam.startTime));
                                const isDemo = Boolean(exam.title && exam.title.toLowerCase().startsWith("demo exam"));
                                const isAuthorized = isDemo || user?.paymentStatus === 'completed';

                                return (
                                    <div key={exam._id} className="group bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700/50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-orange-500/30 transition-all duration-300">
                                        <div className="flex items-center gap-4">
                                            <div className="size-12 shrink-0 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-orange-600 shadow-sm group-hover:scale-110 transition-transform">
                                                <span className="material-symbols-outlined text-2xl">rocket_launch</span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-white text-base">{exam.title}</h4>
                                                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                                                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">calendar_today</span> {new Date(exam.startTime).toLocaleDateString()}</span>
                                                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">schedule</span> {exam.duration} Mins</span>
                                                </div>
                                            </div>
                                        </div>

                                        {isLive ? (
                                            isAuthorized ? (
                                                <button
                                                    onClick={() => exam.attemptId ? navigate(`/exam/${exam.attemptId}`) : handleJoinLobby(exam._id)}
                                                    className="w-full md:w-auto px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold shadow-lg shadow-orange-600/20 active:scale-95 transition-all text-sm"
                                                >
                                                    {exam.attemptId ? 'Resume' : 'Join Lobby'}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => showToast("Payment required for full exams.", "error")}
                                                    className="w-full md:w-auto px-6 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20 rounded-lg font-bold cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                                                >
                                                    Locked <span className="material-symbols-outlined text-sm">lock</span>
                                                </button>
                                            )
                                        ) : (
                                            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg font-bold text-xs uppercase tracking-widest">
                                                Upcoming
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Side Panels */}
                <div className="w-full lg:w-[350px] space-y-6 shrink-0">
                    {/* Calendar Widget */}
                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 p-5 shadow-[0_2px_10px_-3px_rgba(255,140,50,0.1)] dark:shadow-none flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-bold text-slate-800 dark:text-white">Calendar</h3>
                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{dayjs().format('MMMM YYYY')}</span>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                <div key={d} className="font-semibold text-slate-400 py-1">{d}</div>
                            ))}
                            {Array.from({length: dayjs().startOf('month').day()}).map((_, i) => <div key={`e-${i}`}></div>)}
                            {Array.from({length: dayjs().daysInMonth()}).map((_, i) => {
                                const day = i + 1;
                                const isToday = dayjs().date() === day;
                                return (
                                    <div key={i} className={`py-1.5 rounded-full flex items-center justify-center transition-colors ${isToday ? 'bg-orange-500 text-white font-bold shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'}`}>
                                        {day}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recent Results Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 p-5 shadow-[0_2px_10px_-3px_rgba(255,140,50,0.1)] dark:shadow-none">
                        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Recent Results</h3>
                        
                        {result.publishedAttempts.length === 0 ? (
                            <p className="text-center text-slate-400 py-6 text-sm font-medium italic">No recent activity</p>
                        ) : (
                            <div className="space-y-4">
                                {result.publishedAttempts.map(sub => (
                                    <div key={sub._id} className="flex items-center gap-3 group">
                                        <div className="size-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 border border-emerald-100 dark:border-emerald-500/20">
                                            <span className="material-symbols-outlined text-lg">check_circle</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center gap-2">
                                                <p className="text-xs font-bold truncate text-slate-700 dark:text-slate-200 uppercase tracking-tight">{sub.examId.title}</p>
                                                <span className="text-emerald-500 font-black text-xs shrink-0">{(((sub.score * 100) / sub.examId.totalQuestions).toFixed(2)).replace(/\.00$/, '')}%</span>
                                            </div>
                                            <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mt-0.5">
                                                {new Date(sub.submittedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button 
                            onClick={() => navigate('/results')}
                            className="w-full mt-5 py-2 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 rounded-md text-xs font-bold hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400 transition-colors uppercase tracking-widest"
                        >
                            View Performance History
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const StatCard = ({ title, value, icon, color, bgColor }) => (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-100 dark:border-slate-800 shadow-[0_2px_10px_-3px_rgba(255,140,50,0.1)] dark:shadow-none flex flex-col gap-3 group hover:border-orange-500/20 transition-all">
        <div className="flex items-center gap-4">
            <div className={`size-12 rounded-full ${bgColor} flex items-center justify-center ${color} shrink-0 transition-transform group-hover:scale-110`}>
                <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
            </div>
        </div>
        <div className="mt-1">
            <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{value}</h3>
        </div>
    </div>
);