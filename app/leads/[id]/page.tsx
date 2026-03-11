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
    AlertTriangle,
    ShieldCheck,
    GitBranch,
    Link2,
    History,
    RotateCcw
} from "lucide-react";
import toast from "react-hot-toast";
import { useFormConfig } from "@/src/hooks/useFormConfig";
import { useTranslation } from "@/src/context/LanguageContext";

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
    const { t } = useTranslation();

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

    const handleRevertMerge = async () => {
        if (!confirm(t('intelligence.revert') + "?")) return;
        toast.loading(t('common.loading') || "Loading...", { id: 'revert' });
        try {
            const res = await fetch('/api/admin/intelligence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'REVERT_MERGE', id })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(t('intelligence.rollbackSuccess') || "Success", { id: 'revert' });
                router.push('/leads/list');
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast.error(error.message || "Error reverting merge", { id: 'revert' });
        }
    };

    if (loading) return <div className="flex-1 flex items-center justify-center">Chargement...</div>;
    if (!lead) return <div className="flex-1 flex items-center justify-center">Lead non trouvé</div>;

    const isKioskUnqualified = (lead.source === "kiosk" || lead.source === "qrcode") && !lead.qualified_by;

    const multiCount = (Array.isArray(lead.phone) ? lead.phone.length : 0) + (Array.isArray(lead.email) ? lead.email.length : 0);
    const isGoldenRecord = multiCount > 2 || (Array.isArray(lead.associated_entities) && lead.associated_entities.length > 0);

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
                <section className={`bg-white p-6 rounded-3xl border shadow-sm space-y-4 transition-all ${isGoldenRecord ? 'border-amber-300 ring-4 ring-amber-50/50 shadow-amber-100' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold uppercase ${isGoldenRecord ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-200' : 'bg-blue-50 text-primary'}`}>
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
                        {isGoldenRecord && (
                            <div className="ml-auto flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-xl border-2 border-amber-200">
                                    <ShieldCheck className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{t('intelligence.goldenRecord')}</span>
                                </div>
                                {userRole === 'ADMINISTRATOR' && (
                                    <button 
                                        onClick={handleRevertMerge}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 border border-rose-200 transition-colors text-[10px] font-bold uppercase tracking-widest"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        {t('intelligence.revert')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                {isGoldenRecord && (
                    <section className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                        <h3 className="font-bold text-gray-900 text-sm ml-2 flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-amber-500" />
                            {t('intelligence.secondaryIdentities')}
                        </h3>
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-2xl border-2 border-amber-100 shadow-inner grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Array.isArray(lead.phone) && lead.phone.length > 1 && (
                                <div className="space-y-1.5">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-amber-600/70">Téléphones fusionnés</span>
                                    <div className="flex flex-wrap gap-2">
                                        {lead.phone.map((p, i) => (
                                            <span key={i} className={`px-2 py-1 rounded-md text-xs font-bold ${i === 0 ? 'bg-amber-500 text-white' : 'bg-white text-amber-700 border border-amber-200'}`}>
                                                {p} {i === 0 && <span className="ml-1 opacity-70">(Principal)</span>}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {Array.isArray(lead.email) && lead.email.length > 1 && (
                                <div className="space-y-1.5">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-amber-600/70">Emails fusionnés</span>
                                    <div className="flex flex-wrap gap-2">
                                        {lead.email.map((e, i) => (
                                            <span key={i} className={`px-2 py-1 rounded-md text-xs font-bold ${i === 0 ? 'bg-amber-500 text-white' : 'bg-white text-amber-700 border border-amber-200'}`}>
                                                {e} {i === 0 && <span className="ml-1 opacity-70">(Principal)</span>}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {Array.isArray(lead.associated_entities) && lead.associated_entities.length > 0 && (
                                <div className="space-y-1.5 col-span-full border-t border-amber-200/50 pt-3 mt-1">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-amber-600/70">{t('intelligence.associatedEntities')}</span>
                                    <div className="flex flex-wrap gap-2">
                                        {lead.associated_entities.map((ent, i) => (
                                            <span key={i} className="px-2.5 py-1 bg-white border border-amber-200 text-amber-700 rounded-lg text-xs font-bold flex items-center gap-1.5">
                                                <Building className="w-3 h-3 opacity-50" /> {ent}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

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

                {isGoldenRecord && lead._lineage && lead._lineage.length > 0 && (
                    <section className="space-y-3 pt-6 animate-in fade-in slide-in-from-bottom-4 relative z-10">
                        <h3 className="font-bold text-gray-900 text-sm ml-2 flex items-center gap-2">
                            <GitBranch className="w-4 h-4 text-indigo-500" />
                            {t('intelligence.consolidatedHistory')}
                        </h3>
                        <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 pointer-events-none" />
                            
                            {/* The Golden Head */}
                            <div className="flex items-center gap-4 mb-8 relative z-10">
                                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-0.5">{t('intelligence.goldenRecord')} • Head</p>
                                    <p className="font-bold text-slate-800 text-sm">{lead.contact} • Active</p>
                                </div>
                            </div>

                            {/* Intelligence Logs */}
                            {lead._logs && lead._logs.length > 0 && (
                                <div className="mb-8 ml-5 pl-8 border-l-2 border-dashed border-indigo-100 relative z-10">
                                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 text-sm font-semibold text-indigo-800 shadow-inner">
                                        <p className="text-[10px] uppercase tracking-widest font-black text-indigo-400 mb-2">{t('intelligence.intelligenceStory')}</p>
                                        {lead._logs.map((log: any, idx: number) => (
                                            <p key={idx} className="flex items-start gap-2 mb-2 last:mb-0">
                                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                <span>{log.message}</span>
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Lineage Tree */}
                            <div className="space-y-6 relative z-10">
                                {lead._lineage.map((parent: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                                            <History className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 bg-slate-50 border border-slate-100 p-3 rounded-2xl flex justify-between items-center group hover:bg-white hover:border-slate-200 transition-colors shadow-sm">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{t('intelligence.identityLineage')} • Parent {idx+1}</p>
                                                <p className="font-bold text-slate-700 text-xs">
                                                    {parent.name} • {parent.company || '—'} 
                                                </p>
                                            </div>
                                            <span className="text-[9px] font-black bg-slate-200 text-slate-500 px-2 py-0.5 rounded-md uppercase tracking-widest shadow-inner">Archived</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
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
