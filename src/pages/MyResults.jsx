import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import dayjs from "dayjs";

export default function MyResults() {
    const navigate = useNavigate();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const response = await api.get('/exam/results');
                setResults(response.data.publishedAttempts || []);
            } catch (err) {
                console.error("Failed to fetch results", err);
                setError(err.response?.data?.message || "Failed to load results");
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, []);

    const getGradeInfo = (percentage) => {
        if (percentage >= 90) return { label: 'Excellent', color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-500/10', icon: 'military_tech' };
        if (percentage >= 75) return { label: 'Good', color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-500/10', icon: 'stars' };
        if (percentage >= 50) return { label: 'Average', color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-500/10', icon: 'check_circle' };
        return { label: 'Needs Practice', color: 'text-rose-500', bgColor: 'bg-rose-50 dark:bg-rose-500/10', icon: 'warning' };
    };

    const filteredResults = results.filter(attempt => {
        const percentage = attempt.examId?.totalQuestions > 0 ? (attempt.score * 100 / attempt.examId.totalQuestions) : 0;
        const matchesSearch = attempt.examId?.title.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (activeFilter === 'high') return matchesSearch && percentage >= 75;
        if (activeFilter === 'average') return matchesSearch && percentage >= 50 && percentage < 75;
        if (activeFilter === 'low') return matchesSearch && percentage < 50;
        
        return matchesSearch;
    });

    const totalExams = results.length;
    const avgScore = results.length > 0 
        ? Math.round(results.reduce((acc, curr) => acc + (curr.score * 100 / (curr.examId?.totalQuestions || 1)), 0) / results.length) 
        : 0;
    const topScore = results.length > 0
        ? Math.max(...results.map(r => Math.round(r.score * 100 / (r.examId?.totalQuestions || 1))))
        : 0;

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
                    Performance History
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{import.meta.env.VITE_APP_TITLE || 'EduDash'} → </span> 
                    Review your examination history, track scores, and identify areas for improvement.
                </p>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-500/20 font-medium text-sm">
                    {error}
                </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <StatCard title="Exams Attempted" value={totalExams} icon="history" color="text-orange-500" bgColor="bg-orange-50 dark:bg-orange-500/10" />
                <StatCard title="Average Performance" value={`${avgScore}%`} icon="trending_up" color="text-orange-500" bgColor="bg-orange-50 dark:bg-orange-500/10" />
                <StatCard title="Best Score" value={`${topScore}%`} icon="workspace_premium" color="text-amber-500" bgColor="bg-amber-50 dark:bg-amber-500/10" />
            </div>

            {/* Controls Section */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 p-4 shadow-[0_2px_10px_-3px_rgba(255,140,50,0.1)] dark:shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center p-1 bg-slate-50 dark:bg-slate-800 rounded-lg w-fit">
                    {['all', 'high', 'average', 'low'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${activeFilter === filter
                                    ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            {filter === 'high' ? 'Top Tier' : filter === 'low' ? 'Needs Improvement' : filter}
                        </button>
                    ))}
                </div>

                <div className="relative md:w-80">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                    <input
                        type="text"
                        placeholder="Search by exam title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 focus:border-orange-500 outline-none transition-all"
                    />
                </div>
            </div>

            {/* Results Grid/List */}
            {filteredResults.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl p-16 text-center">
                    <div className="size-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-3xl text-slate-300">inbox</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">No results found</h3>
                    <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or search terms.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredResults.map((attempt) => {
                        const exam = attempt.examId;
                        const maxScore = exam?.totalQuestions || 0;
                        const score = attempt.score || 0;
                        const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
                        const grade = getGradeInfo(percentage);

                        return (
                            <div key={attempt._id} className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-5 shadow-[0_2px_10px_-3px_rgba(255,140,50,0.1)] dark:shadow-none hover:border-orange-500/30 transition-all flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1 pr-4">
                                        <h3 className="text-base font-bold text-slate-800 dark:text-white line-clamp-2 leading-snug group-hover:text-orange-600 transition-colors">
                                            {exam?.title || 'Unknown Exam'}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                <span className="material-symbols-outlined text-xs">calendar_today</span>
                                                {dayjs(attempt.submittedAt).format('MMM D, YYYY')}
                                            </span>
                                            <span className="size-1 bg-slate-200 dark:bg-slate-700 rounded-full"></span>
                                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{exam?.board}</span>
                                        </div>
                                    </div>
                                    <div className={`size-10 rounded-lg flex items-center justify-center shadow-sm ${grade.bgColor} ${grade.color}`}>
                                        <span className="material-symbols-outlined text-xl">{grade.icon}</span>
                                    </div>
                                </div>

                                <div className="space-y-3 mt-auto pt-4 border-t border-slate-50 dark:border-slate-800">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Raw Score</p>
                                            <p className="text-xl font-black text-slate-800 dark:text-white">
                                                {score} <span className="text-xs text-slate-400 font-medium tracking-normal">/ {maxScore}</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Percentage</p>
                                            <p className={`text-xl font-black ${grade.color}`}>{percentage}%</p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${percentage >= 75 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>

                                    <div className="flex justify-between items-center pt-2">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${grade.bgColor} ${grade.color}`}>
                                            {grade.label}
                                        </span>
                                        <button
                                            onClick={() => navigate(`/results/${attempt._id}`)}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest
                                                        text-orange-700 dark:text-orange-300
                                                        bg-orange-50 dark:bg-orange-900/40
                                                        hover:bg-orange-100 dark:hover:bg-orange-800/60
                                                        px-3 py-1 rounded-full transition-colors"
                                        >
                                            Analysis
                                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const StatCard = ({ title, value, icon, color, bgColor }) => (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-100 dark:border-slate-800 shadow-[0_2px_10px_-3px_rgba(255,140,50,0.1)] dark:shadow-none flex flex-col gap-3 group hover:border-orange-500/20 transition-all">
        <div className="flex items-center gap-4">
            <div className={`size-12 rounded-full ${bgColor} flex items-center justify-center ${color} shrink-0 transition-transform group-hover:scale-110 shadow-sm`}>
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