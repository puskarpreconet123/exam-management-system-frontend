import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import dayjs from 'dayjs';

export default function ResultDetails() {
    const { attemptId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const response = await api.get(`/exam/result/${attemptId}`);
                setData(response.data);
            } catch (err) {
                console.error("Failed to fetch detailed results", err);
                setError(err.response?.data?.message || "Failed to load detailed results");
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [attemptId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full size-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 h-screen bg-slate-50 dark:bg-slate-900">
                <span className="material-symbols-outlined text-red-500 text-6xl">error</span>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Access Denied / Error</h2>
                <p className="text-slate-500 max-w-md">{error}</p>
                <button onClick={() => navigate('/results')} className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                    Back to Results
                </button>
            </div>
        );
    }

    if (!data) return null;

    const { exam, attempt, questions } = data;

    return (
        <div className="flex flex-col w-full bg-background-light dark:bg-background-dark">
            <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 md:px-8 flex items-center shrink-0 sticky top-0 z-10">
                <button onClick={() => navigate('/results')} className="mr-4 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white line-clamp-1">{exam.title} - Detailed Results</h1>
                </div>
            </header>

            <div className="p-4 md:p-8 w-full max-w-5xl mx-auto">
                {/* Summary Section */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left">
                        <h2 className="text-xs md:text-sm uppercase tracking-wider text-slate-500 font-semibold mb-1">Score Summary</h2>
                        <div className="flex items-baseline justify-center md:justify-start gap-2">
                            <span className="text-4xl font-black text-slate-800 dark:text-white">{attempt.score}</span>
                            <span className="text-xl font-medium text-slate-400">/ {exam.totalQuestions}</span>
                        </div>
                    </div>

                    <div className="h-12 w-px bg-slate-200 dark:bg-slate-800 hidden md:block"></div>

                    <div className="text-center md:text-left">
                        <h2 className="text-xs md:text-sm uppercase tracking-wider text-slate-500 font-semibold mb-1">Percentage</h2>
                        <span className="text-3xl font-bold text-primary">{attempt.percentage}%</span>
                    </div>

                    <div className="h-12 w-px bg-slate-200 dark:bg-slate-800 hidden md:block"></div>

                    <div className="text-center md:text-left">
                        <h2 className="text-xs md:text-sm uppercase tracking-wider text-slate-500 font-semibold mb-1">Submitted On</h2>
                        <span className="text-lg font-medium text-slate-700 dark:text-slate-300">
                            {dayjs(attempt.submittedAt).format('MMM D, YYYY h:mm A')}
                        </span>
                    </div>
                </div>

                {/* Questions Section */}
                <div className="space-y-6 pb-12">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">analytics</span>
                        Question Breakdown
                    </h3>
                    {questions.map((q, index) => {
                        const isCorrect = q.userAnswer === q.correctAnswer;
                        const isUnanswered = !q.userAnswer;

                        return (
                            <div key={q._id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                                <div className="flex items-start gap-3 md:gap-4 mb-5">
                                    <div className={`shrink-0 flex items-center justify-center size-8 rounded-full font-bold text-sm ${isCorrect ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500' :
                                            isUnanswered ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' :
                                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500'
                                        }`}>
                                        {index + 1}
                                    </div>
                                    <h4 className="flex-1 text-slate-800 dark:text-white font-medium text-base md:text-lg pt-1 leading-relaxed">
                                        {q.text}
                                    </h4>
                                    <div className="shrink-0 pt-1">
                                        {isCorrect ? (
                                            <span className="material-symbols-outlined text-green-500 text-2xl" title="Correct">check_circle</span>
                                        ) : isUnanswered ? (
                                            <span className="material-symbols-outlined text-slate-400 text-2xl" title="Unanswered">radio_button_unchecked</span>
                                        ) : (
                                            <span className="material-symbols-outlined text-red-500 text-2xl" title="Incorrect">cancel</span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3 md:pl-12 pl-11">
                                    {q.options.map((opt, i) => {
                                        const isSelected = q.userAnswer === opt.label;
                                        const isActualCorrect = q.correctAnswer === opt.label;

                                        let borderClass = "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600";
                                        let bgClass = "bg-slate-50/50 dark:bg-slate-800/50";
                                        let textClass = "text-slate-700 dark:text-slate-300";
                                        let icon = null;

                                        if (isActualCorrect) {
                                            borderClass = "border-green-500 dark:border-green-500 bg-green-50 dark:bg-green-900/10";
                                            bgClass = "bg-green-50 dark:bg-green-900/10";
                                            textClass = "text-green-800 dark:text-green-400 font-medium";
                                            icon = <span className="material-symbols-outlined text-green-500 ml-auto" title="Correct Answer">check</span>;
                                        } else if (isSelected && !isActualCorrect) {
                                            borderClass = "border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/10";
                                            bgClass = "bg-red-50 dark:bg-red-900/10";
                                            textClass = "text-red-800 dark:text-red-400 font-medium";
                                            icon = <span className="material-symbols-outlined text-red-500 ml-auto" title="Your Wrong Selection">close</span>;
                                        }

                                        return (
                                            <div key={i} className={`flex items-start md:items-center p-3 rounded-xl border ${borderClass} ${bgClass} transition-colors`}>
                                                <div className={`mt-0.5 md:mt-0 size-6 shrink-0 rounded flex items-center justify-center text-xs font-bold mr-3 ${isActualCorrect ? 'bg-green-500 text-white shadow-sm shadow-green-500/20' : isSelected ? 'bg-red-500 text-white shadow-sm shadow-red-500/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                                    {opt.label}
                                                </div>
                                                <span className={`${textClass} leading-tight text-sm md:text-base pt-0.5 md:pt-0 pb-0.5 pr-2`}>{opt.value}</span>
                                                {icon && <div className="shrink-0 ml-auto pl-2 flex items-center">{icon}</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
