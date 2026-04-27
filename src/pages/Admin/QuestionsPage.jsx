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

    const defaultMCQOptions = [
        { label: "A", value: "" },
        { label: "B", value: "" },
        { label: "C", value: "" },
        { label: "D", value: "" },
    ];

    const [singleForm, setSingleForm] = useState({
        text: "",
        subject: "",
        difficulty: "easy",
        board: "General",
        class: "General",
        type: "mcq",
        options: defaultMCQOptions,
        correctAnswer: "",
        imageUrl: "",
    });

    const [imageUploading, setImageUploading] = useState(false);

    const [bulkText, setBulkText] = useState("");

    // Edit modal state
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [editSaving, setEditSaving] = useState(false);
    const [editImageUploading, setEditImageUploading] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

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
        setSingleForm(prev => {
            const next = { ...prev, [name]: value };
            if (name === "type") {
                next.correctAnswer = "";
                next.options = value === "mcq" ? defaultMCQOptions : [];
            }
            return next;
        });
    };

    const handleOptionChange = (index, value) => {
        setSingleForm((prev) => {
            const next = [...prev.options];
            next[index] = { ...next[index], value };
            return { ...prev, options: next };
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageUploading(true);
        try {
            const formData = new FormData();
            formData.append("image", file);
            const { data } = await api.post("/admin/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setSingleForm(prev => ({ ...prev, imageUrl: data.url }));
            showToast("Image uploaded", "success");
        } catch (err) {
            showToast(err.response?.data?.message || "Image upload failed", "error");
        } finally {
            setImageUploading(false);
        }
    };

    const handleCreateSingle = async (e) => {
        e.preventDefault();
        setSaving(true);
        const subjectAtSubmit = singleForm.subject;
        const difficultyAtSubmit = singleForm.difficulty;
        try {
            const payload = {
                ...singleForm,
                options: singleForm.type === "tita" ? [] : singleForm.options,
            };
            await api.post('/admin/questions', payload);
            showToast('Question added to bank', 'success');
            setSingleForm({
                text: "", subject: "", difficulty: "easy", board: singleForm.board, class: singleForm.class,
                type: singleForm.type,
                options: singleForm.type === "mcq" ? defaultMCQOptions : [],
                correctAnswer: "",
                imageUrl: "",
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

    // ---------- Edit / Delete ----------
    const openEditModal = (q) => {
        setEditingQuestion(q);
        setEditForm({
            text: q.text || "",
            subject: q.subject || "",
            difficulty: q.difficulty || "easy",
            board: q.board || "General",
            class: q.class || "General",
            type: q.type || "mcq",
            options: q.type === "mcq"
                ? (q.options?.length ? q.options.map(o => ({ label: o.label, value: o.value })) : defaultMCQOptions)
                : [],
            correctAnswer: q.correctAnswer || "",
            imageUrl: q.imageUrl || "",
        });
    };

    const closeEditModal = () => {
        if (editSaving) return;
        setEditingQuestion(null);
        setEditForm(null);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => {
            const next = { ...prev, [name]: value };
            if (name === "type") {
                next.correctAnswer = "";
                next.options = value === "mcq"
                    ? (prev.options?.length ? prev.options : defaultMCQOptions)
                    : [];
            }
            return next;
        });
    };

    const handleEditOptionChange = (index, value) => {
        setEditForm(prev => {
            const next = [...prev.options];
            next[index] = { ...next[index], value };
            return { ...prev, options: next };
        });
    };

    const handleEditImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setEditImageUploading(true);
        try {
            const formData = new FormData();
            formData.append("image", file);
            const { data } = await api.post("/admin/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setEditForm(prev => ({ ...prev, imageUrl: data.url }));
            showToast("Image uploaded", "success");
        } catch (err) {
            showToast(err.response?.data?.message || "Image upload failed", "error");
        } finally {
            setEditImageUploading(false);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editingQuestion || !editForm) return;
        setEditSaving(true);
        const originalKey = `${editingQuestion.subject}||${editingQuestion.difficulty}`;
        const newKey = `${editForm.subject}||${editForm.difficulty}`;
        try {
            const payload = {
                ...editForm,
                options: editForm.type === "tita" ? [] : editForm.options,
            };
            const { data } = await api.patch(`/admin/questions/${editingQuestion._id}`, payload);
            showToast("Question updated", "success");

            const updated = data.question;
            const groupCategoryChanged =
                originalKey !== newKey ||
                editingQuestion.board !== updated.board ||
                editingQuestion.class !== updated.class;

            // Update local cache
            setGroupQuestions(prev => {
                const next = { ...prev };
                // Remove from original group
                if (next[originalKey]) {
                    next[originalKey] = next[originalKey].filter(x => x._id !== updated._id);
                }
                // Insert into new group if currently loaded; else invalidate so it lazy-loads fresh
                if (!groupCategoryChanged && next[originalKey]) {
                    next[originalKey] = [updated, ...next[originalKey].filter(x => x._id !== updated._id)];
                } else if (next[newKey]) {
                    next[newKey] = [updated, ...next[newKey].filter(x => x._id !== updated._id)];
                }
                return next;
            });

            if (groupCategoryChanged) loadSummary();
            closeEditModal();
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to update question", "error");
        } finally {
            setEditSaving(false);
        }
    };

    const requestDelete = (q) => setDeleteTarget(q);

    const cancelDelete = () => {
        if (deleting) return;
        setDeleteTarget(null);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const q = deleteTarget;
        setDeleting(true);
        try {
            await api.delete(`/admin/questions/${q._id}`);
            showToast("Question deleted", "success");
            const key = `${q.subject}||${q.difficulty}`;
            setGroupQuestions(prev => {
                const next = { ...prev };
                if (next[key]) next[key] = next[key].filter(x => x._id !== q._id);
                return next;
            });
            loadSummary();
            setDeleteTarget(null);
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to delete question", "error");
        } finally {
            setDeleting(false);
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
                                                                                <div className="flex items-start gap-2 mb-2">
                                                                                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-relaxed flex-1">{renderTextWithFractions(q.text)}</h4>
                                                                                    {q.type === "tita" && (
                                                                                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20 shrink-0 mt-0.5">TITA</span>
                                                                                    )}
                                                                                    <div className="flex items-center gap-0.5 shrink-0">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => openEditModal(q)}
                                                                                            title="Edit question"
                                                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                                                                                        >
                                                                                            <span className="material-symbols-outlined text-[16px]">edit</span>
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => requestDelete(q)}
                                                                                            title="Delete question"
                                                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                                                                        >
                                                                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                                {q.imageUrl && (
                                                                                    <div className="mb-2 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                                                                        <img
                                                                                            src={q.imageUrl}
                                                                                            alt="Question illustration"
                                                                                            className="w-full max-h-48 object-contain p-1.5"
                                                                                            loading="lazy"
                                                                                        />
                                                                                    </div>
                                                                                )}
                                                                                {q.type === "tita" ? (
                                                                                    <div className="flex items-center gap-2 text-xs font-medium p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                                                                        <span className="material-symbols-outlined text-sm text-emerald-500 shrink-0">check_circle</span>
                                                                                        <span>Answer: <span className="font-black">{q.correctAnswer}</span></span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                                                        {q.options?.map(opt => (
                                                                                            <div key={opt.label} className={`flex items-start gap-2 text-xs font-medium p-1.5 rounded-lg ${opt.label === q.correctAnswer
                                                                                                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20'
                                                                                                : 'text-slate-500'
                                                                                                }`}>
                                                                                                <span className="opacity-50 font-black shrink-0">{opt.label}.</span>
                                                                                                <span className="wrap-break-word">{renderTextWithFractions(opt.value)}</span>
                                                                                                {opt.label === q.correctAnswer && (
                                                                                                    <span className="material-symbols-outlined text-sm ml-auto text-emerald-500 shrink-0">check_circle</span>
                                                                                                )}
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
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

                                    {/* Image Upload */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                                            Question Image <span className="normal-case font-medium text-slate-400">(optional)</span>
                                        </label>

                                        {singleForm.imageUrl ? (
                                            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                                <img
                                                    src={singleForm.imageUrl}
                                                    alt="Question"
                                                    className="w-full max-h-48 object-contain p-2"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setSingleForm(prev => ({ ...prev, imageUrl: "" }))}
                                                    className="absolute top-2 right-2 size-7 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <label className={`flex flex-col items-center justify-center gap-2 w-full py-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all
                                                ${imageUploading
                                                    ? 'border-indigo-300 bg-indigo-50/50 dark:bg-indigo-500/5'
                                                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5'
                                                }`}>
                                                {imageUploading ? (
                                                    <>
                                                        <div className="animate-spin size-6 border-[3px] border-indigo-500 border-t-transparent rounded-full"></div>
                                                        <span className="text-xs font-bold text-indigo-500">Uploading...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-[28px] text-slate-400">add_photo_alternate</span>
                                                        <span className="text-xs font-bold text-slate-400">Click to upload image</span>
                                                        <span className="text-[10px] text-slate-400">JPEG, PNG, WebP · Max 5 MB</span>
                                                    </>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                                    className="hidden"
                                                    disabled={imageUploading}
                                                    onChange={handleImageUpload}
                                                />
                                            </label>
                                        )}
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

                                    {/* Answer Type Selector */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Response Options</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { value: "mcq", label: "MCQ", icon: "radio_button_checked", desc: "Multiple choice" },
                                                { value: "tita", label: "TITA", icon: "keyboard", desc: "Type in the answer" },
                                            ].map(({ value, label, icon, desc }) => (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    onClick={() => handleSingleChange({ target: { name: "type", value } })}
                                                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 font-black text-xs transition-all ${singleForm.type === value
                                                        ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-indigo-300'}`}
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">{icon}</span>
                                                    <span className="uppercase tracking-widest">{label}</span>
                                                    <span className={`text-[9px] font-medium normal-case ${singleForm.type === value ? 'text-indigo-400' : 'text-slate-400'}`}>{desc}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* MCQ: A–D option inputs */}
                                    {singleForm.type === "mcq" && (
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
                                    )}

                                    {/* Correct Answer */}
                                    <div className="space-y-1 pt-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Correct Answer</label>
                                        {singleForm.type === "mcq" ? (
                                            <div className="flex gap-2">
                                                {['A', 'B', 'C', 'D'].map(label => (
                                                    <button key={label} type="button" onClick={() => setSingleForm(prev => ({ ...prev, correctAnswer: label }))}
                                                        className={`flex-1 py-3 rounded-xl border-2 font-black text-sm transition-all ${singleForm.correctAnswer === label ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-emerald-300'}`}>
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <input
                                                name="correctAnswer"
                                                value={singleForm.correctAnswer}
                                                onChange={handleSingleChange}
                                                required
                                                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                                placeholder="e.g. 42 or Paris (exact match)"
                                            />
                                        )}
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

            {/* ---- Delete Confirmation Modal ---- */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 animate-in fade-in duration-200" onClick={cancelDelete}>
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-500 rounded-full flex shrink-0">
                                <span className="material-symbols-outlined">delete</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Delete Question?</h3>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                            This action cannot be undone. The question will be permanently removed from the bank.
                        </p>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl p-3 mb-6 line-clamp-3 leading-relaxed">
                            "{deleteTarget.text}"
                        </div>
                        <div className="flex justify-end gap-3 w-full">
                            <button
                                type="button"
                                onClick={cancelDelete}
                                disabled={deleting}
                                className="flex-1 px-4 py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all border-none cursor-pointer disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="flex-1 px-4 py-3 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-lg shadow-rose-600/30 border-none cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {deleting && (
                                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                                )}
                                {deleting ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ---- Edit Modal ---- */}
            {editingQuestion && editForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={closeEditModal}>
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
                    >
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="size-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-[20px]">edit</span>
                                </div>
                                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Edit Question</h2>
                            </div>
                            <button
                                type="button"
                                onClick={closeEditModal}
                                disabled={editSaving}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors disabled:opacity-40"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="overflow-y-auto custom-scrollbar p-6 space-y-4 flex-1">
                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Question Body</label>
                                <textarea name="text" value={editForm.text} onChange={handleEditChange} required rows={3}
                                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none resize-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                                    Question Image <span className="normal-case font-medium text-slate-400">(optional)</span>
                                </label>
                                {editForm.imageUrl ? (
                                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                        <img src={editForm.imageUrl} alt="Question" className="w-full max-h-48 object-contain p-2" />
                                        <button
                                            type="button"
                                            onClick={() => setEditForm(prev => ({ ...prev, imageUrl: "" }))}
                                            className="absolute top-2 right-2 size-7 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg transition-all"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                        </button>
                                    </div>
                                ) : (
                                    <label className={`flex flex-col items-center justify-center gap-2 w-full py-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all
                                        ${editImageUploading
                                            ? 'border-indigo-300 bg-indigo-50/50 dark:bg-indigo-500/5'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5'
                                        }`}>
                                        {editImageUploading ? (
                                            <>
                                                <div className="animate-spin size-6 border-[3px] border-indigo-500 border-t-transparent rounded-full"></div>
                                                <span className="text-xs font-bold text-indigo-500">Uploading...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[28px] text-slate-400">add_photo_alternate</span>
                                                <span className="text-xs font-bold text-slate-400">Click to upload image</span>
                                                <span className="text-[10px] text-slate-400">JPEG, PNG, WebP · Max 5 MB</span>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/webp"
                                            className="hidden"
                                            disabled={editImageUploading}
                                            onChange={handleEditImageUpload}
                                        />
                                    </label>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Board</label>
                                    <select name="board" value={editForm.board} onChange={handleEditChange}
                                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold focus:border-indigo-500 transition-all outline-none appearance-none">
                                        <option value="General">General</option>
                                        <option value="CBSE">CBSE</option>
                                        <option value="ICSE">ICSE</option>
                                        <option value="State Board">State Board</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Class</label>
                                    <select name="class" value={editForm.class} onChange={handleEditChange}
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
                                    <input name="subject" value={editForm.subject} onChange={handleEditChange} required
                                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold focus:border-indigo-500 transition-all outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Difficulty</label>
                                    <select name="difficulty" value={editForm.difficulty} onChange={handleEditChange}
                                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold focus:border-indigo-500 transition-all outline-none appearance-none">
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Response Options</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { value: "mcq", label: "MCQ", icon: "radio_button_checked", desc: "Multiple choice" },
                                        { value: "tita", label: "TITA", icon: "keyboard", desc: "Type in the answer" },
                                    ].map(({ value, label, icon, desc }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => handleEditChange({ target: { name: "type", value } })}
                                            className={`flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 font-black text-xs transition-all ${editForm.type === value
                                                ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-indigo-300'}`}
                                        >
                                            <span className="material-symbols-outlined text-[20px]">{icon}</span>
                                            <span className="uppercase tracking-widest">{label}</span>
                                            <span className={`text-[9px] font-medium normal-case ${editForm.type === value ? 'text-indigo-400' : 'text-slate-400'}`}>{desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {editForm.type === "mcq" && (
                                <div className="grid grid-cols-1 gap-3">
                                    {editForm.options.map((opt, idx) => (
                                        <div key={opt.label} className="flex items-center gap-3">
                                            <span className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0 uppercase tracking-tighter">{opt.label}</span>
                                            <input value={opt.value} onChange={(e) => handleEditOptionChange(idx, e.target.value)} required
                                                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 text-xs font-bold focus:border-indigo-500 transition-all outline-none"
                                                placeholder={`Content for Option ${opt.label}`} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-1 pt-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Correct Answer</label>
                                {editForm.type === "mcq" ? (
                                    <div className="flex gap-2">
                                        {['A', 'B', 'C', 'D'].map(label => (
                                            <button key={label} type="button" onClick={() => setEditForm(prev => ({ ...prev, correctAnswer: label }))}
                                                className={`flex-1 py-3 rounded-xl border-2 font-black text-sm transition-all ${editForm.correctAnswer === label ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-emerald-300'}`}>
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <input
                                        name="correctAnswer"
                                        value={editForm.correctAnswer}
                                        onChange={handleEditChange}
                                        required
                                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                        placeholder="e.g. 42 or Paris (exact match)"
                                    />
                                )}
                            </div>
                        </form>

                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                            <button
                                type="button"
                                onClick={closeEditModal}
                                disabled={editSaving}
                                className="px-5 py-2.5 rounded-xl text-sm font-black text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleEditSubmit}
                                disabled={editSaving}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-60 flex items-center gap-2"
                            >
                                {editSaving && (
                                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                                )}
                                {editSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
