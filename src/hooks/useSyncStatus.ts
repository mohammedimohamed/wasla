'use client';

import { useState, useEffect } from 'react';

export const useSyncStatus = () => {
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial fetch of pending count
        const fetchPending = async () => {
            try {
                const res = await fetch('/api/sync/status');
                const data = await res.json();
                setPendingCount(data.count || 0);
            } catch (error) {
                console.error('Failed to fetch sync status');
            }
        };

        fetchPending();
        const interval = setInterval(fetchPending, 10000); // Poll every 10s

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    const triggerSync = async () => {
        if (!isOnline || isSyncing) return;
        setIsSyncing(true);
        try {
            await fetch('/api/sync', { method: 'POST' });
            // Re-fetch count after sync
            const res = await fetch('/api/sync/status');
            const data = await res.json();
            setPendingCount(data.count || 0);
        } catch (error) {
            console.error('Sync failed');
        } finally {
            setIsSyncing(false);
        }
    };

    return { isOnline, isSyncing, pendingCount, triggerSync };
};
