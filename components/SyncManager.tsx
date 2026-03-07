"use client";

import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { getOfflineLeads, clearOfflineLeads } from '@/lib/offlineQueue';

export function SyncManager() {
    useEffect(() => {
        const flushQueue = async () => {
            const leads = getOfflineLeads();
            if (leads.length === 0) return;

            // Optional explicit visual indicator
            console.log(`[Sync Manager] Attempting to flush ${leads.length} queued records...`);

            try {
                const res = await fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ leads })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.synced_ids && data.synced_ids.length > 0) {
                        clearOfflineLeads(data.synced_ids);
                        toast.success(`${data.synced_ids.length} leads synchronisés avec le serveur ☁️✅`, { icon: '🔄' });
                    }
                }
            } catch (err) {
                console.error("[Sync Manager] Server still unreachable. Will retry post-event connection.");
            }
        };

        // Watch Window Event explicitly defining exact moment Wi-Fi reconnects
        window.addEventListener('online', flushQueue);

        // Pre-Flight Check: if they launch the app instantly online and have cached artifacts
        if (navigator.onLine) {
            flushQueue();
        }

        // Failsafe Poll: Verify connection every 60 seconds (useful on spotty convention networks)
        const interval = setInterval(() => {
            if (navigator.onLine) {
                flushQueue();
            }
        }, 60000);

        return () => {
            window.removeEventListener('online', flushQueue);
            clearInterval(interval);
        };
    }, []);

    // Silent Component rendering absolutely no UI layout explicitly. Exclusively Event hooks execution.
    return null;
}
