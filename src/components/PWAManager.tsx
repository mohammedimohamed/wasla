'use client';

import { useEffect } from 'react';
import toast from 'react-hot-toast';

/**
 * 🛰️ PWAManager — Service Worker Lifecycle Handler (Sprint 6.5)
 *
 * Responsibilities:
 *  1. Detect when a new SW version is available and prompt the user to refresh
 *  2. Log SW registration state for debugging
 *  3. Fire a 'wasla-sw-ready' custom event when the SW is active (used by SyncManager)
 *
 * This component renders nothing — it's a pure side-effect manager.
 * Mount it once in the root layout.
 */
export function PWAManager() {
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        // In development, next-pwa is disabled — nothing to register
        if (process.env.NEXT_PUBLIC_PWA_DISABLE === 'true') return;

        const registerSW = async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/',
                    // updateViaCache: 'none' ensures the SW file is always fetched fresh
                    updateViaCache: 'none',
                });

                console.log('[PWAManager] Service Worker registered:', registration.scope);

                // ── New version available ────────────────────────────────────
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // A new SW is installed but waiting — prompt user to refresh
                            toast(
                                (t) => (
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold">
                                            🔄 Mise à jour disponible
                                        </span>
                                        <button
                                            onClick={() => {
                                                toast.dismiss(t.id);
                                                // Tell the new SW to take control immediately
                                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                                                window.location.reload();
                                            }}
                                            className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-500 transition-colors"
                                        >
                                            Recharger
                                        </button>
                                    </div>
                                ),
                                {
                                    duration: Infinity,
                                    icon: '☁️',
                                    style: { maxWidth: '340px' },
                                }
                            );
                        }
                    });
                });

                // ── Notify the SyncManager that SW is ready ──────────────────
                if (registration.active) {
                    window.dispatchEvent(new Event('wasla-sw-ready'));
                } else {
                    const sw = registration.installing || registration.waiting;
                    if (sw) {
                        sw.addEventListener('statechange', () => {
                            if (sw.state === 'activated') {
                                window.dispatchEvent(new Event('wasla-sw-ready'));
                            }
                        });
                    }
                }

                // ── Periodic SW update check (every 10 minutes) ──────────────
                setInterval(() => registration.update(), 10 * 60 * 1000);

            } catch (err) {
                console.error('[PWAManager] SW registration failed:', err);
            }
        };

        // Delay registration until the page is fully interactive
        if (document.readyState === 'complete') {
            registerSW();
        } else {
            window.addEventListener('load', registerSW, { once: true });
        }
    }, []);

    return null;
}
