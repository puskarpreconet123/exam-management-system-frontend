import React, { useState, useEffect } from 'react';

const NetworkStatus = ({ isSyncing, isSyncingBacklog }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showStatus, setShowStatus] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowStatus(true);
            setTimeout(() => setShowStatus(false), 3000);
        };
        const handleOffline = () => {
            setIsOnline(false);
            setShowStatus(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const isAnySyncing = isSyncing || isSyncingBacklog;

    return (
        <div className="flex items-center gap-3">
            {/* Sync Indicator */}
            <div className={`flex items-center gap-1.5 transition-all duration-300 ${isAnySyncing ? 'opacity-100' : 'opacity-0'}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {isSyncingBacklog ? 'Syncing backlog...' : 'Syncing...'}
                </span>
            </div>

            {/* Network Status Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 ${isOnline
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                    : 'bg-red-500/10 border-red-500/20 text-red-600 shadow-lg shadow-red-500/10'
                }`}>
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
                <span className="text-xs font-bold uppercase tracking-wide">
                    {isOnline ? 'Online' : 'Offline'}
                </span>
                {!isOnline && (
                    <span className="material-symbols-outlined text-sm leading-none">cloud_off</span>
                )}
            </div>
        </div>
    );
};

export default NetworkStatus;
