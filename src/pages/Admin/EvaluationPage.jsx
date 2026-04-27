import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';

export default function EvaluationPage() {
    const { showToast } = useToast();
    const [exams, setExams] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [attempts, setAttempts] = useState([]);
    const [reviewAttempt, setReviewAttempt] = useState(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    const [localOverrides, setLocalOverrides] = useState({});
    const [overrideSaving, setOverrideSaving] = useState(false);

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const { data } = await api.get('/admin/exams');
                const examsData = data.data || [];
                setExams(examsData);
                if (examsData.length > 0) setSelectedExamId(examsData[0]._id);
            } catch {
                showToast('Failed to fetch exams', 'error');
            }
        };
        fetchExams();
    }, []);

    useEffect(() => {
        if (!selectedExamId) return;
        const fetchAttempts = async () => {
            setLoading(true);
            setReviewAttempt(null);
            try {
                const { data } = await api.get(`/admin/exams/${selectedExamId}/attempts`);
                setAttempts(data.data || []);
            } catch {
                showToast('Failed to fetch attempts', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchAttempts();
    }, [selectedExamId]);

    const handleEvaluate = async (attemptId) => {
        setActionLoading(attemptId);
        try {
            const { data } = await api.patch(`/admin/exams/evaluate/${attemptId}`);
            showToast(`Score: ${data.score}`, 'success');
            setAttempts(prev => prev.map(att => att._id === attemptId ? { ...att, score: data.score } : att));
        } catch {
            showToast('Evaluation failed', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReview = async (attemptId) => {
        if (reviewAttempt?.attempt?._id === attemptId) {
            setReviewAttempt(null);
            return;
        }
        setLoading(true);
        setLocalOverrides({});
        try {
            const { data } = await api.get(`/admin/exams/attempt-response/${attemptId}`);
            setReviewAttempt(data.data);
        } catch {
            showToast('Failed to load response', 'error');
        } finally {
            setLoading(false);
        }
    };



    const handleSaveOverrides = async () => {
        if (Object.keys(localOverrides).length === 0) return;
        setOverrideSaving(true);
        try {
            const overridesArray = Object.entries(localOverrides).map(([questionId, isCorrect]) => ({
                questionId,
                isCorrect,
            }));
            const { data } = await api.patch(
                `/admin/exams/override-answers/${reviewAttempt.attempt._id}`,
                { overrides: overridesArray }
            );
            showToast('Overrides saved', 'success');
            // Reflect new score everywhere
            setReviewAttempt(prev => ({
                ...prev,
                attempt: { ...prev.attempt, score: data.score },
                answers: prev.answers.map(ans => {
                    const qId = ans.questionId?.toString?.() ?? ans.questionId;
                    if (qId in localOverrides) {
                        const val = localOverrides[qId];
                        const autoCorrect = ans.selectedLabel === ans.correctLabel;
                        return {
                            ...ans,
                            isCorrect: val === null ? autoCorrect : val,
                            isOverridden: val !== null,
                        };
                    }
                    return ans;
                }),
            }));
            setAttempts(prev => prev.map(att =>
                att._id === reviewAttempt.attempt._id ? { ...att, score: data.score } : att
            ));
            setLocalOverrides({});
        } catch {
            showToast('Failed to save overrides', 'error');
        } finally {
            setOverrideSaving(false);
        }
    };

    const handlePublish = async (attemptId) => {
        setActionLoading(attemptId);
        try {
            await api.patch(`/admin/exams/publish-result/${attemptId}`);
            showToast('Result published', 'success');
            setAttempts(prev => prev.map(att => att._id === attemptId ? { ...att, isPublished: true } : att));
        } catch {
            showToast('Publish failed', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const statusConfig = {
        submitted: { label: 'Submitted', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' },
        active: { label: 'Active', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
        default: { label: 'Expired', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' },
    };

    const getStatus = (s) => statusConfig[s] || statusConfig.default;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <style>{`
                .scrollbar-thin::-webkit-scrollbar { width: 4px; }
                .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
                .scrollbar-thin::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 9999px; }
                .dark .scrollbar-thin::-webkit-scrollbar-thumb { background: #334155; }
                @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                .slide-in-right { animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .fade-in-delay-1 { animation: fadeIn 0.4s 0.05s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .fade-in-delay-2 { animation: fadeIn 0.4s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both; }
            `}</style>

            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 fade-in">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Evaluation & Results
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            Review student submissions and publish scores
                        </p>
                    </div>

                    {/* Exam Selector */}
                    <div className="relative group">
                        <select
                            value={selectedExamId}
                            onChange={(e) => setSelectedExamId(e.target.value)}
                            className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-10 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 shadow-sm hover:border-violet-400 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 focus:outline-none transition-all cursor-pointer min-w-60 block outline-none"
                        >
                            <option value="" disabled>Select an exam</option>
                            {exams.map(exam => (
                                <option key={exam._id} value={exam._id}>{exam.title}</option>
                            ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none group-hover:text-violet-500 transition-colors">
                            unfold_more
                        </span>
                    </div>
                </div>

                {/* Main Layout */}
                <div className={`grid gap-6 transition-all duration-500 ${reviewAttempt ? 'grid-cols-1 xl:grid-cols-[1fr_420px]' : 'grid-cols-1'}`}>

                    {/* Submissions Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden fade-in-delay-1">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-400 text-[20px]">group</span>
                                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Student Submissions</h2>
                            </div>
                            {attempts.length > 0 && (
                                <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                                    {attempts.length}
                                </span>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Student</th>
                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Score</th>
                                        <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center w-36">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/80">
                                    {loading && attempts.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-16 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <span className="material-symbols-outlined text-violet-400 text-3xl animate-spin">sync</span>
                                                    <span className="text-sm text-slate-400 font-medium">Loading submissions…</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : attempts.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-16 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-4xl">inbox</span>
                                                    <span className="text-sm text-slate-400 font-medium">No submissions yet</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        attempts.map((att) => {
                                            const isSelected = reviewAttempt?.attempt?._id === att._id;
                                            const status = getStatus(att.status);
                                            return (
                                                <tr
                                                    key={att._id}
                                                    onClick={() => handleReview(att._id)}
                                                    className={`group cursor-pointer transition-colors ${isSelected
                                                        ? 'bg-violet-50 dark:bg-violet-500/10'
                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                        }`}
                                                >
                                                    {/* Student */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 min-w-9 min-h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all border ${isSelected
                                                                ? 'bg-violet-500 text-white border-violet-500'
                                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 shadow-sm'
                                                                }`}>
                                                                {att.userId?.name?.charAt(0)?.toUpperCase() || '?'}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                                    {att.userId?.name || 'Unknown'}
                                                                </p>
                                                                <p className="text-xs text-slate-400 truncate mt-0.5">
                                                                    {att.userId?.email || '—'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide ${status.cls}`}>
                                                            {status.label}
                                                        </span>
                                                    </td>

                                                    {/* Score */}
                                                    <td className="px-6 py-4">
                                                        {att.score !== null && att.score !== undefined ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-base font-bold text-violet-600 dark:text-violet-400">
                                                                    {att.score}
                                                                </span>
                                                                {att.isPublished && (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                                        <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                                                        Published
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">Pending</span>
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center justify-center gap-1">
                                                            {att.status !== 'active' && (
                                                                <button
                                                                    disabled={actionLoading === att._id}
                                                                    onClick={() => handleEvaluate(att._id)}
                                                                    title="Calculate Score"
                                                                    className="p-2 rounded-lg text-violet-600 hover:bg-violet-600/10 dark:text-violet-400 dark:hover:bg-violet-400/10 transition-colors disabled:opacity-40"
                                                                >
                                                                    <span className={`material-symbols-outlined text-[18px] ${actionLoading === att._id ? 'animate-spin' : ''}`}>
                                                                        {actionLoading === att._id ? 'sync' : 'calculate'}
                                                                    </span>
                                                                </button>
                                                            )}
                                                            {att.score !== null && att.score !== undefined && !att.isPublished && (
                                                                <button
                                                                    disabled={actionLoading === att._id}
                                                                    onClick={() => handlePublish(att._id)}
                                                                    title="Publish Result"
                                                                    className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-600/10 dark:text-emerald-400 dark:hover:bg-emerald-400/10 transition-colors disabled:opacity-40"
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">send</span>
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleReview(att._id)}
                                                                title="Review"
                                                                className={`p-2 rounded-lg transition-all ${isSelected
                                                                    ? 'text-violet-600 bg-violet-600/10 scale-110'
                                                                    : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                                    }`}
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">
                                                                    {isSelected ? 'chevron_right' : 'visibility'}
                                                                </span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Review Panel */}
                    {reviewAttempt && (
                        <div className="slide-in-right">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden xl:sticky xl:top-6">
                                {/* Panel Header */}
                                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                    <div className="w-10 h-10 min-w-10 min-h-10 rounded-full bg-violet-500 flex items-center justify-center text-white font-bold text-base shrink-0 border border-violet-500">
                                        {(reviewAttempt.attempt?.userId?.name || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                            {reviewAttempt.attempt?.userId?.name || 'Unknown'}
                                        </h3>
                                        <p className="text-xs text-slate-400 truncate">
                                            {reviewAttempt.attempt?.userId?.email || '—'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setReviewAttempt(null)}
                                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                    </button>
                                </div>

                                {/* Score Summary Bar - read-only */}
                                <div className="px-5 py-3 bg-violet-50 dark:bg-violet-500/10 border-b border-violet-100 dark:border-violet-500/20 flex items-center justify-between gap-3">
                                    <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 shrink-0">Final Score</span>
                                    <span className="text-lg font-black text-violet-700 dark:text-violet-300">
                                        {reviewAttempt.attempt?.score !== null && reviewAttempt.attempt?.score !== undefined
                                            ? reviewAttempt.attempt.score
                                            : <span className="text-sm font-medium text-slate-400 italic">Not scored</span>
                                        }
                                    </span>
                                </div>

                                {/* Answers */}
                                <div className="flex flex-col max-h-[70vh] overflow-hidden">
                                    {/* Save bar — shown only when there are pending overrides */}
                                    {Object.keys(localOverrides).length > 0 && (
                                        <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20 flex items-center justify-between gap-2 shrink-0">
                                            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[14px]">edit_note</span>
                                                {Object.keys(localOverrides).length} unsaved change{Object.keys(localOverrides).length > 1 ? 's' : ''}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setLocalOverrides({})}
                                                    className="text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors"
                                                >
                                                    Discard
                                                </button>
                                                <button
                                                    onClick={handleSaveOverrides}
                                                    disabled={overrideSaving}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    <span className={`material-symbols-outlined text-[14px] ${overrideSaving ? 'animate-spin' : ''}`}>
                                                        {overrideSaving ? 'sync' : 'save'}
                                                    </span>
                                                    Save Changes
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-4 space-y-3 overflow-y-auto scrollbar-thin flex-1">
                                        {reviewAttempt.answers?.length === 0 && (
                                            <div className="py-12 text-center text-sm text-slate-400">No answers recorded.</div>
                                        )}
                                        {reviewAttempt.answers?.map((ans, idx) => {
                                            const qId = ans.questionId?.toString?.() ?? ans.questionId;
                                            const isPending = qId in localOverrides;
                                            const pendingValue = localOverrides[qId]; // true | false | null (reset)
                                            const isPendingReset = isPending && pendingValue === null;

                                            // Auto value derived from the answer data (no override applied)
                                            const autoCorrect = ans.selectedLabel === ans.correctLabel;
                                            // Effective value used for UI preview
                                            const effectiveCorrect = isPending
                                                ? (isPendingReset ? autoCorrect : pendingValue)
                                                : ans.isCorrect;

                                            // Show reset button only when there is an active (non-null) override
                                            const hasActiveOverride = (isPending && !isPendingReset) || (!isPending && ans.isOverridden);
                                            // Show "Manually overridden" badge only for saved override with no pending change
                                            const showSavedBadge = ans.isOverridden && !isPending;

                                            return (
                                                <div
                                                    key={idx}
                                                    className={`rounded-xl border p-4 transition-all ${effectiveCorrect
                                                        ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20'
                                                        : 'bg-rose-50/50 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/15'
                                                        }`}
                                                >
                                                    {/* Question row */}
                                                    <div className="flex items-start gap-2 mb-3">
                                                        <span className="text-[10px] font-black text-violet-500 mt-0.5 shrink-0 uppercase">Q{idx + 1}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                                                                {ans.questionText}
                                                            </p>
                                                            {ans.questionImageUrl && (
                                                                <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                                                    <img
                                                                        src={ans.questionImageUrl}
                                                                        alt="Question illustration"
                                                                        className="w-full max-h-48 object-contain p-1.5"
                                                                        loading="lazy"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Override toggle buttons */}
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {hasActiveOverride && (
                                                                <button
                                                                    onClick={() => setLocalOverrides(prev => ({ ...prev, [qId]: null }))}
                                                                    title="Reset to auto-evaluated result"
                                                                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => setLocalOverrides(prev => ({ ...prev, [qId]: true }))}
                                                                title="Mark correct"
                                                                className={`p-1.5 rounded-lg transition-all ${isPending && !isPendingReset && pendingValue === true
                                                                    ? 'bg-emerald-500 text-white shadow-sm'
                                                                    : 'text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600'
                                                                    }`}
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">check</span>
                                                            </button>
                                                            <button
                                                                onClick={() => setLocalOverrides(prev => ({ ...prev, [qId]: false }))}
                                                                title="Mark wrong"
                                                                className={`p-1.5 rounded-lg transition-all ${isPending && !isPendingReset && pendingValue === false
                                                                    ? 'bg-rose-500 text-white shadow-sm'
                                                                    : 'text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600'
                                                                    }`}
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Saved override badge */}
                                                    {showSavedBadge && (
                                                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[12px]">edit</span>
                                                            Manually overridden
                                                        </p>
                                                    )}

                                                    {/* Answer comparison */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">Student's Response</p>
                                                            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-bold border ${effectiveCorrect
                                                                ? 'bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20'
                                                                : 'bg-rose-50/50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/20'
                                                                }`}>
                                                                {ans.selectedLabel && /^[A-Z]$/.test(ans.selectedLabel) && (
                                                                    <span className={`w-6 h-6 min-w-6 min-h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 ${effectiveCorrect ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                                                        {ans.selectedLabel}
                                                                    </span>
                                                                )}
                                                                <span className="truncate leading-tight">
                                                                    {ans.selectedOption || <em className="opacity-50 font-normal">No Response</em>}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider">Correct Answer</p>
                                                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-bold bg-violet-50 dark:bg-violet-500/10 text-violet-900 dark:text-violet-200 border border-violet-500/20 shadow-sm">
                                                                {ans.correctLabel && /^[A-Z]$/.test(ans.correctLabel) && (
                                                                    <span className="w-6 h-6 min-w-6 min-h-6 rounded-full flex items-center justify-center text-[10px] font-black bg-violet-500 text-white shrink-0">
                                                                        {ans.correctLabel}
                                                                    </span>
                                                                )}
                                                                <span className="truncate leading-tight">{ans.correctOption}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}