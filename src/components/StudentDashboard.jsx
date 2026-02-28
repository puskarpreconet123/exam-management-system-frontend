import React, { useEffect, useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import api from '../utils/api';

export default function StudentDashboard() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const [stats, setStats] = useState({ liveSession: [], submitted: [], expired: [], upcoming: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchExams = async () => {
            try {
                // Because role is 'student', this will fetch the structured data from getExamsByUserId
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

    const handleJoinLobby = async (examId) => {
        try {
            const res = await api.post(`/exam/start/${examId}`);
            navigate(`/exam/${res.data.attemptId}`);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to join lobby');
        }
    };

    // Combine live and upcoming for the main list
    const activeExams = [...stats.liveSession, ...stats.upcoming];

    const averageScore = stats.submitted.length > 0
        ? Math.round(stats.submitted.reduce((acc, curr) => acc + curr.score, 0) / stats.submitted.length)
        : 0;

    return (
        <div className="flex h-screen overflow-hidden w-full bg-background-light dark:bg-background-dark">
           
            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative w-64 max-w-full">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                            <input className="w-full bg-slate-100 dark:bg-slate-800 border !border-transparent rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 text-slate-800 dark:text-slate-100 outline-none" placeholder="Search exams..." type="text" />
                        </div>
                    </div>
                </header>

                <div className="p-8 max-w-7xl mx-auto space-y-8">
                    {/* Welcome Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Welcome back, {user?.name?.split(' ')[0]}!</h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">You have {stats.upcoming.length} upcoming exams. Stay focused!</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-12"><div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full"></div></div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
                    ) : (
                        <>
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Completed Exams</span>
                                        <span className="material-symbols-outlined text-primary">verified</span>
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <h3 className="text-3xl font-bold dark:text-white">{stats.submitted.length}</h3>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Average Score</span>
                                        <span className="material-symbols-outlined text-primary">insights</span>
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <h3 className="text-3xl font-bold dark:text-white">{averageScore}</h3>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Missed Exams</span>
                                        <span className="material-symbols-outlined text-primary">event_busy</span>
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <h3 className="text-3xl font-bold dark:text-white">{stats.expired.length}</h3>
                                    </div>
                                </div>
                            </div>

                            {/* Main Content Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Upcoming / Live Exams */}
                                <div className="lg:col-span-2 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active & Upcoming</h2>
                                    </div>
                                    <div className="space-y-4">
                                        {activeExams.length === 0 ? (
                                            <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                                No upcoming exams scheduled.
                                            </div>
                                        ) : activeExams.map((exam) => {
                                            const isLive = !!exam.attemptId || (new Date() >= new Date(exam.startTime));
                                            return (
                                                <div key={exam._id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-300">
                                                    <div className="flex items-center gap-4">
                                                        <div className="size-12 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                            <span className="material-symbols-outlined">terminal</span>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 dark:text-white">{exam.title}</h4>
                                                            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">calendar_today</span> {new Date(exam.startTime).toLocaleDateString()}</span>
                                                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">schedule</span> {exam.duration} Mins</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isLive ? (
                                                        <button
                                                            onClick={() => exam.attemptId ? navigate(`/exam/${exam.attemptId}`) : handleJoinLobby(exam._id)}
                                                            className="px-6 py-2 bg-primary text-white rounded-lg border-none outline-none text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-none hover:bg-primary/90 transition-all shrink-0 cursor-pointer"
                                                        >
                                                            {exam.attemptId ? 'Resume' : 'Join Lobby'}
                                                        </button>
                                                    ) : (
                                                        <button className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-none outline-none rounded-lg text-sm font-bold cursor-not-allowed shrink-0">
                                                            Upcoming
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Recent Activity */}
                                <div className="space-y-4">
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Results</h2>
                                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 transition-colors duration-300">
                                        <ul className="space-y-6 m-0 p-0 list-none text-slate-800 dark:text-slate-100">
                                            {stats.submitted.length === 0 ? (
                                                <div className="text-center text-sm text-slate-500 py-4">No recent activity</div>
                                            ) : stats.submitted.map(sub => (
                                                <li key={sub._id} className="flex items-start gap-4">
                                                    <div className="mt-1 size-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10 shrink-0"></div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <p className="text-sm font-semibold m-0 leading-tight">{sub.title}</p>
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">Score: {sub.score}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Submitted on {new Date(sub.submittedAt).toLocaleDateString()}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}


 {/* Side Navigation
            <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
                <div className="p-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-xl">school</span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-primary">ExamCore</h2>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                    <NavLink 
                        to="/dashboard" 
                        className={({ isActive }) => 
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined">dashboard</span>
                        <span className="text-sm font-medium">Dashboard</span>
                    </NavLink>

                    <NavLink 
                        to="/results" 
                        className={({ isActive }) => 
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined">analytics</span>
                        <span className="text-sm font-medium">My Results</span>
                    </NavLink>

                    <NavLink 
                        to="/settings" 
                        className={({ isActive }) => 
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined">settings</span>
                        <span className="text-sm font-medium">Settings</span>
                    </NavLink>
                </nav>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold truncate text-slate-800 dark:text-slate-100">{user?.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button onClick={logout} className="w-full py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-semibold rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors border-none cursor-pointer">
                        Log Out
                    </button>
                </div>
            </aside> */}
