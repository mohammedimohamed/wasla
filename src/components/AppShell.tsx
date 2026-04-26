'use client';

import { useState, useEffect } from 'react';
import { refreshRewards } from '@/src/db/client';

// ─── View type ────────────────────────────────────────────────────────────────
// This grows as screens are migrated in Phase 3.
// For Phase 1: only 'login' is active; all others fall through to the legacy page redirects.
export type AppView =
    | 'login'
    | 'dashboard'
    | 'new_lead'
    | 'lead_list'
    | 'lead_detail'
    | 'kiosk'
    | 'kiosk_success'
    | 'admin_login'
    | 'admin_dashboard'
    | 'rewards_config'
    | 'export';

interface AppState {
    view: AppView;
    selectedLeadId?: string;
    commercialName?: string;
    isManagerSession?: boolean;
    kioskReward?: Record<string, unknown>;
}

/**
 * AppShell — Root client-side state machine.
 *
 * Phase 1: Scaffolded with only the 'login' placeholder rendered.
 *          The existing home page content is preserved as the fallback.
 *          Screens will be wired in Phase 3 one-by-one.
 */
export default function AppShell({ initialContent }: { initialContent?: React.ReactNode }) {
    const [state, setState] = useState<AppState>({ view: 'login' });
    const [isOnline, setIsOnline] = useState(true);

    // ─── Navigation helper (replaces router.push everywhere) ─────────────────
    const navigate = (view: AppView, extra?: Partial<AppState>) => {
        setState((prev) => ({ ...prev, view, ...extra }));
    };

    // ─── Online/offline detection ─────────────────────────────────────────────
    useEffect(() => {
        const update = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        update();
        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
        };
    }, []);

    // ─── On mount: prime rewards cache ───────────────────────────────────────
    useEffect(() => {
        refreshRewards().catch(() => {/* offline — cached rewards used */});
    }, []);

    // ─── Phase 1: render the existing home content as-is ─────────────────────
    // In Phase 3, each view will be replaced with its modal component.
    // The `initialContent` prop allows the server-rendered home page to pass
    // through here unchanged while the infrastructure is being wired up.
    return (
        <div className="contents">
            {/* Connectivity badge — will be extracted to a shared component in Phase 3 */}
            {!isOnline && (
                <div className="fixed top-0 inset-x-0 z-[100] bg-amber-500 text-white text-xs font-bold text-center py-1">
                    📶 Hors ligne — Les données sont sauvegardées localement
                </div>
            )}

            {/* Phase 1: pass through existing page content unchanged */}
            {initialContent}
        </div>
    );
}
