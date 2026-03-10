"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ChevronLeft,
    Edit,
    Trash2,
    User,
    Building,
    Phone,
    Mail,
    MapPin,
    Briefcase,
    Layers,
    FileText,
    Calendar,
    AlertTriangle
} from "lucide-react";
import toast from "react-hot-toast";
import { useFormConfig } from "@/src/hooks/useFormConfig";

interface Lead {
    id: string;
    contact: string;
    societe?: string;
    source: string;
    created_at: string;
    sync_status: string;
    qualified_by?: string;
    form_version?: number;
    [key: string]: any;
}

export default function LeadDetailPage() {
    const router = useRouter();
    const { id } = useParams();
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const { config: formConfig } = useFormConfig();

    useEffect(() => {
        const checkAuth = async () => {
            const res = await fetch('/api/auth');
            if (res.ok) {
                const data = await res.json();
                setUserRole(data.user?.role || null);
            }
        };
        checkAuth();
        fetchLead();
    }, [id]);

    const fetchLead = async () => {
        try {
            const response = await fetch(`/api/leads/${id}`);
            if (response.ok) {
                const data = await response.json();
                setLead(data.lead);
            }
        } catch (error) {
            console.error("Error fetching lead:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex-1 flex items-center justify-center">Chargement...</div>;
    if (!lead) return <div className="flex-1 flex items-center justify-center">Lead non trouvé</div>;

    const isKioskUnqualified = (lead.source === "kiosk" || lead.source === "qrcode") && !lead.qualified_by;

    return (
        <div className="flex-1 flex flex-col pt-4">
            <header className="px-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/leads/list")}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-lg"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold">Détail du lead</h1>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => router.push(`/leads/${id}/edit`)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-primary"
                    >
                        <Edit className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {isKioskUnqualified && (
                <div className="mx-4 mb-6 bg-orange-50 border border-orange-200 p-4 rounded-2xl flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-orange-700 font-bold">
                        <AlertTriangle className="w-5 h-5" />
                        Lead non qualifié
                    </div>
                    <p className="text-sm text-orange-600">Ce prospect s'est auto-enregistré. Enrichissez sa fiche avec ses besoins détaillés.</p>
                    <button
                        onClick={() => router.push(`/leads/${id}/edit`)}
                        className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl active:scale-95 transition-all text-sm"
                    >
                        Qualifier ce lead
                    </button>
                </div>
            )}

            <div className="px-4 pb-12 space-y-6">
                <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-50 text-primary rounded-2xl flex items-center justify-center text-2xl font-bold uppercase">
                            {lead.contact?.charAt(0) || "?"}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{lead.contact}</h2>
                            <p className="text-gray-500">{lead.societe}</p>
                            {lead.source === 'kiosk' && lead.device_id && (
                                <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-md bg-indigo-50 text-[11px] font-black text-indigo-600 uppercase tracking-widest border border-indigo-100/50 mr-2">
                                    <MapPin className="w-3 h-3" />
                                    {lead.device_id === 'Generic_QR' ? 'QR Générique (Kiosk)' : `Kiosk: ${lead.device_id}`}
                                </span>
                            )}
                            <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                                Formulaire v{lead.form_version || 1}
                            </span>
                        </div>
                    </div>
                </section>

                {formConfig?.pages.map(page =>
                    page.sections.map(section => {
                        const hasData = section.fields.some(f => {
                            const val = lead[f.name];
                            if (Array.isArray(val)) return val.length > 0;
                            return val !== undefined && val !== null && val !== "";
                        });

                        if (!hasData) return null;

                        return (
                            <section key={section.id} className="space-y-3">
                                <h3 className="font-bold text-gray-900 text-sm ml-2 flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-primary" />
                                    {section.title}
                                </h3>
                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                    {section.fields.map(field => {
                                        const raw = lead[field.name];
                                        if (raw === undefined || raw === null || raw === "") return null;
                                        if (Array.isArray(raw) && raw.length === 0) return null;

                                        const isArray = Array.isArray(raw) || field.type === 'multiselect' || field.type === 'chip-group';

                                        return (
                                            <div key={field.name}>
                                                <p className="text-[10px] text-gray-400 uppercase font-black mb-1 px-1">{field.label}</p>
                                                {isArray ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {(Array.isArray(raw) ? raw : [raw]).map((v: string) => (
                                                            <span key={v} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold ring-1 ring-blue-100">
                                                                {v}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm font-semibold text-gray-800 break-words whitespace-pre-wrap">{String(raw)}</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })
                )}

                <div className="pt-6 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">
                        Saisie le {new Date(lead.created_at).toLocaleString('fr-FR')} • Source: {lead.source}
                    </p>
                </div>
            </div>
        </div>
    );
}
