'use client';

import { useEffect } from 'react';
import { getPendingCount } from '@/lib/offlineQueue';

/**
 * 🛡️ RefreshGuard — Anti-data-loss beforeunload interceptor (Sprint 6)
 *
 * Registers a window 'beforeunload' event listener.
 * If IndexedDB contains pending or failed leads, it shows the browser's
 * native confirmation dialog to prevent accidental data loss.
 *
 * Completely transparent — renders nothing.
 * Mount this once in the root layout via <RefreshGuard />.
 */
export function RefreshGuard() {
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // Async check is not possible in beforeunload — use a sync approach
            // We use a cached value that's updated periodically
            const cachedCount = parseInt(
                sessionStorage.getItem('wasla_pending_count') || '0',
                10
            );

            if (cachedCount > 0) {
                const message =
                    `⚠️ Vous avez ${cachedCount} lead(s) non synchronisé(s).\n` +
                    'Si vous quittez maintenant, les données locales pourraient être perdues.\n' +
                    'Voulez-vous vraiment quitter ?';
                e.preventDefault();
                e.returnValue = message; // Chrome requires returnValue to be set
                return message;
            }
        };

        // Update the cached count every 5 seconds so the beforeunload check is always fresh
        const updateCache = async () => {
            try {
                const count = await getPendingCount();
                sessionStorage.setItem('wasla_pending_count', String(count));
            } catch {
                // IndexedDB unavailable — safe to ignore
            }
        };

        // Initial update
        updateCache();
        const interval = setInterval(updateCache, 5000);

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            clearInterval(interval);
        };
    }, []);

    return null;
}
