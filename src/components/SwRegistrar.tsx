'use client';
import { useEffect } from 'react';

/**
 * Registers the custom service worker on first mount.
 * Must be a 'use client' component so it can call navigator APIs.
 */
export function SwRegistrar() {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator)) return;

        navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .then((reg) => {
                console.log('[SW] Registered. Scope:', reg.scope);

                // When a new SW is waiting, send SKIP_WAITING to activate immediately
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (!newWorker) return;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                    });
                });
            })
            .catch((err) => console.error('[SW] Registration failed:', err));

        // Reload once the new SW has taken control (after SKIP_WAITING)
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    }, []);

    return null;
}
