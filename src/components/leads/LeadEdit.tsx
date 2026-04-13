'use client';

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import { LeadForm } from "./LeadForm";
import { useSubBarEffect } from "@/src/modules/desktop-ui/hooks/useSubBarEffect";

interface LeadEditProps {
    isAdmin: boolean;
}

export function LeadEdit({ isAdmin }: LeadEditProps) {
    const router = useRouter();
    const { id } = useParams();
    const [initialLoading, setInitialLoading] = useState(true);
    const [leadData, setLeadData] = useState<any>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const res = await fetch(`/api/leads/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setLeadData(data.lead);
                }
            } catch (err) {
                console.error("Erreur de chargement", err);
            } finally {
                setInitialLoading(false);
            }
        };
        init();
    }, [id]);

    const backUrl = isAdmin ? `/admin/leads/${id}` : `/leads/${id}`;

    // ── Inject into DesktopLayout sub-bar ────────────────────────────────────
    useSubBarEffect({
        title: "Modifier le Lead",
        subtitle: "Mise à jour",
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

    if (initialLoading) {
        return (
            <div className="flex-1 flex items-center justify-center p-20">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!leadData) {
        return (
            <div className="flex-1 flex items-center justify-center p-20 text-slate-500">
                Impossible de charger le lead.
            </div>
        );
    }

    return (
        <div className="p-6 max-w-3xl mx-auto w-full">
            <div className="bg-white p-8 rounded-[24px] shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <LeadForm
                    source={leadData.source || 'commercial'}
                    leadId={id as string}
                    defaultValues={leadData}
                    onSubmitSuccess={() => router.push(backUrl)}
                    isAdmin={isAdmin}
                />
            </div>
        </div>
    );
}
