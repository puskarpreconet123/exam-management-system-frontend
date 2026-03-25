import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import dayjs from "dayjs";

export default function MyResults() {
    const navigate = useNavigate();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
        if (percentage >= 90) return { label: 'Excellent', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500', icon: 'military_tech' };
        if (percentage >= 75) return { label: 'Good', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-500', icon: 'thumb_up' };
        if (percentage >= 50) return { label: 'Average', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500', icon: 'check_circle' };
        return { label: 'Needs Practice', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500', icon: 'warning' };
    };

    return (
        <div className="flex flex-col w-full bg-background-light dark:bg-background-dark">
            <div className="w-full">
                <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 flex items-center sticky top-0 z-10">
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">My Performance</h1>
                </header>

                <div className="p-8 max-w-7xl mx-auto">
                    {loading ? (
                        <div className="flex items-center justify-center min-h-[50vh]">
                            <div className="animate-spin rounded-full size-12 border-b-2 border-primary"></div>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-xl p-6 text-center">
                            <span className="material-symbols-outlined text-4xl text-red-500 mb-2">error</span>
                            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Error Loading Results</h3>
                            <p className="text-red-500 dark:text-red-300 mt-1">{error}</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
                            <div className="size-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-5xl text-slate-400">history</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">No Results Yet</h2>
                            <p className="text-slate-500 max-w-md">
                                You haven't completed any exams yet, or your results have not been published by the administrator.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {results.map((attempt) => {
                                const exam = attempt.examId;
                                const maxScore = exam?.totalQuestions || 0;
                                const score = attempt.score || 0;
                                const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
                                const grade = getGradeInfo(percentage);

                                return (
                                    <div key={attempt._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1 pr-4">
                                                <h3 className="text-lg font-bold text-slate-800 dark:text-white line-clamp-2">
                                                    {exam?.title || 'Unknown Exam'}
                                                </h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                                                    {dayjs(attempt.submittedAt).format('MMM D, YYYY')}
                                                </p>
                                            </div>
                                            <div className={`p-2 rounded-xl flex items-center justify-center ${grade.color}`}>
                                                <span className="material-symbols-outlined">{grade.icon}</span>
                                            </div>
                                        </div>

                                        <div className="py-4 border-y border-slate-100 dark:border-slate-800 my-4 flex justify-between items-center">
                                            <div className="text-center">
                                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Score</p>
                                                <p className="text-2xl font-black text-slate-800 dark:text-white">
                                                    {score} <span className="text-sm text-slate-400 font-medium">/ {maxScore}</span>
                                                </p>
                                            </div>
                                            <div className="h-12 w-px bg-slate-200 dark:bg-slate-800"></div>
                                            <div className="text-center">
                                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Percentage</p>
                                                <p className="text-2xl font-black text-primary">
                                                    {percentage}%
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center mt-2">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${grade.color}`}>
                                                {grade.label}
                                            </span>
                                            <button
                                                onClick={() => navigate(`/results/${attempt._id}`)}
                                                className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                                            >
                                                View Details
                                                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}