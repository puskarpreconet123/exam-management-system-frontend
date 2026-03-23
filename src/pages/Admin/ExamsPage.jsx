import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';

export default function ExamsPage() {
    const { showToast } = useToast();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [examSubjects, setExamSubjects] = useState([{ subject: '', count: '' }]);

    const [form, setForm] = useState({
        title: '',
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
        setError('');
        try {
            const [examsRes, subjectsRes] = await Promise.all([
                api.get('/admin/exams'),
                api.get('/admin/questions/summary').catch(() => ({ data: { data: [] } }))
            ]);
            setExams(examsRes.data.data || []);
            setAvailableSubjects(subjectsRes.data?.data || []);
        } catch (err) {
            setError('Failed to load exams');
            showToast('Error fetching exams', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadExams();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: (name === 'title' || name === 'startTime' || name === 'endTime' || name === 'schedulingType')
                ? value
                : Number(value)
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

        if (form.easy + form.medium + form.hard !== 100) {
            showToast('Difficulty distribution must sum to 100%', 'error');
            return;
        }

        if (examSubjects.length === 0) {
            showToast('Please add at least one subject', 'error');
            return;
        }

        const validSubjects = examSubjects.filter(s => s.subject && Number(s.count) > 0);
        if (validSubjects.length !== examSubjects.length) {
            showToast('Please select a subject and valid count for all added subjects', 'error');
            return;
        }

        const subjectsPayload = validSubjects.map(s => ({ subject: s.subject, count: Number(s.count) }));
        const calculatedTotal = subjectsPayload.reduce((sum, s) => sum + s.count, 0);

        if (form.schedulingType === 'range' && !form.endTime) {
            showToast('End time is required for time-range exams', 'error');
            return;
        }

        if (form.schedulingType === 'range' && new Date(form.endTime) <= new Date(form.startTime)) {
            showToast('End time must be after start time', 'error');
            return;
        }

        setSaving(true);
        try {
            await api.post('/admin/exams', {
                title: form.title,
                totalQuestions: calculatedTotal,
                difficultyDistribution: {
                    easy: form.easy,
                    medium: form.medium,
                    hard: form.hard
                },
                subjects: subjectsPayload,
                durationMinutes: form.durationMinutes,
                schedulingType: form.schedulingType,
                startTime: form.startTime,
                endTime: form.schedulingType === 'range' ? form.endTime : undefined,
            });
            showToast('Exam created successfully', 'success');
            setForm({
                title: '',
                totalQuestions: 50,
                easy: 30,
                medium: 40,
                hard: 30,
                durationMinutes: 60,
                schedulingType: 'fixed',
                startTime: '',
                endTime: '',
            });
            setExamSubjects([{ subject: '', count: '' }]);
            loadExams();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to create exam', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Exams Management</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Design and schedule examinations for your students.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* Exam List Section */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Live &amp; Scheduled</h2>
                            <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                {exams.length} Total
                            </span>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="p-12 text-center">
                                    <div className="animate-spin size-8 border-3 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                    <p className="text-sm text-slate-500 font-medium">Fetching exams...</p>
                                </div>
                            ) : exams.length === 0 ? (
                                <div className="p-12 text-center text-slate-500 font-medium">
                                    No exams found. Use the form to create your first exam.
                                </div>
                            ) : (
                                exams.map((exam) => (
                                    <div key={exam._id} className="p-6 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 transition-all">
                                                    <span className="material-symbols-outlined text-2xl">assignment</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="font-bold text-slate-900 dark:text-white text-lg">{exam.title}</h4>
                                                        {exam.schedulingType === 'range' ? (
                                                            <span className="inline-flex items-center gap-1 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide">
                                                                <span className="material-symbols-outlined text-xs">date_range</span>
                                                                Time Range
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide">
                                                                <span className="material-symbols-outlined text-xs">schedule</span>
                                                                Fixed Time
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                                                        <span className="flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-sm">schedule</span> {exam.durationMinutes || exam.duration}m
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-sm">quiz</span> {exam.totalQuestions} Questions
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                {exam.schedulingType === 'range' ? (
                                                    <>
                                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Available From</p>
                                                        <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-0.5">
                                                            {exam.startTime ? new Date(exam.startTime).toLocaleString("en-IN") : 'Not set'}
                                                        </p>
                                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight mt-2">Until</p>
                                                        <p className="text-sm font-black text-violet-600 dark:text-violet-400 mt-0.5">
                                                            {exam.endTime ? new Date(exam.endTime).toLocaleString("en-IN") : 'Not set'}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Starts At</p>
                                                        <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-0.5">
                                                            {exam.startTime ? new Date(exam.startTime).toLocaleString("en-IN") : 'Not set'}
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Difficulty Visualization */}
                                        <div className="mt-4 flex items-center gap-2">
                                            <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                                                <div style={{ width: `${exam.distribution?.easy}%` }} className="h-full bg-emerald-500 opacity-70"></div>
                                                <div style={{ width: `${exam.distribution?.medium}%` }} className="h-full bg-amber-500 opacity-70"></div>
                                                <div style={{ width: `${exam.distribution?.hard}%` }} className="h-full bg-rose-500 opacity-70"></div>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase">Dist.</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Create Exam Form */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none p-6 md:p-8 sticky top-24">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="size-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <span className="material-symbols-outlined text-xl">add_task</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Design New Exam</h2>
                    </div>

                    <form onSubmit={handleCreate} className="space-y-4">
                        {/* Title */}
                        <div className="space-y-1">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Exam Title</label>
                            <input
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                                required
                                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                placeholder="e.g. Science Mid-term 2024"
                            />
                        </div>

                        {/* Subjects + Duration */}
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Duration (min)</label>
                                <input
                                    type="number"
                                    name="durationMinutes"
                                    value={form.durationMinutes}
                                    onChange={handleChange}
                                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold focus:border-indigo-500 transition-all outline-none"
                                />
                            </div>
                        </div>

                        {/* Subjects */}
                        <div className="space-y-3 pt-2">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Subjects & Questions</label>
                                <span className="text-[10px] font-black rounded-lg px-2 py-0.5 text-indigo-500 bg-indigo-50">
                                    Total: {examSubjects.reduce((sum, s) => sum + (Number(s.count) || 0), 0)} Qs
                                </span>
                            </div>
                            {examSubjects.map((s, idx) => (
                                <div key={idx} className="flex gap-2 min-w-0 items-center">
                                    <select
                                        value={s.subject}
                                        onChange={(e) => handleSubjectChange(idx, 'subject', e.target.value)}
                                        className="flex-1 truncate rounded-2xl border min-w-0 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:border-indigo-500 transition-all outline-none"
                                    >
                                        <option value="" disabled>Select Subject</option>
                                        {availableSubjects.map((asub) => (
                                            <option key={asub.subject} value={asub.subject}>
                                                {asub.subject} ({asub.total} available)
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="count"
                                        value={s.count}
                                        onChange={(e) => handleSubjectChange(idx, 'count', e.target.value)}
                                        className="w-24 shrink-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold focus:border-indigo-500 transition-all outline-none"
                                    />
                                    {examSubjects.length > 1 && (
                                        <button type="button" onClick={() => handleRemoveSubject(idx)} className="text-rose-500 hover:text-rose-600 p-2 shrink-0">
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => setExamSubjects(prev => [...prev, { subject: '', count: '' }])}
                                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer border-none"
                            >
                                <span className="material-symbols-outlined text-sm">add</span> Add Subject
                            </button>
                        </div>

                        {/* Difficulty Distribution */}
                        <div className="space-y-3 pt-2">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Difficulty Weight (%)</label>
                                <span className={`text-[10px] font-black rounded-lg px-2 py-0.5 ${form.easy + form.medium + form.hard === 100 ? 'text-emerald-500 bg-emerald-50' : 'text-rose-500 bg-rose-50'}`}>
                                    {form.easy + form.medium + form.hard}/100
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <DifficultyInput label="Easy" name="easy" value={form.easy} onChange={handleChange} color="border-emerald-500" />
                                <DifficultyInput label="Med" name="medium" value={form.medium} onChange={handleChange} color="border-amber-500" />
                                <DifficultyInput label="Hard" name="hard" value={form.hard} onChange={handleChange} color="border-rose-500" />
                            </div>
                        </div>

                        {/* Scheduling Type Toggle */}
                        <div className="space-y-3 pt-1">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Scheduling Mode</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleSchedulingTypeChange('fixed')}
                                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 font-bold text-sm transition-all ${form.schedulingType === 'fixed'
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-base">schedule</span>
                                    Fixed Time
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSchedulingTypeChange('range')}
                                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 font-bold text-sm transition-all ${form.schedulingType === 'range'
                                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-base">date_range</span>
                                    Time Range
                                </button>
                            </div>

                            {/* Context hint */}
                            <p className="text-[11px] text-slate-400 font-medium ml-1">
                                {form.schedulingType === 'fixed'
                                    ? 'Students must join within 30 mins of the start time.'
                                    : 'Students can start anytime within the availability window.'}
                            </p>
                        </div>

                        {/* Start Time */}
                        <div className="space-y-1">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                                {form.schedulingType === 'range' ? 'Available From' : 'Start Schedule'}
                            </label>
                            <input
                                type="datetime-local"
                                name="startTime"
                                value={form.startTime}
                                onChange={handleChange}
                                required
                                max="9999-12-31T23:59"
                                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm font-bold focus:border-indigo-500 transition-all outline-none"
                            />
                        </div>

                        {/* End Time — only for range */}
                        {form.schedulingType === 'range' && (
                            <div className="space-y-1">
                                <label className="text-xs font-black uppercase tracking-widest text-violet-400 ml-1">Available Until</label>
                                <input
                                    type="datetime-local"
                                    name="endTime"
                                    value={form.endTime}
                                    onChange={handleChange}
                                    required
                                    max="9999-12-31T23:59"
                                    min={form.startTime || undefined}
                                    className="w-full rounded-2xl border-2 border-violet-300 dark:border-violet-600 bg-violet-50/50 dark:bg-violet-500/5 px-4 py-3 text-sm font-bold focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none text-slate-900 dark:text-white"
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full mt-4 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">rocket_launch</span>
                                    Publish Exam
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

const DifficultyInput = ({ label, name, value, onChange, color }) => (
    <div className="space-y-1">
        <p className="text-[10px] font-black uppercase text-slate-400 text-center">{label}</p>
        <input
            type="number"
            name={name}
            value={value}
            onChange={onChange}
            className={`w-full text-center rounded-xl border-2 ${color} bg-white dark:bg-slate-800 py-2 text-xs font-black focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all`}
        />
    </div>
);
