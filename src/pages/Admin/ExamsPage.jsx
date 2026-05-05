import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';

export default function ExamsPage() {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [exams, setExams] = useState([]);
    const [stats, setStats] = useState({ total: 0, live: 0, upcoming: 0, completed: 0 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedExam, setSelectedExam] = useState(null);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [examSubjects, setExamSubjects] = useState([{ subject: '', count: '' }]);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const [form, setForm] = useState({
        title: '',
        board: 'General',
        class: 'General',
        totalQuestions: 50,
        easy: 30,
        medium: 40,
        hard: 30,
        durationMinutes: 60,
        schedulingType: 'fixed',
        startTime: '',
        endTime: '',
    });

    const loadExams = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/admin/exams');
            setExams(data.data || []);
            if (data.stats) setStats(data.stats);
        } catch (err) {
            showToast('Error fetching exams', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadExams();
    }, []);

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const res = await api.get(`/admin/questions/summary?board=${form.board}&class=${form.class}`);
                setAvailableSubjects(res.data?.data || []);
            } catch (e) {
                setAvailableSubjects([]);
            }
        };
        fetchSubjects();
    }, [form.board, form.class]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: (name === 'title' || name === 'startTime' || name === 'endTime' || name === 'schedulingType' || name === 'board' || name === 'class')
                ? value
                : (value === '' ? '' : Number(value))
        }));
    };

    const handleSchedulingTypeChange = (type) => {
        setForm(prev => ({ ...prev, schedulingType: type, endTime: '' }));
    };

    const handleSubjectChange = (idx, field, value) => {
        setExamSubjects(prev => {
            const next = [...prev];
            next[idx][field] = value;
            return next;
        });
    };

    const handleRemoveSubject = (idx) => {
        setExamSubjects(prev => prev.filter((_, i) => i !== idx));
    };

    const handleCreate = async (e) => {
        e.preventDefault();

        const easy = Number(form.easy) || 0;
        const medium = Number(form.medium) || 0;
        const hard = Number(form.hard) || 0;

        if (easy + medium + hard !== 100) {
            showToast('Difficulty distribution must sum to 100%', 'error');
            return;
        }

        if (examSubjects.length === 0) {
            showToast('Please add at least one subject', 'error');
            return;
        }

        const subjectsPayload = examSubjects.filter(s => s.subject && s.count).map(s => ({
            subject: s.subject,
            count: Number(s.count)
        }));

        const calculatedTotal = subjectsPayload.reduce((sum, s) => sum + s.count, 0);

        if (form.schedulingType === 'range' && !form.endTime) {
            showToast('End time is required for time-range exams', 'error');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                title: form.title,
                board: form.board,
                class: form.class,
                totalQuestions: calculatedTotal,
                difficultyDistribution: {
                    easy: Number(form.easy) || 0,
                    medium: Number(form.medium) || 0,
                    hard: Number(form.hard) || 0
                },
                subjects: subjectsPayload,
                durationMinutes: Number(form.durationMinutes) || 0,
                schedulingType: form.schedulingType,
                startTime: form.startTime,
                endTime: form.schedulingType === 'range' ? form.endTime : undefined,
            };

            if (selectedExam) {
                await api.patch(`/admin/exams/${selectedExam._id}`, payload);
                showToast('Exam updated successfully', 'success');
            } else {
                await api.post('/admin/exams', payload);
                showToast('Exam published successfully!', 'success');
            }

            resetForm();
            setIsCreateModalOpen(false);
            loadExams();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to save exam', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (exam) => {
        setDeleteTarget(exam);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api.delete(`/admin/exams/${deleteTarget._id}`);
            showToast('Exam deleted successfully', 'success');
            setDeleteTarget(null);
            loadExams();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to delete exam', 'error');
        } finally {
            setDeleting(false);
        }
    };

    const cancelDelete = () => {
        setDeleteTarget(null);
    };

    const openEditModal = (exam) => {
        setSelectedExam(exam);
        setForm({
            title: exam.title,
            board: exam.board,
            class: exam.class,
            easy: exam.distribution?.easy || 0,
            medium: exam.distribution?.medium || 0,
            hard: exam.distribution?.hard || 0,
            durationMinutes: exam.duration || 0,
            schedulingType: exam.schedulingType || 'fixed',
            startTime: exam.startTime ? new Date(exam.startTime).toISOString().slice(0, 16) : '',
            endTime: exam.endTime ? new Date(exam.endTime).toISOString().slice(0, 16) : '',
        });
        setExamSubjects(exam.subjects?.length ? exam.subjects : [{ subject: '', count: '' }]);
        setIsCreateModalOpen(true);
    };

    const handleClone = (exam) => {
        setForm({
            title: `Copy of ${exam.title}`,
            board: exam.board,
            class: exam.class,
            easy: exam.distribution?.easy || 0,
            medium: exam.distribution?.medium || 0,
            hard: exam.distribution?.hard || 0,
            durationMinutes: exam.duration || 0,
            schedulingType: exam.schedulingType || 'fixed',
            startTime: '',
            endTime: '',
        });
        setExamSubjects(exam.subjects?.length ? exam.subjects : [{ subject: '', count: '' }]);
        setSelectedExam(null);
        setIsCreateModalOpen(true);
        showToast('Exam data cloned. Adjust settings and publish.', 'info');
    };

    const viewResults = (exam) => {
        navigate('/admin/evaluation', { state: { examId: exam._id } });
    };

    const resetForm = () => {
        setSelectedExam(null);
        setForm({
            title: '',
            board: 'General',
            class: 'General',
            easy: 30,
            medium: 40,
            hard: 30,
            durationMinutes: 60,
            schedulingType: 'fixed',
            startTime: '',
            endTime: '',
        });
        setExamSubjects([{ subject: '', count: '' }]);
    };

    const filteredExams = exams.filter(exam => {
        const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase());
        const now = new Date();
        const start = new Date(exam.startTime);
        const end = exam.endTime ? new Date(exam.endTime) : new Date(start.getTime() + (exam.durationMinutes || exam.duration) * 60000);

        const isLive = now >= start && now <= end;
        const isUpcoming = now < start;
        const isCompleted = now > end;

        if (activeTab === 'live') return matchesSearch && isLive;
        if (activeTab === 'scheduled') return matchesSearch && isUpcoming;
        if (activeTab === 'past') return matchesSearch && isCompleted;
        return matchesSearch;
    });

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Exams Management</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Design, schedule, and monitor your enterprise examinations.</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined">add_circle</span>
                    Create New Exam
                </button>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard title="Active Exams" value={stats.live} icon="sensors" color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-500/10" />
                <StatCard title="Scheduled" value={stats.upcoming} icon="calendar_today" color="text-orange-500" bg="bg-orange-50 dark:bg-orange-500/10" />
                <StatCard title="Completed" value={stats.completed} icon="task_alt" color="text-slate-500" bg="bg-slate-50 dark:bg-slate-500/10" />
                <StatCard title="Total Volume" value={stats.total} icon="account_tree" color="text-amber-500" bg="bg-amber-50 dark:bg-amber-500/10" />
            </div>

            {/* List Header & Controls */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
                <div className="px-6 py-6 border-b border-slate-100 dark:border-slate-800 space-y-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Tabs */}
                        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                            {['all', 'live', 'scheduled', 'past'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === tab
                                            ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Search & Bulk Actions */}
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1 lg:min-w-[300px]">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                                <input
                                    type="text"
                                    placeholder="Search exams by title..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Exam List Body */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Exam Details</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Distribution</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Timeline</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-20 text-center">
                                        <div className="animate-spin size-10 border-4 border-orange-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                        <p className="text-sm font-bold text-slate-500">Syncing database...</p>
                                    </td>
                                </tr>
                            ) : filteredExams.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                                        No matching records found.
                                    </td>
                                </tr>
                            ) : (
                                filteredExams.map((exam, index) => {
                                    const status = getExamStatus(exam);
                                    const isLastFew = index >= filteredExams.length - 2 && filteredExams.length > 2;
                                    return (
                                        <tr key={exam._id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`size-12 rounded-xl flex items-center justify-center transition-all ${status === 'Live' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                        <span className="material-symbols-outlined text-2xl">{status === 'Live' ? 'bolt' : 'assignment'}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">{exam.title}</p>
                                                        <div className="flex items-center gap-3 mt-0.5">
                                                            <span className="text-[10px] font-black text-orange-500 uppercase">{exam.board}</span>
                                                            <span className="size-1 bg-slate-200 dark:bg-slate-700 rounded-full"></span>
                                                            <span className="text-[10px] font-black text-slate-400 uppercase">{exam.class}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${status === 'Live' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : status === 'Upcoming' ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="space-y-2 max-w-[120px]">
                                                    <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
                                                        <span>{exam.totalQuestions} Questions</span>
                                                        <span>{exam.duration}m</span>
                                                    </div>
                                                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                                                        <div style={{ width: `${exam.distribution?.easy || 0}%` }} className="h-full bg-emerald-500"></div>
                                                        <div style={{ width: `${exam.distribution?.medium || 0}%` }} className="h-full bg-amber-500"></div>
                                                        <div style={{ width: `${exam.distribution?.hard || 0}%` }} className="h-full bg-rose-500"></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{new Date(exam.startTime).toLocaleDateString()}</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">{new Date(exam.startTime).toLocaleTimeString()}</p>
                                            </td>
                                            <td className="px-8 py-6 text-right relative">
                                                <button 
                                                    onClick={() => setActiveMenuId(activeMenuId === exam._id ? null : exam._id)}
                                                    className={`p-2 rounded-lg text-slate-400 transition-colors ${activeMenuId === exam._id ? 'bg-slate-100 dark:bg-slate-800 text-orange-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                                >
                                                    <span className="material-symbols-outlined">more_vert</span>
                                                </button>

                                                {activeMenuId === exam._id && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)}></div>
                                                        <div className={`absolute right-8 ${isLastFew ? 'bottom-16' : 'top-16'} w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 z-20 animate-in fade-in zoom-in-95 duration-200`}>
                                                            <button 
                                                                onClick={() => { openEditModal(exam); setActiveMenuId(null); }}
                                                                className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-lg text-orange-500">edit</span>
                                                                Edit Exam
                                                            </button>
                                                            <button 
                                                                onClick={() => { viewResults(exam); setActiveMenuId(null); }}
                                                                className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-lg text-emerald-500">analytics</span>
                                                                View Results
                                                            </button>
                                                            <button 
                                                                onClick={() => { handleClone(exam); setActiveMenuId(null); }}
                                                                className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-lg text-amber-500">content_copy</span>
                                                                Clone Exam
                                                            </button>
                                                            <div className="my-1 border-t border-slate-100 dark:border-slate-700"></div>
                                                            <button 
                                                                onClick={() => { handleDelete(exam); setActiveMenuId(null); }}
                                                                className="w-full px-4 py-2.5 text-left text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-3 transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">delete</span>
                                                                Delete Exam
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Creation Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto pt-20 pb-20">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300 my-auto">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 z-10 backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                <div className="size-10 bg-orange-600 rounded-xl flex items-center justify-center text-white">
                                    <span className="material-symbols-outlined">rocket_launch</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                                        {selectedExam ? 'Update Exam' : 'Design New Exam'}
                                    </h2>
                                    <p className="text-xs font-bold text-slate-400 mt-1">
                                        {selectedExam ? `Editing: ${selectedExam.title}` : 'Configure your enterprise assessment'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-all text-slate-400"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-8 max-h-[70vh] overflow-y-auto">
                            <form onSubmit={handleCreate} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Exam Title</label>
                                        <input
                                            name="title"
                                            value={form.title}
                                            onChange={handleChange}
                                            required
                                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none"
                                            placeholder="e.g. Science Mid-term 2024"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Board</label>
                                            <select name="board" value={form.board} onChange={handleChange} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3.5 text-sm font-bold focus:border-orange-500 transition-all outline-none">
                                                <option value="General">General</option>
                                                <option value="CBSE">CBSE</option>
                                                <option value="ICSE">ICSE</option>
                                                <option value="State Board">State Board</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Class</label>
                                            <select name="class" value={form.class} onChange={handleChange} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3.5 text-sm font-bold focus:border-orange-500 transition-all outline-none">
                                                <option value="General">General</option>
                                                {['5', '6', '7', '8', '9', '10', '11', '12'].map(c => <option key={c} value={`Class ${c}`}>Class {c}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Subjects Section */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Subjects & Question Counts</label>
                                            <button
                                                type="button"
                                                onClick={() => setExamSubjects([...examSubjects, { subject: '', count: '' }])}
                                                className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest flex items-center gap-1 hover:underline"
                                            >
                                                <span className="material-symbols-outlined text-sm">add</span>
                                                Add Subject
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {examSubjects.map((s, idx) => (
                                                <div key={idx} className="flex gap-2 animate-in slide-in-from-right-2 duration-300">
                                                    <select
                                                        value={s.subject}
                                                        onChange={(e) => handleSubjectChange(idx, 'subject', e.target.value)}
                                                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold focus:border-orange-500 transition-all outline-none"
                                                    >
                                                        <option value="">Select Subject</option>
                                                        {availableSubjects.map(sub => (
                                                            <option key={sub.subject} value={sub.subject}>{sub.subject} ({sub.total} Qs)</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="number"
                                                        placeholder="Qty"
                                                        value={s.count}
                                                        onChange={(e) => handleSubjectChange(idx, 'count', e.target.value)}
                                                        className="w-24 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold focus:border-orange-500 transition-all outline-none"
                                                    />
                                                    {examSubjects.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveSubject(idx)}
                                                            className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                                                        >
                                                            <span className="material-symbols-outlined text-xl">delete</span>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Duration (min)</label>
                                            <input type="number" name="durationMinutes" value={form.durationMinutes} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3.5 text-sm font-bold focus:border-orange-500 transition-all outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Scheduling</label>
                                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                                <button type="button" onClick={() => handleSchedulingTypeChange('fixed')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${form.schedulingType === 'fixed' ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-white shadow-sm' : 'text-slate-400'}`}>Fixed</button>
                                                <button type="button" onClick={() => handleSchedulingTypeChange('range')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${form.schedulingType === 'range' ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-white shadow-sm' : 'text-slate-400'}`}>Range</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Difficulty Weight (%)</label>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${form.easy + form.medium + form.hard === 100 ? 'text-emerald-500 bg-emerald-50' : 'text-rose-500 bg-rose-50'}`}>{form.easy + form.medium + form.hard}/100</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            {['easy', 'medium', 'hard'].map(d => (
                                                <div key={d} className="space-y-1 text-center">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase">{d}</p>
                                                    <input type="number" name={d} value={form[d]} onChange={handleChange} className="w-full text-center py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-lg text-xs font-black focus:border-orange-500 outline-none transition-all" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Start Time</label>
                                        <input type="datetime-local" name="startTime" value={form.startTime} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3.5 text-sm font-bold focus:border-orange-500 outline-none" />
                                    </div>
                                    {form.schedulingType === 'range' && (
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase tracking-widest text-orange-400 ml-1">End Time</label>
                                            <input type="datetime-local" name="endTime" value={form.endTime} onChange={handleChange} required className="w-full rounded-xl border-2 border-orange-100 dark:border-orange-600 bg-orange-50/50 px-4 py-3.5 text-sm font-bold focus:border-orange-500 outline-none" />
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-[2] py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-60"
                                    >
                                        {saving ? 'Processing...' : selectedExam ? 'Update & Save' : 'Publish Exam'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={cancelDelete}
                    ></div>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800">
                        <div className="p-8 text-center">
                            <div className="size-20 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-6 animate-bounce">
                                <span className="material-symbols-outlined text-4xl">delete_forever</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Delete Exam?</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                You are about to delete <span className="text-rose-500 font-bold">"{deleteTarget.title}"</span>. 
                                This action is permanent and will remove all associated records.
                            </p>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
                            <button
                                onClick={cancelDelete}
                                className="flex-1 py-4 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="flex-[2] py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-rose-500/20 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {deleting ? (
                                    <>
                                        <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Deleting...
                                    </>
                                ) : (
                                    'Yes, Delete Exam'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const StatCard = ({ title, value, icon, color, bg }) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
        <div className="flex items-center justify-between mb-4">
            <div className={`size-10 ${bg} ${color} rounded-xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                <span className="material-symbols-outlined text-xl">{icon}</span>
            </div>
            <span className="material-symbols-outlined text-slate-300 text-lg">trending_up</span>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{value}</p>
    </div>
);

const getExamStatus = (exam) => {
    const now = new Date();
    const start = new Date(exam.startTime);
    const end = exam.endTime ? new Date(exam.endTime) : new Date(start.getTime() + (exam.durationMinutes || exam.duration) * 60000);

    if (now >= start && now <= end) return 'Live';
    if (now < start) return 'Upcoming';
    return 'Past';
};
