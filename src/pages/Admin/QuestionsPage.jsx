import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { renderTextWithFractions } from '../../utils/textFormatters';

const emptyOption = { label: "", value: "" };

export default function QuestionsPage() {
    const { showToast } = useToast();
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('single');

    // Summary state (the subject->difficulty tree with counts)
    const [summary, setSummary] = useState([]);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);

    const [filterBoard, setFilterBoard] = useState("General");
    const [filterClass, setFilterClass] = useState("General");

    // Accordion state
    const [expandedSubject, setExpandedSubject] = useState(null);
    const [expandedDifficulty, setExpandedDifficulty] = useState(null);

    // Lazy-loaded questions cache: key = "subject||difficulty"
    const [groupQuestions, setGroupQuestions] = useState({});
    const [groupMeta, setGroupMeta] = useState({});

    const [singleForm, setSingleForm] = useState({
        text: "",
        subject: "",
        difficulty: "easy",
        board: "General",
        class: "General",
        options: [
            { ...emptyOption, label: "A" },
            { ...emptyOption, label: "B" },
            { ...emptyOption, label: "C" },
            { ...emptyOption, label: "D" },
        ],
        correctAnswer: "",
    });

    const [bulkText, setBulkText] = useState("");

    // Load the summary tree (subject > difficulty > count)
    const loadSummary = async () => {
        setSummaryLoading(true);
        try {
            const { data } = await api.get('/admin/questions/summary', {
                params: { board: filterBoard, class: filterClass }
            });
            setSummary(data.data || []);
            setTotalRecords(data.totalRecords || 0);
        } catch (err) {
            showToast('Failed to load question summary', 'error');
        } finally {
            setSummaryLoading(false);
        }
    };

    useEffect(() => { loadSummary(); }, [filterBoard, filterClass]);

    // Lazy-load questions for a specific subject+difficulty group
    const loadGroupQuestions = async (subject, difficulty, page = 1) => {
        const key = `${subject}||${difficulty}`;
        setGroupMeta(prev => ({ ...prev, [key]: { ...prev[key], loading: true, page } }));
        try {
            const { data } = await api.get('/admin/questions/by-group', {
                params: { subject, difficulty, page, limit: 20, board: filterBoard, class: filterClass }
            });
            setGroupQuestions(prev => ({ ...prev, [key]: data.data || [] }));
            setGroupMeta(prev => ({
                ...prev,
                [key]: { loading: false, page: data.currentPage, totalPages: data.totalPages }
            }));
        } catch (err) {
            showToast(`Failed to load ${difficulty} ${subject} questions`, 'error');
            setGroupMeta(prev => ({ ...prev, [key]: { ...prev[key], loading: false } }));
        }
    };

    // Accordion toggle handlers
    const toggleSubject = (subject) => {
        setExpandedSubject(prev => prev === subject ? null : subject);
        setExpandedDifficulty(null);
    };

    const toggleDifficulty = (subject, difficulty) => {
        const key = `${subject}||${difficulty}`;
        const newKey = `${subject}__${difficulty}`;
        if (expandedDifficulty === newKey) {
            setExpandedDifficulty(null);
        } else {
            setExpandedDifficulty(newKey);
            if (!groupQuestions[key]) {
                loadGroupQuestions(subject, difficulty, 1);
            }
        }
    };

    // Form handlers
    const handleSingleChange = (e) => {
        const { name, value } = e.target;
        setSingleForm(prev => ({ ...prev, [name]: value }));
    };

    const handleOptionChange = (index, value) => {
        setSingleForm((prev) => {
            const next = [...prev.options];
            next[index] = { ...next[index], value };
            return { ...prev, options: next };
        });
    };

    const handleCreateSingle = async (e) => {
        e.preventDefault();
        setSaving(true);
        const subjectAtSubmit = singleForm.subject;
        const difficultyAtSubmit = singleForm.difficulty;
        try {
            await api.post('/admin/questions', singleForm);
            showToast('Question added to bank', 'success');
            setSingleForm({
                text: "", subject: "", difficulty: "easy", board: singleForm.board, class: singleForm.class,
                options: [
                    { ...emptyOption, label: "A" }, { ...emptyOption, label: "B" },
                    { ...emptyOption, label: "C" }, { ...emptyOption, label: "D" },
                ],
                correctAnswer: "",
            });
            const key = `${subjectAtSubmit}||${difficultyAtSubmit}`;
            setGroupQuestions(prev => { const n = { ...prev }; delete n[key]; return n; });
            loadSummary();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to save question', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleBulkUpload = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const parsed = JSON.parse(bulkText || "[]");
            if (!Array.isArray(parsed)) throw new Error("JSON must be an array");
            await api.post('/admin/questions/bulk', { questions: parsed });
            showToast(`${parsed.length} questions uploaded successfully`, 'success');
            setBulkText("");
            setGroupQuestions({});
            setGroupMeta({});
            loadSummary();
        } catch (err) {
            showToast(err.response?.data?.message || err.message || 'Bulk upload failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Difficulty color helpers
    const diffStyles = {
        easy: { dot: 'bg-emerald-500', label: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/60 dark:bg-emerald-500/5' },
        medium: { dot: 'bg-amber-500', label: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50/60 dark:bg-amber-500/5' },
        hard: { dot: 'bg-rose-500', label: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50/60 dark:bg-rose-500/5' },
    };
    const getDiffStyle = (d) => diffStyles[d] || { dot: 'bg-slate-400', label: 'text-slate-500', bg: 'bg-slate-50' };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Question Bank</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage and categorize your central library of assessment items.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

                {/* ---- Left: Inventory Explorer ---- */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1 gap-2">
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Inventory Explorer</h2>
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={filterBoard}
                                onChange={(e) => setFilterBoard(e.target.value)}
                                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-bold focus:border-indigo-500 outline-none"
                            >
                                <option value="General">General Board</option>
                                <option value="CBSE">CBSE</option>
                                <option value="ICSE">ICSE</option>
                                <option value="State Board">State Board</option>
                            </select>
                            <select
                                value={filterClass}
                                onChange={(e) => setFilterClass(e.target.value)}
                                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-bold focus:border-indigo-500 outline-none"
                            >
                                <option value="General">General Class</option>
                                <option value="Class 5">Class 5</option>
                                <option value="Class 6">Class 6</option>
                                <option value="Class 7">Class 7</option>
                                <option value="Class 8">Class 8</option>
                                <option value="Class 9">Class 9</option>
                                <option value="Class 10">Class 10</option>
                                <option value="Class 11">Class 11</option>
                                <option value="Class 12">Class 12</option>
                            </select>
                            <span className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-sm">
                                {totalRecords} Items
                            </span>
                            <button
                                onClick={loadSummary}
                                disabled={summaryLoading}
                                className="p-2 hover:bg-slate-100 dark:bg-slate-800 rounded-xl transition-all disabled:opacity-60"
                            >
                                <span className={`material-symbols-outlined text-indigo-600 text-sm ${summaryLoading ? 'animate-spin' : ''}`}>
                                    {summaryLoading ? 'sync' : 'refresh'}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3 max-h-[75vh] overflow-y-auto custom-scrollbar pr-1 pb-4">
                        {summaryLoading ? (
                            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <div className="animate-spin size-8 border-[3px] border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                <p className="text-sm text-slate-500 font-bold">Organising your vault...</p>
                            </div>
                        ) : summary.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 font-bold bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                Vault is empty. Add the first question to get started.
                            </div>
                        ) : summary.map(({ subject, total, difficulties }) => (
                            <div key={subject} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

                                {/* Level 1 — Subject Header */}
                                <button
                                    onClick={() => toggleSubject(subject)}
                                    className="w-full px-5 py-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                                >
                                    <div className="size-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-[20px]">book</span>
                                    </div>
                                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight text-left flex-1">{subject}</span>
                                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 mr-1">
                                        {total} Qs
                                    </span>
                                    <span className={`material-symbols-outlined text-slate-400 text-[20px] transition-transform duration-300 shrink-0 ${expandedSubject === subject ? 'rotate-180' : ''}`}>
                                        expand_more
                                    </span>
                                </button>

                                {/* Level 2 — Difficulty Subgroups */}
                                {expandedSubject === subject && (
                                    <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in duration-200">
                                        {difficulties.map(({ difficulty, count }) => {
                                            const style = getDiffStyle(difficulty);
                                            const diffKey = `${subject}__${difficulty}`;
                                            const groupKey = `${subject}||${difficulty}`;
                                            const isOpen = expandedDifficulty === diffKey;
                                            const meta = groupMeta[groupKey] || {};
                                            const qs = groupQuestions[groupKey] || [];

                                            return (
                                                <div key={difficulty}>
                                                    {/* Difficulty row */}
                                                    <button
                                                        onClick={() => toggleDifficulty(subject, difficulty)}
                                                        className={`w-full px-5 py-3 flex items-center gap-3 transition-all ${style.bg} hover:brightness-95`}
                                                    >
                                                        <span className={`size-2 rounded-full shrink-0 ${style.dot}`}></span>
                                                        <span className={`text-[11px] font-black uppercase tracking-widest flex-1 text-left ${style.label}`}>
                                                            {difficulty} Level
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 mr-1">{count} items</span>
                                                        <span className={`material-symbols-outlined text-slate-400 text-[18px] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                                                            expand_more
                                                        </span>
                                                    </button>

                                                    {/* Level 3 — Questions (lazy loaded) */}
                                                    {isOpen && (
                                                        <div className="bg-slate-50/40 dark:bg-slate-800/20 animate-in fade-in duration-200">
                                                            {meta.loading ? (
                                                                <div className="p-8 flex flex-col items-center gap-3">
                                                                    <div className="animate-spin size-6 border-[3px] border-indigo-500 border-t-transparent rounded-full"></div>
                                                                    <p className="text-xs font-bold text-slate-400">Loading questions...</p>
                                                                </div>
                                                            ) : qs.length === 0 ? (
                                                                <p className="p-6 text-xs font-bold text-slate-400 text-center">No questions found.</p>
                                                            ) : (
                                                                <>
                                                                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                                                        {qs.map((q) => (
                                                                            <div key={q._id} className="px-5 py-4 hover:bg-white dark:hover:bg-slate-800/40 transition-colors">
                                                                                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-relaxed mb-3">{renderTextWithFractions(q.text)}</h4>
                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                                                    {q.options?.map(opt => (
                                                                                        <div key={opt.label} className={`flex items-start gap-2 text-xs font-medium p-1.5 rounded-lg ${opt.label === q.correctAnswer
                                                                                            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20'
                                                                                            : 'text-slate-500'
                                                                                            }`}>
                                                                                            <span className="opacity-50 font-black shrink-0">{opt.label}.</span>
                                                                                            <span className="break-words">{renderTextWithFractions(opt.value)}</span>
                                                                                            {opt.label === q.correctAnswer && (
                                                                                                <span className="material-symbols-outlined text-sm ml-auto text-emerald-500 shrink-0">check_circle</span>
                                                                                            )}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    {/* Inline pagination per group */}
                                                                    {meta.totalPages > 1 && (
                                                                        <div className="px-5 py-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                                                                            <span className="text-[10px] font-black text-slate-400 uppercase">
                                                                                Page {meta.page} / {meta.totalPages}
                                                                            </span>
                                                                            <div className="flex gap-1.5">
                                                                                <button
                                                                                    onClick={() => loadGroupQuestions(subject, difficulty, meta.page - 1)}
                                                                                    disabled={meta.page === 1 || meta.loading}
                                                                                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 disabled:opacity-30 hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center"
                                                                                >
                                                                                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => loadGroupQuestions(subject, difficulty, meta.page + 1)}
                                                                                    disabled={meta.page === meta.totalPages || meta.loading}
                                                                                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 disabled:opacity-30 hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center"
                                                                                >
                                                                                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ---- Right: Addition Interface ---- */}
                <div className="lg:col-span-2 space-y-6 sticky top-24">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none overflow-hidden">
                        <div className="flex border-b border-slate-100 dark:border-slate-800 p-2 gap-1 bg-slate-50/50 dark:bg-slate-800/50">
                            <button onClick={() => setActiveTab('single')} className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'single' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                                Single Item
                            </button>
                            <button onClick={() => setActiveTab('bulk')} className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'bulk' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                                Bulk Import
                            </button>
                        </div>

                        <div className="p-6 md:p-8">
                            {activeTab === 'single' ? (
                                <form onSubmit={handleCreateSingle} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Question Body</label>
                                        <textarea name="text" value={singleForm.text} onChange={handleSingleChange} required rows={3}
                                            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none resize-none"
                                            placeholder="Enter the question text here..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Board</label>
                                            <select name="board" value={singleForm.board} onChange={handleSingleChange}
                                                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold focus:border-indigo-500 transition-all outline-none appearance-none">
                                                <option value="General">General</option>
                                                <option value="CBSE">CBSE</option>
                                                <option value="ICSE">ICSE</option>
                                                <option value="State Board">State Board</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Class</label>
                                            <select name="class" value={singleForm.class} onChange={handleSingleChange}
                                                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold focus:border-indigo-500 transition-all outline-none appearance-none">
                                                <option value="General">General</option>
                                                <option value="Class 5">Class 5</option>
                                                <option value="Class 6">Class 6</option>
                                                <option value="Class 7">Class 7</option>
                                                <option value="Class 8">Class 8</option>
                                                <option value="Class 9">Class 9</option>
                                                <option value="Class 10">Class 10</option>
                                                <option value="Class 11">Class 11</option>
                                                <option value="Class 12">Class 12</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Subject</label>
                                            <input name="subject" value={singleForm.subject} onChange={handleSingleChange} required
                                                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold focus:border-indigo-500 transition-all outline-none"
                                                placeholder="Math, Bio, etc." />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Difficulty</label>
                                            <select name="difficulty" value={singleForm.difficulty} onChange={handleSingleChange}
                                                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold focus:border-indigo-500 transition-all outline-none appearance-none">
                                                <option value="easy">Easy</option>
                                                <option value="medium">Medium</option>
                                                <option value="hard">Hard</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Response Options</label>
                                        <div className="grid grid-cols-1 gap-3">
                                            {singleForm.options.map((opt, idx) => (
                                                <div key={opt.label} className="flex items-center gap-3">
                                                    <span className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0 uppercase tracking-tighter">{opt.label}</span>
                                                    <input value={opt.value} onChange={(e) => handleOptionChange(idx, e.target.value)} required
                                                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 text-xs font-bold focus:border-indigo-500 transition-all outline-none"
                                                        placeholder={`Content for Option ${opt.label}`} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1 pt-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Correct Answer</label>
                                        <div className="flex gap-2">
                                            {['A', 'B', 'C', 'D'].map(label => (
                                                <button key={label} type="button" onClick={() => setSingleForm(prev => ({ ...prev, correctAnswer: label }))}
                                                    className={`flex-1 py-3 rounded-xl border-2 font-black text-sm transition-all ${singleForm.correctAnswer === label ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-emerald-300'}`}>
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button type="submit" disabled={saving} className="w-full mt-4 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                                        {saving ? 'Saving...' : 'Commit to Bank'}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleBulkUpload} className="space-y-4">
                                    <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100 dark:border-amber-500/20 mb-4">
                                        <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">info</span> Schema Insight
                                        </p>
                                        <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium leading-relaxed">
                                            An array of objects. Labels must match <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded font-bold">correctAnswer</code>.
                                        </p>
                                        <div className="mt-2 text-[10px] bg-white/50 dark:bg-black/20 p-2 rounded-lg font-mono text-slate-600 dark:text-slate-400">
                                            {'[{ "text": "...", "options": [{"label":"A","value":"..."}], "correctAnswer": "A", "difficulty": "easy", "subject": "Math", "board": "CBSE", "class": "Class 10" }]'}
                                        </div>
                                    </div>
                                    <textarea rows={10} value={bulkText} onChange={(e) => setBulkText(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-[11px] font-mono text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:border-indigo-500 transition-all outline-none resize-none"
                                        placeholder='[{"text": "Sample question?", "options": [...], "correctAnswer": "A"}]'
                                    />
                                    <button type="submit" disabled={saving || !bulkText} className="w-full mt-2 py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-black text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                                        {saving ? 'Processing Batch...' : 'Initiate Bulk Load'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
