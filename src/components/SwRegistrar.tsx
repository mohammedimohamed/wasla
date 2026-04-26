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

        // Notify instead of auto-reloading to protect unsaved form data
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                // Don't auto-reload. Use a toast to inform the user (assumes Toaster is in layout)
                import('react-hot-toast').then(({ default: toast }) => {
                    toast('Une mise à jour est disponible.', {
                        duration: 8000,
                        icon: '🔄',
                        action: {
                            label: 'Recharger',
                            onClick: () => window.location.reload()
                        }
                    } as any);
                }).catch(() => {
                    console.log('Update available. Please refresh the page.');
                });
            }
        });
    }, []);

    return null;
}
