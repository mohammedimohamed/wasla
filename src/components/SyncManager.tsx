"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Cloud, CloudOff, CloudUpload, RefreshCw } from 'lucide-react';
import {
    getOfflineLeads,
    getPendingCount,
    markLeadSynced,
    markLeadFailed,
    retryFailedLeads,
} from '@/lib/offlineQueue';

const SYNC_INTERVAL_MS = 60_000; // 60 seconds polling fallback
const RETRY_ON_FAILURE_MS = 120_000; // retry failed leads after 2 minutes

/**
 * 🔄 SyncManager — Offline-First Background Sync Engine
 *
 * Responsibilities:
 *  1. Listen for the `online` window event and flush any pending IndexedDB records
 *  2. Poll every 60 s as a fallback for spotty event-hall Wi-Fi
 *  3. Register a Background Sync task via the ServiceWorker SyncManager API if available
 *  4. Render a small status badge showing the pending queue size
 *  5. Never block the UI — all operations are fully async
 */
export function SyncManager() {
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const isSyncingRef = useRef(false);

    // ── Refresh badge count ──────────────────────────────────────────────────
    const refreshCount = useCallback(async () => {
        const count = await getPendingCount();
        setPendingCount(count);
    }, []);

    // ── Core sync function (sequentially processes pending records) ──────────
    const flushQueue = useCallback(async (silent = false) => {
        if (isSyncingRef.current) return; // prevent concurrent syncs

        const pending = await getOfflineLeads('pending');
        if (pending.length === 0) {
            await refreshCount();
            return;
        }

        isSyncingRef.current = true;
        setIsSyncing(true);

        if (!silent) {
            console.log(`[SyncManager] Flushing ${pending.length} pending records...`);
        }

        let successCount = 0;
        let failCount = 0;

        const agentId = localStorage.getItem('sales_agent_id') || 'SYSTEM';
        const tenantId = localStorage.getItem('sales_tenant_id') || '00000000-0000-0000-0000-000000000000';

        // Process records sequentially, one at a time, to avoid race conditions
        for (const lead of pending) {
            try {
                const res = await fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        leads: [lead],
                        agentId,
                        tenantId
                    }),
                });

                if (res.ok) {
                    const data = await res.json();
                    // Server acknowledged this uuid → mark synced
                    if (data.synced_ids?.includes(lead.client_uuid)) {
                        await markLeadSynced(lead.client_uuid);
                        successCount++;
                    } else if (data.failed_ids?.includes(lead.client_uuid)) {
                        await markLeadFailed(lead.client_uuid, 'Server rejected the record');
                        failCount++;
                    }
                } else if (res.status === 500) {
                    // 500 = server error — keep it pending for later retry (zero data loss)
                    await markLeadFailed(lead.client_uuid, `HTTP ${res.status}`);
                    failCount++;
                } else {
                    // 4xx errors (bad data) — mark as failed so we don't keep retrying forever
                    const errText = await res.text();
                    await markLeadFailed(lead.client_uuid, errText.slice(0, 100));
                    failCount++;
                }
            } catch (networkErr) {
                // Network failure — leave as pending, server never saw this
                console.warn(`[SyncManager] Network error for ${lead.client_uuid}:`, networkErr);
                // Don't mark as failed — keep pending for the next online event
                break; // Stop processing — we're offline
            }
        }

        await refreshCount();
        isSyncingRef.current = false;
        setIsSyncing(false);

        if (successCount > 0) {
            toast.success(
                `${successCount} lead${successCount > 1 ? 's' : ''} synchronisé${successCount > 1 ? 's' : ''} ☁️`,
                { icon: '✅', duration: 4000 }
            );
        }
        if (failCount > 0) {
            console.warn(`[SyncManager] ${failCount} leads failed to sync — will retry later.`);
        }
    }, [refreshCount]);

    // ── Register Background Sync via Service Worker API (if supported) ───────
    const registerBackgroundSync = useCallback(async () => {
        if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return;
        try {
            const registration = await navigator.serviceWorker.ready;
            await (registration as any).sync.register('wasla-offline-sync');
            console.log('[SyncManager] Background Sync registered with ServiceWorker.');
        } catch (err) {
            console.log('[SyncManager] Background Sync API not available, using polling fallback.');
        }
    }, []);

    // ── Retry failed leads after a delay ────────────────────────────────────
    const scheduleFailedRetry = useCallback(() => {
        const timer = setTimeout(async () => {
            if (navigator.onLine) {
                await retryFailedLeads();
                await flushQueue(true);
            }
        }, RETRY_ON_FAILURE_MS);
        return timer;
    }, [flushQueue]);

    // ── Main effect ──────────────────────────────────────────────────────────
    useEffect(() => {
        const onOnline = async () => {
            setIsOnline(true);
            await flushQueue();
        };

        const onOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);

        // Initial state
        setIsOnline(navigator.onLine);

        // Pre-flight: flush on mount if online
        if (navigator.onLine) {
            flushQueue(true);
        }

        // Initialize badge count
        refreshCount();

        // Register SW Background Sync as primary mechanism (progressive enhancement)
        registerBackgroundSync();

        // Polling fallback: every 60 s — catches spotty Wi-Fi that never fires the `online` event
        const interval = setInterval(() => {
            if (navigator.onLine) flushQueue(true);
        }, SYNC_INTERVAL_MS);

        // Schedule retry for any currently-failed leads
        const retryTimer = scheduleFailedRetry();

        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
            clearInterval(interval);
            clearTimeout(retryTimer);
        };
    }, [flushQueue, refreshCount, registerBackgroundSync, scheduleFailedRetry]);

    // ── UI: Persistent status badge (only visible when there is something notable) ──
    if (pendingCount === 0 && isOnline) return null;

    return (
        <div
            className="fixed bottom-5 right-5 z-50 flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-300"
            title={isOnline ? `${pendingCount} lead(s) en attente de synchronisation` : 'Hors ligne'}
        >
            <button
                onClick={() => flushQueue()}
                disabled={isSyncing || !isOnline}
                className={`
                    flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-black uppercase tracking-widest
                    shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                    ${isOnline
                        ? 'bg-slate-900 text-white shadow-slate-900/30'
                        : 'bg-slate-600 text-slate-300 shadow-slate-600/20'
                    }
                `}
            >
                {isSyncing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : isOnline ? (
                    <CloudUpload className="w-3.5 h-3.5" />
                ) : (
                    <CloudOff className="w-3.5 h-3.5 text-red-400" />
                )}

                {isOnline ? (
                    <span>
                        {isSyncing ? 'Sync...' : `${pendingCount} en attente`}
                    </span>
                ) : (
                    <span className="text-red-400">Hors ligne</span>
                )}

                {/* Badge bubble */}
                {pendingCount > 0 && !isSyncing && (
                    <span className="ml-0.5 w-5 h-5 bg-amber-400 text-slate-900 rounded-full text-[10px] font-black flex items-center justify-center">
                        {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                )}
            </button>
        </div>
    );
}
