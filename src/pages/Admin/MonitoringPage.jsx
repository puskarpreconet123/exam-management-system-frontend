import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function MonitoringPage() {
    const { showToast } = useToast();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [forcingId, setForcingId] = useState('');

    // Pagination state
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit, setLimit] = useState(10);

    // Detailed View state
    const [selectedAttempt, setSelectedAttempt] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [attemptLogs, setAttemptLogs] = useState([]);

    const loadLogs = async (pageNum = page, currentLimit = limit) => {
        setLoading(true);
        try {
            const { data } = await api.get(`/admin/suspicious?page=${pageNum}&limit=${currentLimit}`);
            setLogs(data.data || []);
            setTotalPages(data.pages || 1);
            setPage(pageNum);
        } catch (err) {
            showToast('Failed to load integrity logs', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();

        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5
        });

        socket.on('connect', () => {
            socket.emit('join_admin_room');
        });

        socket.on('new_suspicious_log', (newLog) => {
            setLogs(prev => {
                const exists = prev.some(l => l._id === newLog._id);
                if (exists) {
                    // Remove the old entry and place the updated one at the top
                    const filtered = prev.filter(l => l._id !== newLog._id);
                    return [newLog, ...filtered];
                }
                return [newLog, ...prev];
            });
            showToast(`Violation Updated: ${newLog.userId?.name || 'Student'}`, 'warning');
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const handleViewDetails = async (log) => {
        if (!log.attemptId) return;

        const attemptId = log.attemptId?._id || log.attemptId;

        setSelectedAttempt({
            attemptId: attemptId,
            studentName: log.userId?.name || 'Unknown',
            studentEmail: log.userId?.email || 'N/A',
            status: log.attemptId?.status || 'Unknown'
        });

        setIsModalOpen(true);
        setAttemptLogs([]);

        try {
            const { data } = await api.get(`/admin/suspicious?attemptId=${attemptId}&limit=100`);
            setAttemptLogs(data.data || []);
        } catch (err) {
            showToast('Failed to load attempt details', 'error');
        }
    };

    const handleLimitChange = (e) => {
        const newLimit = parseInt(e.target.value, 10);
        setLimit(newLimit);
        loadLogs(1, newLimit);
    };

    const handleForceSubmit = async (attemptId) => {
        setForcingId(attemptId);
        try {
            await api.post(`/admin/force-submit/${attemptId}`);
            showToast('Attempt forcefully terminated', 'info');
            await loadLogs(page); // Reload current page after force submit
        } catch (err) {
            showToast('Termination failed', 'error');
        } finally {
            setForcingId('');
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Integrity Monitoring</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Real-time oversight of examination security and suspicious behaviors.</p>
                </div>
                <div className="flex items-center gap-2 border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-2xl group transition-all">
                    <span className="size-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Live Feed Active</span>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 md:px-10 py-6 md:py-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/30 dark:bg-slate-800/30">
                    <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-slate-400">policy</span>
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Integrity Violation Logs</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-500">Show:</span>
                            <select
                                value={limit}
                                onChange={handleLimitChange}
                                disabled={loading}
                                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>

                        <button
                            onClick={() => loadLogs(page)}
                            disabled={loading}
                            className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-90 disabled:opacity-50 flex items-center justify-center"
                        >
                            <span className={`material-symbols-outlined text-indigo-600 ${loading ? 'animate-spin' : ''}`}>
                                {loading ? 'sync' : 'refresh'}
                            </span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Profile</th>
                                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Violation Type</th>
                                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Timestamp</th>
                                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">System Context</th>
                                <th className="px-10 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-24 text-center">
                                        <div className="animate-spin size-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-6"></div>
                                        <p className="text-sm font-bold text-slate-500">Analyzing System Logs...</p>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-24 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                                        Clean Integrity Record. No violations detected.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr
                                        key={log._id}
                                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                                        onClick={(e) => {
                                            // Prevent row click if action button was clicked
                                            if (!e.target.closest('button')) {
                                                handleViewDetails(log);
                                            }
                                        }}
                                    >
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-2xl bg-linear-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-lg">
                                                    {log.userId?.name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <p className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">{log.userId?.name || 'Unknown'}</p>
                                                    <p className="text-xs font-bold text-slate-400 mt-0.5">{log.userId?.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${getViolationStyle(log.type)}`}>
                                                    {log.type.replace('_', ' ')}
                                                </span>
                                                {log.count > 1 && (
                                                    <span className="px-2 py-1 bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 text-xs font-black rounded-lg">
                                                        x{log.count}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                                                {new Date(log.updatedAt || log.createdAt).toLocaleDateString()}
                                            </p>
                                            <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                                                {new Date(log.updatedAt || log.createdAt).toLocaleTimeString()}
                                            </p>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exam</span>
                                                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 rounded-md ring-1 ring-indigo-500/10">#{log.examId?.slice(-6) || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                                                    <span className="material-symbols-outlined text-[14px]">fingerprint</span>
                                                    <span className="truncate max-w-32">Attempt: {(log.attemptId?._id || log.attemptId)?.slice(-8)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            {log.attemptId && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleForceSubmit(log.attemptId?._id || log.attemptId);
                                                    }}
                                                    disabled={forcingId === (log.attemptId?._id || log.attemptId) || (log.attemptId?.status && log.attemptId.status !== 'active')}
                                                    className={`inline-flex items-center gap-2.5 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-50 ${log.attemptId?.status && log.attemptId.status !== 'active'
                                                        ? 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                                                        : 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-600 hover:text-white dark:hover:bg-orange-500'
                                                        }`}
                                                >
                                                    {forcingId === (log.attemptId?._id || log.attemptId)
                                                        ? 'Kicking...'
                                                        : (log.attemptId?.status && log.attemptId.status !== 'active' ? 'Terminated' : 'Force Terminate')}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="px-6 md:px-10 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-end gap-4 bg-slate-50/30 dark:bg-slate-800/30">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => loadLogs(page - 1)}
                                disabled={page === 1 || loading}
                                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 disabled:opacity-50 transition-all hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"
                            >
                                <span className="material-symbols-outlined text-sm">chevron_left</span>
                            </button>

                            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden p-0.5">
                                {(() => {
                                    let pages = [];
                                    let start = Math.max(1, page - 2);
                                    let end = Math.min(totalPages, start + 4);
                                    if (end - start < 4) {
                                        start = Math.max(1, end - 4);
                                    }
                                    for (let i = start; i <= end; i++) {
                                        pages.push(
                                            <button
                                                key={i}
                                                onClick={() => loadLogs(i)}
                                                disabled={loading}
                                                className={`size-8 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${page === i ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                            >
                                                {i}
                                            </button>
                                        );
                                    }
                                    return pages;
                                })()}
                            </div>

                            <button
                                onClick={() => loadLogs(page + 1)}
                                disabled={page === totalPages || loading}
                                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 disabled:opacity-50 transition-all hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"
                            >
                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <LogSummaryCard title="Most Common" value="TAB_SWITCH" sub="42% of violations" icon="tab" color="text-amber-500" />
                <LogSummaryCard title="Peak Time" value="14:00 - 16:00" sub="UTC Schedule" icon="alarm" color="text-indigo-500" />
                <LogSummaryCard title="Auto-Terminations" value="12" sub="Last 24 hours" icon="gavel" color="text-rose-500" />
            </div>

            {/* Detailed Attempt Logs Modal */}
            {isModalOpen && selectedAttempt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Attempt Details</h3>
                                <p className="text-sm font-bold text-slate-500 mt-2">
                                    Student: <span className="text-indigo-600 dark:text-indigo-400">{selectedAttempt.studentName}</span> ({selectedAttempt.studentEmail})
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="size-10 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                            >
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>

                        <div className="p-8 max-h-[60vh] overflow-y-auto">
                            <div className="flex gap-4 mb-8">
                                <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Status</p>
                                    <p className="text-lg font-black text-slate-700 dark:text-slate-200">{selectedAttempt.status}</p>
                                </div>
                                <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Attempt ID</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{selectedAttempt.attemptId}</p>
                                </div>
                            </div>

                            <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">Activity Log</h4>
                            {attemptLogs.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 font-bold">
                                    <div className="animate-spin size-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                    Loading logs...
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {attemptLogs.map(alog => (
                                        <div key={alog._id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl">
                                            <div className="flex items-center gap-4">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${getViolationStyle(alog.type)}`}>
                                                    {alog.type.replace('_', ' ')}
                                                </span>
                                                {alog.count > 1 && (
                                                    <span className="px-2 py-0.5 bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 text-[10px] font-black rounded-lg uppercase tracking-widest">
                                                        Total: {alog.count}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                    Latest: {new Date(alog.updatedAt || alog.createdAt).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const getViolationStyle = (type) => {
    switch (type) {
        case 'TAB_SWITCH': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
        case 'WINDOW_BLUR': return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400';
        case 'LATE_START': return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400';
        case 'DEVICE_CHANGE': return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400';
        default: return 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400';
    }
}

const LogSummaryCard = ({ title, value, sub, icon, color }) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-4xl border border-slate-200 dark:border-slate-800 flex items-center gap-6">
        <div className={`size-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center ${color}`}>
            <span className="material-symbols-outlined text-3xl">{icon}</span>
        </div>
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{title}</p>
            <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{value}</h4>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{sub}</p>
        </div>
    </div>
);
