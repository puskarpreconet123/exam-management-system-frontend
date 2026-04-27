import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import dayjs from 'dayjs';
import { renderTextWithFractions } from '../utils/textFormatters';

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
                        // isCorrect comes from the API — already applies admin overrides
                        const isCorrect = q.isCorrect;
                        const isUnanswered = !q.userAnswer;
                        const isTita = !q.options || q.options.length === 0;

                        return (
                            <div
                                key={q._id}
                                className={`bg-white dark:bg-slate-900 rounded-2xl p-4 md:p-6 shadow-sm border transition-colors ${
                                    isCorrect
                                        ? 'border-green-200 dark:border-green-500/20'
                                        : isUnanswered
                                            ? 'border-slate-200 dark:border-slate-800'
                                            : 'border-red-200 dark:border-red-500/20'
                                }`}
                            >
                                {/* Question header */}
                                <div className="flex items-start gap-3 md:gap-4 mb-5">
                                    <div className={`shrink-0 flex items-center justify-center size-8 rounded-full font-bold text-sm ${
                                        isCorrect
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                                            : isUnanswered
                                                ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500'
                                    }`}>
                                        {index + 1}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-slate-800 dark:text-white font-medium text-base md:text-lg pt-1 leading-relaxed">
                                            {renderTextWithFractions(q.text)}
                                        </h4>
                                        {q.imageUrl && (
                                            <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                                <img
                                                    src={q.imageUrl}
                                                    alt="Question illustration"
                                                    className="w-full max-h-72 object-contain p-2"
                                                    loading="lazy"
                                                />
                                            </div>
                                        )}
                                        {/* Admin override badge */}
                                        {q.isOverridden && (
                                            <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
                                                isCorrect
                                                    ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400'
                                                    : 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400'
                                            }`}>
                                                <span className="material-symbols-outlined text-[11px]">
                                                    {isCorrect ? 'verified' : 'gavel'}
                                                </span>
                                                {isCorrect ? 'Marked correct by instructor' : 'Marked wrong by instructor'}
                                            </span>
                                        )}
                                    </div>

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

                                {!isTita ? (
                                    /* MCQ options */
                                    <div className="space-y-3 md:pl-12 pl-11">
                                        {q.options.map((opt, i) => {
                                            const isSelected = q.userAnswer === opt.label;
                                            const isActualCorrect = q.correctAnswer === opt.label;
                                            // Admin accepted a different option than the "official" correct one
                                            const isAdminAccepted = isSelected && !isActualCorrect && q.isOverridden && q.isCorrect;
                                            // Admin rejected the correct option (unusual edge case)
                                            const isAdminRejected = isActualCorrect && q.isOverridden && !q.isCorrect;

                                            let rowCls = 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50';
                                            let textCls = 'text-slate-700 dark:text-slate-300';
                                            let labelCls = 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
                                            let icon = null;

                                            if (isAdminAccepted) {
                                                rowCls = 'border-green-500 bg-green-50 dark:bg-green-900/10';
                                                textCls = 'text-green-800 dark:text-green-400 font-medium';
                                                labelCls = 'bg-green-500 text-white shadow-sm shadow-green-500/20';
                                                icon = (
                                                    <span className="material-symbols-outlined text-green-500 shrink-0" title="Accepted by instructor">check</span>
                                                );
                                            } else if (isActualCorrect && !isAdminRejected) {
                                                rowCls = 'border-green-500 bg-green-50 dark:bg-green-900/10';
                                                textCls = 'text-green-800 dark:text-green-400 font-medium';
                                                labelCls = 'bg-green-500 text-white shadow-sm shadow-green-500/20';
                                                icon = (
                                                    <span className="material-symbols-outlined text-green-500 shrink-0" title="Correct Answer">check</span>
                                                );
                                            } else if (isSelected && !isActualCorrect && !isAdminAccepted) {
                                                rowCls = 'border-red-500 bg-red-50 dark:bg-red-900/10';
                                                textCls = 'text-red-800 dark:text-red-400 font-medium';
                                                labelCls = 'bg-red-500 text-white shadow-sm shadow-red-500/20';
                                                icon = (
                                                    <span className="material-symbols-outlined text-red-500 shrink-0" title="Your Wrong Selection">close</span>
                                                );
                                            }

                                            return (
                                                <div key={i} className={`flex items-start md:items-center p-3 rounded-xl border transition-colors ${rowCls}`}>
                                                    <div className={`mt-0.5 md:mt-0 size-6 shrink-0 rounded flex items-center justify-center text-xs font-bold mr-3 ${labelCls}`}>
                                                        {opt.label}
                                                    </div>
                                                    <span className={`${textCls} leading-tight text-sm md:text-base pt-0.5 md:pt-0 pb-0.5 flex-1 pr-2`}>
                                                        {renderTextWithFractions(opt.value)}
                                                    </span>
                                                    {icon && <div className="shrink-0 ml-auto pl-2 flex items-center">{icon}</div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    /* TITA — type-in answer comparison */
                                    <div className="space-y-3 md:pl-12 pl-11">
                                        <div className="space-y-1.5">
                                            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-0.5">Your Answer</p>
                                            <div className={`px-4 py-3 rounded-xl border-2 font-mono text-sm ${
                                                isCorrect
                                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/10 text-green-800 dark:text-green-300'
                                                    : isUnanswered
                                                        ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-400 italic'
                                                        : 'border-red-500 bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-300'
                                            }`}>
                                                {q.userAnswer || 'No answer provided'}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-0.5">Correct Answer</p>
                                            <div className="px-4 py-3 rounded-xl border-2 border-green-500 bg-green-50 dark:bg-green-900/10 text-green-800 dark:text-green-300 font-mono text-sm font-bold flex items-center gap-2">
                                                <span className="material-symbols-outlined text-green-500 text-[18px] shrink-0">check_circle</span>
                                                {q.correctAnswer}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
