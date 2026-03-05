import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const emptyOption = { label: "", value: "" };

export default function QuestionsPage() {
    const { showToast } = useToast();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('single'); // 'single' or 'bulk'

    // Pagination State
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalRecords: 0
    });

    const [singleForm, setSingleForm] = useState({
        text: "",
        subject: "",
        difficulty: "easy",
        options: [
            { ...emptyOption, label: "A" },
            { ...emptyOption, label: "B" },
            { ...emptyOption, label: "C" },
            { ...emptyOption, label: "D" },
        ],
        correctAnswer: "",
    });

    const [bulkText, setBulkText] = useState("");

    const loadQuestions = async (page = 1) => {
        setLoading(true);
        try {
            const { data } = await api.get(`/admin/questions?page=${page}`);
            setQuestions(data.data || []);
            setPagination({
                currentPage: data.currentPage,
                totalPages: data.totalPages,
                totalRecords: data.totalRecords
            });
        } catch (err) {
            showToast('Failed to load question bank', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQuestions();
    }, []);

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
        try {
            await api.post('/admin/questions', singleForm);
            showToast('Question added to bank', 'success');
            setSingleForm({
                text: "",
                subject: "",
                difficulty: "easy",
                options: [
                    { ...emptyOption, label: "A" },
                    { ...emptyOption, label: "B" },
                    { ...emptyOption, label: "C" },
                    { ...emptyOption, label: "D" },
                ],
                correctAnswer: "",
            });
            loadQuestions(pagination.currentPage);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to save question';
            showToast(msg, 'error');
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
            loadQuestions(1);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Bulk upload failed';
            showToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    // Grouping Logic
    const groupedQuestions = questions.reduce((acc, q) => {
        const subject = q.subject || 'General';
        if (!acc[subject]) acc[subject] = [];
        acc[subject].push(q);
        return acc;
    }, {});

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Question Bank</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage and categorize your central library of assessment items.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

                {/* Question Inventory */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 pb-2 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[60vh]">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Inventory</h2>
                            <div className="flex items-center gap-2">
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                    {pagination.totalRecords} Items Total
                                </span>
                            </div>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1 overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="p-12 text-center">
                                    <div className="animate-spin size-8 border-3 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                    <p className="text-sm text-slate-500 font-bold">Accessing Vault...</p>
                                </div>
                            ) : questions.length === 0 ? (
                                <div className="p-12 text-center text-slate-500 font-bold">
                                    Your vault is empty. Add questions to get started.
                                </div>
                            ) : (
                                Object.entries(groupedQuestions).map(([subject, items]) => (
                                    <div key={subject}>
                                        <div className="px-6 py-2 bg-slate-50 dark:bg-slate-800/20 border-y border-slate-100 dark:border-slate-800">
                                            <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em]">{subject}</span>
                                        </div>
                                        {items.map((q) => (
                                            <div key={q._id} className="p-6 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${q.difficulty === 'hard' ? 'bg-rose-100 text-rose-600' :
                                                                q.difficulty === 'medium' ? 'bg-amber-100 text-amber-600' :
                                                                    'bg-emerald-100 text-emerald-600'
                                                                }`}>
                                                                {q.difficulty}
                                                            </span>
                                                        </div>
                                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 leading-relaxed">{q.text}</h4>
                                                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3">
                                                            {q.options?.map(opt => (
                                                                <div key={opt.label} className={`flex items-center gap-2 text-xs font-medium ${opt.label === q.correctAnswer ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-500'}`}>
                                                                    <span className="opacity-50 font-black">{opt.label}.</span>
                                                                    <span className="truncate">{opt.value}</span>
                                                                    {opt.label === q.correctAnswer && <span className="material-symbols-outlined text-sm">check_circle</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Pagination Controls */}
                        {pagination.totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Page {pagination.currentPage} of {pagination.totalPages}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => loadQuestions(pagination.currentPage - 1)}
                                        disabled={pagination.currentPage === 1 || loading}
                                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                                    </button>
                                    <button
                                        onClick={() => loadQuestions(pagination.currentPage + 1)}
                                        disabled={pagination.currentPage === pagination.totalPages || loading}
                                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Addition Interface */}
                <div className="lg:col-span-2 space-y-6 sticky top-24">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none overflow-hidden">
                        {/* Tabs */}
                        <div className="flex border-b border-slate-100 dark:border-slate-800 p-2 gap-1 bg-slate-50/50 dark:bg-slate-800/50">
                            <button
                                onClick={() => setActiveTab('single')}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'single' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            >
                                Single Item
                            </button>
                            <button
                                onClick={() => setActiveTab('bulk')}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'bulk' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            >
                                Bulk Import
                            </button>
                        </div>

                        <div className="p-6 md:p-8">
                            {activeTab === 'single' ? (
                                <form onSubmit={handleCreateSingle} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Question Body</label>
                                        <textarea
                                            name="text"
                                            value={singleForm.text}
                                            onChange={handleSingleChange}
                                            required
                                            rows={3}
                                            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none resize-none"
                                            placeholder="Enter the question text here..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Subject</label>
                                            <input
                                                name="subject"
                                                value={singleForm.subject}
                                                onChange={handleSingleChange}
                                                required
                                                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold focus:border-indigo-500 transition-all outline-none"
                                                placeholder="Math, Bio, etc."
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Difficulty</label>
                                            <select
                                                name="difficulty"
                                                value={singleForm.difficulty}
                                                onChange={handleSingleChange}
                                                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold focus:border-indigo-500 transition-all outline-none appearance-none"
                                            >
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
                                                    <span className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0 uppercase tracking-tighter">
                                                        {opt.label}
                                                    </span>
                                                    <input
                                                        value={opt.value}
                                                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                        required
                                                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 text-xs font-bold focus:border-indigo-500 transition-all outline-none"
                                                        placeholder={`Content for Option ${opt.label}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1 pt-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Correct Answer (Label Only)</label>
                                        <div className="flex gap-2">
                                            {['A', 'B', 'C', 'D'].map(label => (
                                                <button
                                                    key={label}
                                                    type="button"
                                                    onClick={() => setSingleForm(prev => ({ ...prev, correctAnswer: label }))}
                                                    className={`flex-1 py-3 rounded-xl border-2 font-black text-sm transition-all ${singleForm.correctAnswer === label
                                                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-emerald-300'}`}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full mt-4 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                    >
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
                                            Expects an array of objects. Labels must match <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded font-bold">correctAnswer</code>.
                                        </p>
                                        <div className="mt-2 text-[10px] bg-white/50 dark:bg-black/20 p-2 rounded-lg font-mono text-slate-600 dark:text-slate-400">
                                            {"{ \"text\": \"...\", \"options\": [{ \"label\": \"A\", \"value\": \"...\" }], \"correctAnswer\": \"A\", \"difficulty\": \"easy\", \"subject\": \"Math\" }"}
                                        </div>
                                    </div>
                                    <textarea
                                        rows={10}
                                        value={bulkText}
                                        onChange={(e) => setBulkText(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-[11px] font-mono text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:border-indigo-500 transition-all outline-none resize-none"
                                        placeholder='[{"text": "Sample question?", "options": [...], "correctAnswer": "A"}]'
                                    />
                                    <button
                                        type="submit"
                                        disabled={saving || !bulkText}
                                        className="w-full mt-2 py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-black text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                    >
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
