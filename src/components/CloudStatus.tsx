'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Cloud, CloudOff, CloudUpload, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { getPendingCount, getOfflineLeads, markLeadSynced, markLeadFailed } from '@/lib/offlineQueue';

type CloudState = 'synced' | 'pending' | 'offline' | 'syncing';

interface CloudStatusState {
    state: CloudState;
    pendingCount: number;
    isSyncing: boolean;
}

/**
 * ☁️ CloudStatus — Header Sync Indicator (Sprint 6)
 *
 * Color states:
 *  🟢 Green  → All synced, online
 *  🟠 Orange → Leads pending locally, online
 *  🔴 Red    → Offline mode detected
 *  🔵 Blue   → Sync in progress (animated spin)
 */
export const CloudStatus: React.FC = () => {
    const [status, setStatus] = useState<CloudStatusState>({
        state: 'synced',
        pendingCount: 0,
        isSyncing: false,
    });

    const refresh = useCallback(async () => {
        const count = await getPendingCount();
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        let state: CloudState = 'synced';
        if (!isOnline) state = 'offline';
        else if (count > 0) state = 'pending';
        setStatus(prev => ({ ...prev, pendingCount: count, state }));
    }, []);

    const triggerSync = useCallback(async () => {
        if (!navigator.onLine || status.isSyncing) return;
        setStatus(prev => ({ ...prev, isSyncing: true, state: 'syncing' }));
        try {
            const pending = await getOfflineLeads('pending');
            const agentId = localStorage.getItem('sales_agent_id') || undefined;
            const tenantId = localStorage.getItem('sales_tenant_id') || undefined;
            for (const lead of pending) {
                try {
                    const res = await fetch('/api/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ leads: [lead], agentId, tenantId }),
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
                    break; // network dropped mid-sync
                }
            }
        } finally {
            setStatus(prev => ({ ...prev, isSyncing: false }));
            await refresh();
        }
    }, [status.isSyncing, refresh]);

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 8000);
        const onOnline = () => refresh();
        const onOffline = () => setStatus(prev => ({ ...prev, state: 'offline' }));
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            clearInterval(interval);
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, [refresh]);

    // Config per state
    const config = {
        synced: {
            icon: <Cloud className="w-4 h-4 text-emerald-500" />,
            dot: 'bg-emerald-500',
            pill: 'bg-emerald-50 border-emerald-200 text-emerald-700',
            label: 'Sync OK',
            pulse: false,
        },
        pending: {
            icon: <CloudUpload className="w-4 h-4 text-amber-500" />,
            dot: 'bg-amber-400',
            pill: 'bg-amber-50 border-amber-200 text-amber-700',
            label: `${status.pendingCount} en attente`,
            pulse: true,
        },
        offline: {
            icon: <WifiOff className="w-4 h-4 text-red-500" />,
            dot: 'bg-red-500',
            pill: 'bg-red-50 border-red-200 text-red-700',
            label: 'Hors ligne',
            pulse: false,
        },
        syncing: {
            icon: <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />,
            dot: 'bg-blue-500',
            pill: 'bg-blue-50 border-blue-200 text-blue-700',
            label: 'Sync...',
            pulse: false,
        },
    }[status.isSyncing ? 'syncing' : status.state];

    return (
        <button
            onClick={triggerSync}
            disabled={status.isSyncing || status.state === 'offline'}
            className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-semibold
                transition-all duration-200 hover:scale-105 active:scale-95
                disabled:opacity-60 disabled:cursor-not-allowed
                ${config.pill}
            `}
            title={
                status.state === 'offline'
                    ? 'Mode hors ligne — les données sont sauvegardées localement'
                    : status.state === 'pending'
                    ? `${status.pendingCount} lead(s) en attente — Cliquez pour synchroniser`
                    : 'Tout est synchronisé'
            }
        >
            {/* Pulsing dot indicator */}
            <span className="relative flex items-center">
                <span className={`w-2 h-2 rounded-full ${config.dot} ${config.pulse ? 'animate-pulse' : ''}`} />
            </span>

            {/* Icon */}
            {config.icon}

            {/* Label */}
            <span className="hidden sm:inline">{config.label}</span>

            {/* Pending count badge */}
            {status.pendingCount > 0 && !status.isSyncing && (
                <span className="bg-amber-400 text-amber-900 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {status.pendingCount > 9 ? '9+' : status.pendingCount}
                </span>
            )}
        </button>
    );
};
