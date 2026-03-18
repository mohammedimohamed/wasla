'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getPendingCount, getOfflineLeads, markLeadSynced, markLeadFailed } from '@/lib/offlineQueue';

/**
 * 🔄 useSyncStatus hook — Agent Portal Edition
 *
 * Reads the pending count directly from IndexedDB (offline-safe).
 * Provides a triggerSync() function that POSTs pending records to /api/sync
 * and marks them individually as synced/failed in IndexedDB.
 *
 * This replaces the old server-polling approach (/api/sync/status)
 * which was broken when the agent was offline.
 */
export const useSyncStatus = () => {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const isSyncingRef = useRef(false);

    // ── Refresh the badge count from IndexedDB ───────────────────────────────
    const refreshCount = useCallback(async () => {
        const count = await getPendingCount();
        setPendingCount(count);
    }, []);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Poll IndexedDB every 8 s for count updates (e.g. new lead submitted)
        refreshCount();
        const interval = setInterval(refreshCount, 8000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, [refreshCount]);

    // ── Manual sync trigger (used by SyncStatusIcon button) ─────────────────
    const triggerSync = useCallback(async () => {
        if (!isOnline || isSyncingRef.current) return;

        isSyncingRef.current = true;
        setIsSyncing(true);

        try {
            const pending = await getOfflineLeads('pending');
            if (pending.length === 0) {
                setIsSyncing(false);
                isSyncingRef.current = false;
                return;
            }

            // Sequential — prevents racing on spotty connections
            for (const lead of pending) {
                try {
                    const res = await fetch('/api/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ leads: [lead] }),
                    });

                    if (res.ok) {
                        const data = await res.json();
                        if (data.synced_ids?.includes(lead.client_uuid)) {
                            await markLeadSynced(lead.client_uuid);
                        } else {
                            await markLeadFailed(lead.client_uuid, 'Server did not acknowledge');
                        }
                    } else {
                        await markLeadFailed(lead.client_uuid, `HTTP ${res.status}`);
                    }
                } catch {
                    // Network failure mid-sync — stop and leave remaining as pending
                    break;
                }
            }
        } catch (error) {
            console.error('[useSyncStatus] Sync failed:', error);
        } finally {
            setIsSyncing(false);
            isSyncingRef.current = false;
            await refreshCount();
        }
    }, [isOnline, refreshCount]);

    return { isOnline, isSyncing, pendingCount, triggerSync, refreshCount };
};
