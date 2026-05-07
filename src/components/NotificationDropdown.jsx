import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

dayjs.extend(relativeTime);

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function NotificationDropdown() {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const { user } = useAuth();

    const unreadCount = notifications.filter(n => !n.read).length;

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await api.get('/notifications');
            setNotifications(response.data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        
        // Socket connection for real-time updates
        const userId = user?.id || user?._id;
        if (userId) {
            const socket = io(SOCKET_URL, {
                transports: ['websocket', 'polling'],
                reconnectionAttempts: 5
            });
            
            socket.on('connect', () => {
                socket.emit('join_user_room', userId);
            });

            socket.on('new_notification', (notification) => {
                setNotifications(prev => {
                    if (prev.some(n => n._id === notification._id)) return prev;
                    return [notification, ...prev];
                });
            });

            return () => socket.disconnect();
        }
    }, [user?._id]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const removeNotification = async (e, id) => {
        e.stopPropagation();
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n._id !== id));
        } catch (error) {
            console.error('Error removing notification:', error);
        }
    };

    const clearAll = async () => {
        try {
            await api.delete('/notifications/clear-all');
            setNotifications([]);
        } catch (error) {
            console.error('Error clearing notifications:', error);
        }
    };

    const getTypeStyles = (type) => {
        switch (type) {
            case 'success': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400';
            case 'warning': return 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400';
            case 'error': return 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400';
            default: return 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'success': return 'check_circle';
            case 'warning': return 'warning';
            case 'error': return 'error';
            default: return 'info';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`size-10 rounded-full flex items-center justify-center transition-all relative cursor-pointer ${
                    isOpen 
                    ? 'bg-teal-100 dark:bg-teal-500/20 text-teal-600 shadow-inner' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-teal-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
            >
                <span className="material-symbols-outlined">notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 size-4 bg-rose-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center animate-bounce">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            Notifications
                            <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] rounded-full uppercase tracking-wider font-black">
                                {notifications.length}
                            </span>
                        </h3>
                        {unreadCount > 0 && (
                            <button 
                                onClick={markAllAsRead}
                                className="text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 transition-colors cursor-pointer"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-100 overflow-y-auto custom-scrollbar">
                        {loading && notifications.length === 0 ? (
                            <div className="p-10 flex flex-col items-center justify-center gap-3 text-slate-400">
                                <div className="size-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm font-medium">Loading notifications...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400 text-center">
                                <span className="material-symbols-outlined text-5xl opacity-20">notifications_off</span>
                                <div>
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">All caught up!</p>
                                    <p className="text-xs">No new notifications for you right now.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {notifications.map((n) => (
                                    <div 
                                        key={n._id}
                                        onClick={() => !n.read && markAsRead(n._id)}
                                        className={`p-4 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group relative ${!n.read ? 'bg-teal-50/30 dark:bg-teal-500/5' : ''}`}
                                    >
                                        <div className={`size-10 shrink-0 rounded-xl flex items-center justify-center shadow-sm ${getTypeStyles(n.type)}`}>
                                            <span className="material-symbols-outlined text-xl">{getTypeIcon(n.type)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h4 className={`text-sm font-bold truncate ${!n.read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                                    {n.title}
                                                </h4>
                                                <span className="text-[10px] text-slate-400 whitespace-nowrap mt-0.5">
                                                    {dayjs(n.createdAt).fromNow()}
                                                </span>
                                            </div>
                                            <p className={`text-xs mt-1 line-clamp-2 ${!n.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-500'}`}>
                                                {n.message}
                                            </p>
                                        </div>
                                        
                                        {/* Remove Button */}
                                        <button 
                                            onClick={(e) => removeNotification(e, n._id)}
                                            className="ml-2 size-8 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                                            title="Remove"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>

                                        {!n.read && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500 rounded-r-full"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-center bg-slate-50/30 dark:bg-slate-800/30">
                            <button 
                                onClick={clearAll}
                                className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 transition-colors cursor-pointer py-1"
                            >
                                Clear All Notifications
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

