import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from './AuthContext';
import * as db from '../utils/indexedDB';
import NetworkStatus from './NetworkStatus';
import { useToast } from '../context/ToastContext';
import { io } from 'socket.io-client';
import { renderTextWithFractions } from '../utils/textFormatters';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function ActiveExamInterface() {
    const navigate = useNavigate();
    const { attemptId } = useParams();
    const { user } = useAuth();
    const { showToast } = useToast();

    const [examData, setExamData] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({}); // { questionId: selectedOptionId }
    const [flagged, setFlagged] = useState(new Set()); // Set of questionIds
    const [currentIdx, setCurrentIdx] = useState(0);
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncingBacklog, setSyncingBacklog] = useState(false);
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [timeUp, setTimeUp] = useState(false);

    const timerRef = useRef(null);
    const violationPendingRef = useRef(null);
    const socketRef = useRef(null);
    const answersRef = useRef({});

    useEffect(() => {
        if (!user) return;

        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [user]);
    if (!user) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-100">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                    <h2 className="text-xl font-bold text-red-600">
                        Session Expired
                    </h2>
                    <p className="text-slate-600 mt-2">
                        Your account was logged in from another device.
                    </p>
                </div>
            </div>
        );
    }

    useEffect(() => {
        // Fetch attempt data initially. Realistically, we'd need a specific GET /attempt/:id endpoint, 
        // but since we only have start, we can hit it again if we pretend to resume, However, the backend 
        // /exam/start/:examId requires *examId*, not *attemptId*.
        // Wait, startExam takes examId. But the route we set up is /exam/:attemptId.
        // Let's modify this to load from a hypothetical fetch or check if we already have it.
        // Actually, the API doesn't have a GET /attempt/:attemptId. 
        // It has GET /exam/:userId which returns live sessions.
        const loadExamData = async () => {
            try {
                // Initialize Socket Connection for real-time monitoring
                const socket = io(SOCKET_URL);
                socketRef.current = socket;

                socket.on('connect', () => {
                    console.log('Exam Socket Connected');
                    socket.emit('join_exam_room', attemptId);
                });

                socket.on('exam_terminated', (data) => {
                    showToast(data.message || "Your exam session has been terminated.", "error", 10000);
                    db.clearExamData(attemptId);
                    navigate('/dashboard', { replace: true, state: { terminated: true } });
                });

                // Check IndexedDB first for a resumed session
                const localData = await db.getExamData(attemptId);
                const localResponses = await db.getResponses(attemptId);

                const res = await api.get(`/exam/${user.id}`);
                const active = res.data.liveSession.find(e => e.attemptId === attemptId);

                if (!active) {
                    showToast("No active session found.", "error");
                    navigate('/dashboard');
                    return;
                }

                const attemptRes = await api.post(`/exam/start/${active._id}`);
                setExamData(active);
                setQuestions(attemptRes.data.questions);

                // Persistence logic: Backend is source of truth for questions/time, 
                // but local IndexedDB might have unsynced answers.
                const backendAnswers = {};
                (attemptRes.data.answers || []).forEach(ans => {
                    backendAnswers[ans.questionId] = ans.selectedOption;
                });

                // Merge: prefer local if it's "newer" or exists, for simplicity let's use backend + local diffs
                const mergedAnswers = { ...backendAnswers };
                if (localResponses && localResponses.answers) {
                    Object.assign(mergedAnswers, localResponses.answers);
                }
                setAnswers(mergedAnswers);

                if (localResponses && localResponses.flaggedArray) {
                    setFlagged(new Set(localResponses.flaggedArray));
                }

                setRemainingSeconds(attemptRes.data.remainingTime);

                // Save initial state to IndexedDB
                await db.saveExamData(attemptId, {
                    title: active.title,
                    questions: attemptRes.data.questions,
                    duration: active.duration
                });

            } catch (err) {
                console.error(err);
                showToast("Failed to load exam.", "error");
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };

        loadExamData();

        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = ''; // Standard way to show browser prompt
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                reportViolation("TAB_SWITCH");
                violationPendingRef.current = "TAB_SWITCH";
            } else if (violationPendingRef.current) {
                const type = violationPendingRef.current;
                showToast(`Warning: ${type === "TAB_SWITCH" ? "Tab switch" : "Activity outside exam"} detected and recorded.`, "error", 6000);
                violationPendingRef.current = null;
            }
        };

        const handleBlur = () => {
            reportViolation("WINDOW_BLUR");
            violationPendingRef.current = "WINDOW_BLUR";
        };

        const handleFocus = () => {
            if (violationPendingRef.current) {
                const type = violationPendingRef.current;
                showToast(`Warning: ${type === "WINDOW_BLUR" ? "Window focus lost" : "Suspicious activity"} detected and recorded.`, "error", 6000);
                violationPendingRef.current = null;
            }
        };

        const handlePopState = (e) => {
            // Push the state forward again to cancel the back button
            window.history.pushState(null, null, window.location.href);
            showToast("Navigation is disabled during the exam. Please use the submit button.", "warning");
        };

        const handleOnline = async () => {
            if (!user) return;
            setSyncingBacklog(true);
            try {
                const localResponses = await db.getResponses(attemptId);
                if (localResponses && localResponses.answers) {
                    const answersArray = Object.keys(localResponses.answers).map(qid => ({
                        questionId: qid,
                        selectedOption: localResponses.answers[qid]
                    }));
                    await api.post(`/exam/sync/${attemptId}`, { answers: answersArray });
                    console.log("Backlog synced successfully");
                }
            } catch (err) {
                console.error("Backlog sync failed:", err);
            } finally {
                setSyncingBacklog(false);
            }
        };

        const disableContext = (e) => e.preventDefault();

        // Push an initial state to trap the back button
        window.history.pushState(null, null, window.location.href);

        // window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('popstate', handlePopState);
        document.addEventListener('contextmenu', disableContext);
        document.addEventListener('copy', disableContext);
        document.addEventListener('paste', disableContext);
        window.addEventListener('online', handleOnline);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            // window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('popstate', handlePopState);
            document.removeEventListener('contextmenu', disableContext);
            document.removeEventListener('copy', disableContext);
            document.removeEventListener('paste', disableContext);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);

            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [attemptId, user.id, navigate]);

    useEffect(() => {
        if (loading || remainingSeconds <= 0) return;

        timerRef.current = setInterval(() => {
            setRemainingSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    setTimeUp(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [loading]);

    // When time is up, auto-submit after showing the modal for 3 seconds
    useEffect(() => {
        if (!timeUp) return;
        const t = setTimeout(() => handleAutoSubmit(), 3000);
        return () => clearTimeout(t);
    }, [timeUp]);

    const handleSelectOption = (qId, optionObj) => {
        setAnswers(prev => ({ ...prev, [qId]: optionObj }));
    };

    const handleTitaInput = (qId, value) => {
        setAnswers(prev => ({ ...prev, [qId]: value }));
    };

    const toggleFlag = () => {
        if (!questions[currentIdx]) return;
        setFlagged(prev => {
            const next = new Set(prev);
            const qId = questions[currentIdx]._id;
            if (next.has(qId)) next.delete(qId);
            else next.add(qId);
            return next;
        });
    };

    const handleClearSelection = () => {
        if (!questions[currentIdx]) return;
        setAnswers(prev => {
            const next = { ...prev };
            delete next[questions[currentIdx]._id];
            return next;
        });
    };

    // Keep answersRef current so auto-submit always sends the latest answers
    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    // Auto-save to IndexedDB and Debounced Sync to Backend
    useEffect(() => {
        if (loading || !user) return;   // ✅ add !user check

        db.saveResponses(attemptId, answers, flagged);

        const timeoutId = setTimeout(async () => {
            if (!navigator.onLine || !user) return; // ✅ extra safety
            setSaving(true);
            try {
                const answersArray = Object.keys(answers).map(qid => ({
                    questionId: qid,
                    selectedOption: answers[qid]
                }));
                await api.post(`/exam/sync/${attemptId}`, { answers: answersArray });
            } catch (err) {
                console.error("Auto-sync failed:", err);
            } finally {
                setSaving(false);
            }
        }, 3000); // Sync after 3s of inactivity

        return () => clearTimeout(timeoutId);
    }, [answers, flagged, attemptId, loading]);

    const handleSaveNext = () => {
        // Switch question instantly for better UX
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(prev => prev + 1);
        }

        // Sync answers in the background
        setSaving(true);
        const answersArray = Object.keys(answers).map(qid => ({
            questionId: qid,
            selectedOption: answers[qid]
        }));

        api.post(`/exam/sync/${attemptId}`, { answers: answersArray })
            .catch(err => console.error(err))
            .finally(() => setSaving(false));
    };

    const confirmSubmission = () => {
        setShowConfirmModal(false);
        handleSubmit(true);
    };

    const handleAutoSubmit = async () => {
        try {
            const answersArray = Object.keys(answersRef.current).map(qid => ({
                questionId: qid,
                selectedOption: answersRef.current[qid]
            }));
            try {
                await api.post(`/exam/sync/${attemptId}`, { answers: answersArray });
            } catch (syncErr) {
                console.warn("Pre-submit sync failed, submitting anyway:", syncErr);
            }
            await api.post(`/exam/submit/${attemptId}`);
            await db.clearExamData(attemptId);
            navigate('/dashboard', { state: { autoSubmitted: true } });
        } catch (err) {
            console.error(err);
            await db.clearExamData(attemptId);
            navigate('/dashboard');
        }
    };

    const handleSubmit = async (force = false) => {
        if (!force) {
            setShowConfirmModal(true);
            return;
        }
        try {
            const answersArray = Object.keys(answers).map(qid => ({
                questionId: qid,
                selectedOption: answers[qid]
            }));
            try {
                await api.post(`/exam/sync/${attemptId}`, { answers: answersArray });
            } catch (syncErr) {
                console.warn("Pre-submit sync failed, submitting anyway:", syncErr);
            }
            const res = await api.post(`/exam/submit/${attemptId}`);
            showToast(res.data.message || "Exam submitted successfully. Your result is pending review.", "success", 6000);
            await db.clearExamData(attemptId);
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            showToast("Error submitting exam", "error");
        }
    };

    const reportViolation = async (type, metadata = {}) => {
        try {
            await api.post(`/exam/report-violation/${attemptId}`, {
                type,
                metadata: {
                    ...metadata,
                    timestamp: new Date().toISOString(),
                    browser: navigator.userAgent,
                    url: window.location.href
                }
            });
        } catch (err) {
            console.error("Failed to report violation:", err);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><div className="animate-spin size-12 border-4 border-primary border-t-transparent rounded-full"></div></div>;

    if (questions.length === 0) return <div className="h-screen flex items-center justify-center">No questions found.</div>;

    const currentQuestion = questions[currentIdx];

    // Format time
    const h = Math.floor(remainingSeconds / 3600);
    const m = Math.floor((remainingSeconds % 3600) / 60);
    const s = remainingSeconds % 60;

    // Group questions by subject
    const groupedQuestions = [];
    questions.forEach((q, idx) => {
        let subjectGroup = groupedQuestions.find(g => g.subject === q.subject);
        if (!subjectGroup) {
            subjectGroup = { subject: q.subject || 'General', items: [] };
            groupedQuestions.push(subjectGroup);
        }
        subjectGroup.items.push({ q, idx });
    });

    return (
        <div className="flex flex-col h-dvh w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <style>{`
                @media (max-width: 1024px) {
                    #global-theme-toggle { display: none !important; }
                }
            `}</style>
            {/* Top Navigation Bar */}
            <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 lg:px-6 py-2 md:py-3 z-30 relative">
                <div className="max-w-360 mx-auto flex items-center justify-between gap-2">
                    {/* Left: Hamburger & Title */}
                    <div className="flex items-center gap-1 sm:gap-3 flex-1 min-w-0">
                        <button
                            onClick={() => setIsNavOpen(!isNavOpen)}
                            className="lg:hidden p-1.5 sm:p-2 -ml-1 sm:-ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                            aria-label="Toggle Navigation"
                        >
                            <span className="material-symbols-outlined text-[20px] sm:text-[24px]">{isNavOpen ? 'close' : 'menu'}</span>
                        </button>
                        <div className="bg-primary/10 p-1.5 sm:p-2 rounded-lg text-primary hidden sm:block shrink-0">
                            <span className="material-symbols-outlined text-[20px] sm:text-[24px]">quiz</span>
                        </div>
                        <div className="flex flex-col truncate">
                            <h1 className="text-sm sm:text-base lg:text-lg font-bold leading-tight tracking-tight truncate">{examData?.title}</h1>
                            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">Time Limit: {examData?.duration} Mins</p>
                        </div>
                    </div>

                    {/* Right: Timer, Status, Submit */}
                    <div className="flex items-center gap-1 sm:gap-4 lg:gap-8 shrink-0">
                        {/* Countdown Timer */}
                        <div className="flex items-center gap-0.5 sm:gap-1 lg:gap-2">
                            <div className="flex flex-col items-center">
                                <div className="bg-slate-100 dark:bg-slate-800 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-md lg:rounded-lg">
                                    <span className="text-[11px] sm:text-lg lg:text-xl font-bold text-primary">{String(h).padStart(2, '0')}</span>
                                </div>
                                <span className="text-[8px] lg:text-[10px] uppercase font-bold text-slate-400 hidden sm:block">Hours</span>
                            </div>
                            <span className="font-bold text-slate-300 text-xs sm:text-sm">:</span>
                            <div className="flex flex-col items-center">
                                <div className="bg-slate-100 dark:bg-slate-800 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-md lg:rounded-lg">
                                    <span className="text-[11px] sm:text-lg lg:text-xl font-bold text-primary">{String(m).padStart(2, '0')}</span>
                                </div>
                                <span className="text-[8px] lg:text-[10px] uppercase font-bold text-slate-400 hidden sm:block">Mins</span>
                            </div>
                            <span className="font-bold text-slate-300 text-xs sm:text-sm">:</span>
                            <div className="flex flex-col items-center">
                                <div className="bg-slate-100 dark:bg-slate-800 px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-md lg:rounded-lg">
                                    <span className={s < 60 && m === 0 ? "text-[11px] sm:text-lg lg:text-xl font-bold text-red-500" : "text-[11px] sm:text-lg lg:text-xl font-bold text-primary"}>{String(s).padStart(2, '0')}</span>
                                </div>
                                <span className="text-[8px] lg:text-[10px] uppercase font-bold text-slate-400 hidden sm:block">Secs</span>
                            </div>
                        </div>

                        <div className="hidden sm:block h-6 lg:h-10 w-px bg-slate-200 dark:bg-slate-800"></div>

                        <div className="flex items-center gap-2 lg:gap-6">
                            <div className="hidden sm:block">
                                <NetworkStatus isSyncing={saving} isSyncingBacklog={syncingBacklog} />
                            </div>
                            {/* Mobile network indicator dot */}
                            <div className="sm:hidden flex items-center justify-center">
                                <div className={`w-2 h-2 rounded-full ${saving || syncingBacklog ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                            </div>

                            <button onClick={() => handleSubmit()} className="bg-primary text-white px-2 py-1 sm:px-4 sm:py-2 lg:px-6 rounded-md lg:rounded-lg font-bold text-[11px] sm:text-xs lg:text-sm hover:bg-primary/90 transition-all shadow-sm border-none cursor-pointer whitespace-nowrap">
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col lg:flex-row gap-3 lg:gap-6 p-3 lg:p-6 max-w-360 mx-auto w-full min-h-0 overflow-hidden relative">
                {/* Left: Question Area */}
                <div className="flex-1 lg:flex-3 flex flex-col gap-3 lg:gap-4 overflow-hidden min-h-0">
                    <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 lg:p-8 flex flex-col overflow-y-auto custom-scrollbar">
                        <div className="flex flex-wrap items-center justify-between mb-4 lg:mb-8 shrink-0 gap-3">
                            <div className="flex items-center gap-2">
                                <span className="bg-primary/10 text-primary px-3 lg:px-4 py-1.5 rounded-full text-xs lg:text-sm font-bold">
                                    Question {currentIdx + 1} of {questions.length}
                                </span>
                                {currentQuestion.type === 'tita' && (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] lg:text-xs font-black uppercase tracking-widest bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20">
                                        TITA
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 lg:gap-4 flex-wrap">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <span className="text-xs lg:text-sm font-medium text-slate-500 group-hover:text-amber-500 transition-colors">Review</span>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            className="sr-only peer"
                                            type="checkbox"
                                            checked={flagged.has(currentQuestion._id)}
                                            onChange={toggleFlag}
                                        />
                                        <div className="w-10 h-5 md:w-11 md:h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:inset-s-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 md:after:h-5 md:after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
                                    </div>
                                </label>
                                <span className="px-2 py-1 lg:px-3 lg:py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] lg:text-xs font-bold text-slate-500">
                                    {currentQuestion.subject}
                                </span>
                            </div>
                        </div>

                        <div className="prose dark:prose-invert max-w-none shrink-0 border-b border-slate-100 dark:border-slate-800 pb-4 lg:pb-6 mb-4 lg:mb-6">
                            <p className="text-lg lg:text-xl font-medium leading-relaxed dark:text-slate-100">
                                {renderTextWithFractions(currentQuestion.text)}
                            </p>

                            {/* Question image */}
                            {currentQuestion.imageUrl && (
                                <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 not-prose">
                                    <img
                                        src={currentQuestion.imageUrl}
                                        alt="Question illustration"
                                        className="w-full max-h-72 object-contain p-2"
                                        loading="lazy"
                                    />
                                </div>
                            )}
                        </div>

                        {/* MCQ options */}
                        {currentQuestion.type !== 'tita' ? (
                            <div className="space-y-3 lg:space-y-4 flex-1">
                                {currentQuestion.options.map(opt => {
                                    const currentSelection = answers[currentQuestion._id];
                                    const isSelected = (currentSelection?._id !== undefined ? currentSelection.label : currentSelection) == opt.label;
                                    return (
                                        <label
                                            key={opt.value}
                                            className={`flex items-start p-3 lg:p-4 border rounded-xl cursor-pointer transition-all group ${isSelected
                                                ? 'border-primary/40 bg-primary/5 dark:border-primary/40 ring-1 ring-primary/20'
                                                : 'border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:bg-primary/5'
                                                }`}
                                        >
                                            <input
                                                checked={isSelected}
                                                onChange={() => handleSelectOption(currentQuestion._id, opt)}
                                                className="w-4 h-4 mt-0.5 lg:mt-0 md:w-5 md:h-5 text-primary border-slate-300 focus:ring-primary dark:bg-slate-800 dark:border-slate-700 accent-primary cursor-pointer shrink-0"
                                                name={`answer-${currentQuestion._id}`}
                                                type="radio"
                                                value={opt.value}
                                            />
                                            <span className={`ml-3 lg:ml-4 text-sm lg:text-base font-medium block w-full ${isSelected ? 'text-primary font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {renderTextWithFractions(opt.value)}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        ) : (
                            /* TITA input */
                            <div className="flex-1 flex flex-col gap-3">
                                <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-500/5 border border-violet-200 dark:border-violet-500/20">
                                    <p className="text-xs font-black uppercase tracking-widest text-violet-500 dark:text-violet-400 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px]">keyboard</span>
                                        Type In The Answer
                                    </p>
                                    <p className="text-xs text-violet-600/70 dark:text-violet-400/60 mt-1">
                                        Type your answer exactly. Spelling and case may matter.
                                    </p>
                                </div>
                                <input
                                    type="text"
                                    value={answers[currentQuestion._id] || ''}
                                    onChange={(e) => handleTitaInput(currentQuestion._id, e.target.value)}
                                    placeholder="Type your answer here..."
                                    autoComplete="off"
                                    className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-4 text-base lg:text-lg font-bold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none"
                                />
                                {answers[currentQuestion._id] && (
                                    <p className="text-xs text-slate-400 font-medium ml-1">
                                        Answer saved · {String(answers[currentQuestion._id]).length} characters
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-3 md:p-5 rounded-xl md:rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-lg shadow-slate-200/20 dark:shadow-none w-full">
                        <div className="flex items-center justify-between gap-2 md:gap-3">

                            {/* Previous Button - Ghost Style */}
                            <button
                                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                                disabled={currentIdx === 0}
                                className="group flex items-center gap-1 md:gap-2 px-3 md:px-6 py-2 md:py-3 font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all duration-300 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-lg md:text-xl transition-transform group-hover:-translate-x-1">arrow_back</span>
                                <span className="hidden md:inline tracking-wide">Previous</span>
                            </button>

                            {/* Center Action: Clear Selection - Minimalist Style */}
                            <button
                                onClick={handleClearSelection}
                                className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 md:py-3 font-bold text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-all duration-300 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-lg md:text-xl">restart_alt</span>
                                <span className="hidden lg:inline text-xs uppercase tracking-widest">Clear Answer</span>
                            </button>

                            {/* Save & Next - Primary Action Style */}
                            <button
                                onClick={handleSaveNext}
                                disabled={currentIdx === questions.length - 1}
                                className="group relative flex items-center gap-1 md:gap-2 px-4 md:px-10 py-2 md:py-3 bg-indigo-600 dark:bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-400 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.97] transition-all duration-300  lg:mr-0 disabled:opacity-40 disabled:hover:shadow-none disabled:hover:bg-indigo-600 dark:disabled:hover:bg-indigo-500 disabled:active:scale-100 disabled:cursor-not-allowed"
                            >
                                <span className="hidden md:inline tracking-wide">Save & Next</span>
                                {/* <span className="inline md:hidden tracking-wide text-sm">Next</span> */}
                                <span className="material-symbols-outlined text-lg md:text-xl transition-transform group-hover:translate-x-1">arrow_forward</span>

                                {/* Subtle Shine Effect */}
                                <div className="absolute inset-0 rounded-xl bg-linear-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 -translate-x-full group-hover:translate-x-full transition-all duration-1000"></div>
                            </button>

                        </div>
                    </div>
                </div>

                {/* Right: Navigator Mobile Overlay */}
                {isNavOpen && (
                    <div
                        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
                        onClick={() => setIsNavOpen(false)}
                    />
                )}

                {/* Right: Navigator & Camera */}
                <div className={`fixed lg:relative top-0 right-0 h-dvh lg:h-auto w-70 sm:w-[320px] lg:w-full lg:max-w-sm z-50 lg:z-auto bg-slate-50 dark:bg-slate-900 lg:bg-transparent p-4 lg:p-0 shadow-2xl lg:shadow-none border-l border-slate-200 dark:border-slate-800 lg:border-none transition-transform duration-300 lg:transform-none lg:flex lg:flex-1 flex flex-col gap-4 overflow-hidden shrink-0 ${isNavOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>

                    {/* Mobile Menu Header */}
                    <div className="flex items-center justify-between lg:hidden shrink-0 pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                        <h2 className="font-bold text-slate-800 dark:text-slate-100">Navigator</h2>
                        <button onClick={() => setIsNavOpen(false)} className="p-2 -mr-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Question Navigator */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm lg:border border-slate-200 dark:border-slate-800 flex-1 flex flex-col min-h-75 lg:min-h-0 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100">Question Navigator</h3>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto w-full custom-scrollbar">
                            <div className="flex flex-col gap-6 w-full">
                                {groupedQuestions.map(group => (
                                    <div key={group.subject} className="space-y-3">
                                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 py-1">
                                            <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">
                                                {group.subject}
                                            </h4>
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{group.items.length} Questions</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 w-full justify-start">
                                            {group.items.map(({ q, idx }) => {
                                                const isCurrent = idx === currentIdx;
                                                const isAnswered = !!answers[q._id];
                                                const isFlagged = flagged.has(q._id);

                                                let btnClass = "relative flex items-center justify-center rounded-lg text-xs font-bold cursor-pointer transition-colors border-none aspect-square w-10 ";

                                                if (isCurrent) {
                                                    btnClass += "ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900 bg-primary/20 text-primary";
                                                } else if (isFlagged && !isAnswered) {
                                                    btnClass += "bg-amber-500 text-white hover:bg-amber-600";
                                                } else if (isAnswered) {
                                                    btnClass += "bg-emerald-500 text-white hover:bg-emerald-600";
                                                } else {
                                                    btnClass += "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700";
                                                }

                                                return (
                                                    <button
                                                        key={q._id}
                                                        onClick={() => {
                                                            setCurrentIdx(idx);
                                                            setIsNavOpen(false);
                                                        }}
                                                        className={btnClass}
                                                        title={q.type === 'tita' ? `Q${idx + 1} · TITA` : `Q${idx + 1}`}
                                                    >
                                                        {isFlagged && isAnswered && (
                                                            <span className="absolute -top-1 -right-1 text-[8px] text-amber-300 drop-shadow-md">★</span>
                                                        )}
                                                        {q.type === 'tita' && (
                                                            <span className="absolute -top-1 -left-1 text-[7px] font-black bg-violet-500 text-white px-0.5 rounded leading-none">T</span>
                                                        )}
                                                        {idx + 1}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 space-y-2 shrink-0">
                            <div className="flex items-center gap-2 text-xs font-medium">
                                <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                                <span className="text-slate-600 dark:text-slate-400">Answered ({Object.keys(answers).length})</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium">
                                <div className="w-3 h-3 rounded-sm bg-amber-500"></div>
                                <span className="text-slate-600 dark:text-slate-400">Flagged ({flagged.size})</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium">
                                <div className="w-3 h-3 rounded-sm bg-slate-200 dark:bg-slate-700"></div>
                                <span className="text-slate-600 dark:text-slate-400">Unanswered ({questions.length - Object.keys(answers).length})</span>
                            </div>
                            {questions.some(q => q.type === 'tita') && (
                                <div className="flex items-center gap-2 text-xs font-medium pt-1 border-t border-slate-200 dark:border-slate-700">
                                    <span className="text-[9px] font-black bg-violet-500 text-white px-1 rounded leading-tight">T</span>
                                    <span className="text-slate-600 dark:text-slate-400">TITA — type your answer</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Time's Up Modal */}
            {timeUp && (
                <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm px-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-center mb-5">
                            <div className="p-4 bg-red-100 dark:bg-red-500/20 rounded-full">
                                <span className="material-symbols-outlined text-4xl text-red-500 dark:text-red-400">timer_off</span>
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Time's Up!</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                            Your exam time has expired. Your answers are being submitted automatically.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-indigo-500">
                            <div className="animate-spin size-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                            Submitting your attempt...
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 rounded-full flex shrink-0">
                                <span className="material-symbols-outlined">warning</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Submit Exam?</h3>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                            Are you sure you want to finalize your submission? You will not be able to change your answers after this action.
                        </p>
                        <div className="flex justify-end gap-3 w-full">
                            <button 
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 px-4 py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all border-none cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmSubmission}
                                className="flex-1 px-4 py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-lg shadow-indigo-600/30 border-none cursor-pointer"
                            >
                                Yes, Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
