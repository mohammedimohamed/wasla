'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LeadForm } from "./LeadForm";
import { useSubBarEffect } from "@/src/modules/desktop-ui/hooks/useSubBarEffect";
import { ArrowLeft } from "lucide-react";

interface LeadCreateProps {
    isAdmin: boolean;
}

export function LeadCreate({ isAdmin }: LeadCreateProps) {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);

    // 🛡️ RBAC: Ensure we have the user ID for offline attribution
    useEffect(() => {
        const checkAuth = async () => {
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                const { getCachedSession } = await import('@/lib/offlineAuthCache');
                const cached = await getCachedSession();
                if (cached) setUserId(cached.userId);
                return;
            }

            try {
                const res = await fetch('/api/auth');
                if (res.ok) {
                    const data = await res.json();
                    setUserId(data.user?.id || null);
                }
            } catch (err) {
                console.error("Auth check failed:", err);
            }
        };
        checkAuth();
    }, []);

    const handleSuccess = () => {
        router.push(isAdmin ? "/admin/leads/list" : "/leads/list");
    };

    const backUrl = isAdmin ? "/admin/leads/list" : "/leads/list";

    // ── Inject into DesktopLayout sub-bar ────────────────────────────────────
    useSubBarEffect({
        title: "Nouveau Lead",
        subtitle: "Saisie Manuelle",
        actions: (
            <button
                onClick={() => router.push(backUrl)}
                className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded text-xs font-bold uppercase tracking-wider transition-all"
            >
                <ArrowLeft className="w-3 h-3" />
                Retour
            </button>
        ),
    });

    return (
        <div className="p-6 max-w-3xl mx-auto w-full">
            <div className="bg-white p-8 rounded-[24px] shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <LeadForm
                    source="commercial"
                    agentId={userId || undefined}
                    locationContext={typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('location') || undefined) : undefined}
                    onSubmitSuccess={handleSuccess}
                    isAdmin={isAdmin}
                />
            </div>
        </div>
    );
}
