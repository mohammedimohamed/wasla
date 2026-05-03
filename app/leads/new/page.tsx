'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { LeadForm } from "@/src/components/LeadForm";

export default function NewLeadPage() {
    const router = useRouter();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    // 🛡️ RBAC: Detect user profile for post-submission routing and attribution
    useEffect(() => {
        const checkAuth = async () => {
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                const { getCachedSession } = await import('@/lib/offlineAuthCache');
                const cached = await getCachedSession();
                if (cached) {
                    setUserRole(cached.role);
                    setUserId(cached.userId);
                }
                return;
            }

            try {
                const res = await fetch('/api/auth');
                if (res.ok) {
                    const data = await res.json();
                    setUserRole(data.user?.role || null);
                    setUserId(data.user?.id || null);
                }
            } catch (err) {
                console.error("Auth check failed:", err);
            }
        };
        checkAuth();
    }, []);

    const handleSuccess = () => {
        if (userRole === 'ADMINISTRATOR') {
            router.push("/admin/dashboard");
        } else {
            router.push("/dashboard");
        }
    };

    const handleBack = () => {
        if (userRole === 'ADMINISTRATOR') {
            router.push("/admin/dashboard");
        } else {
            router.push("/dashboard");
        }
    };

    return (
        <div className="flex-1 flex flex-col pt-4 min-h-screen bg-slate-50">
            <header className="px-6 mb-6 flex items-center gap-4 sticky top-0 bg-slate-50 z-10 py-4 shadow-sm border-b border-slate-200">
                <button
                    onClick={handleBack}
                    className="p-2 -ml-2 hover:bg-white border text-slate-500 border-transparent hover:border-slate-200 hover:shadow-sm rounded-xl transition-all"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Nouvelle Fiche Prospect</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Saisie Manuelle</p>
                </div>
            </header>

            <div className="px-6 pb-28 space-y-8 max-w-3xl mx-auto w-full">
                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    
                    <LeadForm
                        source="commercial"
                        agentId={userId || undefined}
                        locationContext={typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('location') || undefined) : undefined}
                        onSubmitSuccess={handleSuccess}
                    />
                </div>
            </div>
        </div>
    );
}
