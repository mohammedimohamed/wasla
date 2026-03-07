'use client';

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import { LeadForm } from "@/src/components/LeadForm";

export default function EditLeadPage() {
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

    if (initialLoading) {
        return (
            <div className="flex-1 flex flex-col pt-4 min-h-screen bg-slate-50 items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!leadData) {
        return (
            <div className="flex-1 flex flex-col pt-4 min-h-screen bg-slate-50 items-center justify-center text-slate-500">
                Impossible de charger le lead.
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col pt-4 min-h-screen bg-slate-50">
            <header className="px-6 mb-6 flex items-center gap-4 sticky top-0 bg-slate-50 z-10 py-4 shadow-sm border-b border-slate-200">
                <button 
                    onClick={() => router.push(`/leads/${id}`)} 
                    className="p-2 -ml-2 hover:bg-white border text-slate-500 border-transparent hover:border-slate-200 hover:shadow-sm rounded-xl transition-all"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Modifier le lead</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Mise à jour</p>
                </div>
            </header>

            <div className="px-6 pb-28 space-y-8 max-w-3xl mx-auto w-full">
                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    
                    {/* Key changes component if leadData changes. We only load it once. */}
                    <LeadForm 
                        source={leadData.source || 'commercial'} 
                        leadId={id as string}
                        defaultValues={leadData}
                        onSubmitSuccess={() => router.push(`/leads/${id}`)} 
                    />
                </div>
            </div>
        </div>
    );
}
