"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ChevronLeft,
    Edit,
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
            let localLead = null;
            // 1. Try Dexie first (Offline Support)
            try {
                const { getLead } = await import('@/src/db/client');
                const record = await getLead(id as string);
                if (record) {
                    // Munge payload into the shape expected by View page
                    localLead = { 
                        id: record.client_uuid, 
                        sync_status: record.sync_status,
                        source: record.type,
                        created_at: new Date(record.timestamp).toISOString(),
                        ...record.payload 
                    };
                }
            } catch (e) {}

            if (localLead) {
                setLead(localLead as Lead);
                setLoading(false);
                return;
            }

            // 2. Fallback to API if online
            if (!navigator.onLine) {
                throw new Error("Offline & not found locally.");
            }

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
        <div className="flex-1 flex flex-col pt-4 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-300">
            <header className="px-4 py-4 mb-4 flex items-center justify-between border-b dark:border-white/5 bg-white dark:bg-white/5 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/leads/list")}
                        className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Détail du lead</h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => router.push(`/leads/${id}/edit`)}
                        className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400 transition-colors"
                    >
                        <Edit className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {isKioskUnqualified && (
                <div className="mx-4 mb-6 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 p-5 rounded-[24px] flex flex-col gap-3 shadow-sm">
                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-black uppercase text-xs tracking-widest">
                        <AlertTriangle className="w-4 h-4" />
                        Lead non qualifié
                    </div>
                    <p className="text-sm text-orange-600 dark:text-orange-300/80 font-medium">Ce prospect s'est auto-enregistré. Enrichissez sa fiche avec ses besoins détaillés.</p>
                    <button
                        onClick={() => router.push(`/leads/${id}/edit`)}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest py-3.5 rounded-xl active:scale-[0.98] transition-all text-xs shadow-lg shadow-orange-200 dark:shadow-none"
                    >
                        Qualifier ce lead
                    </button>
                </div>
            )}

            <div className="px-4 pb-12 space-y-6">
                <section className={`bg-white dark:bg-white/5 p-6 rounded-[32px] border shadow-sm space-y-4 transition-all duration-300 ${isGoldenRecord ? 'border-amber-300 dark:border-amber-500/50 ring-4 ring-amber-50/50 dark:ring-amber-500/5 shadow-amber-100 dark:shadow-none' : 'border-slate-100 dark:border-white/5'}`}>
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center text-3xl font-black uppercase shrink-0 ${isGoldenRecord ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-200 dark:shadow-none' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'}`}>
                            {lead.contact?.charAt(0) || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{lead.contact}</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm truncate uppercase tracking-widest">{lead.societe || "Individuel"}</p>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {lead.source === 'kiosk' && lead.device_id && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest border border-indigo-100/50 dark:border-indigo-500/20">
                                        <MapPin className="w-3 h-3" />
                                        {lead.device_id === 'Generic_QR' ? 'QR Générique' : `Kiosk: ${lead.device_id}`}
                                    </span>
                                )}
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border border-slate-200 dark:border-white/10">
                                    Formulaire v{lead.form_version || 1}
                                </span>
                            </div>
                        </div>
                        {isGoldenRecord && (
                            <div className="flex flex-col items-end gap-3 shrink-0">
                                <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-2xl border-2 border-amber-200 dark:border-amber-500/20 shadow-sm">
                                    <ShieldCheck className="w-5 h-5" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('intelligence.goldenRecord')}</span>
                                </div>
                                {userRole === 'ADMINISTRATOR' && (
                                    <button 
                                        onClick={handleRevertMerge}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 transition-all text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-sm"
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
                    <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <h3 className="font-black text-slate-900 dark:text-white text-[10px] uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-amber-500" />
                            {t('intelligence.secondaryIdentities')}
                        </h3>
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-6 rounded-[32px] border-2 border-amber-100 dark:border-amber-500/20 shadow-inner grid grid-cols-1 md:grid-cols-2 gap-6 transition-colors">
                            {Array.isArray(lead.phone) && lead.phone.length > 1 && (
                                <div className="space-y-2">
                                    <span className="text-[9px] uppercase font-black tracking-widest text-amber-600/70 dark:text-amber-400/50 block">Téléphones fusionnés</span>
                                    <div className="flex flex-wrap gap-2">
                                        {lead.phone.map((p, i) => (
                                            <span key={i} className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${i === 0 ? 'bg-amber-500 text-white shadow-md shadow-amber-200 dark:shadow-none' : 'bg-white dark:bg-white/5 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'}`}>
                                                {p} {i === 0 && <span className="ml-1 opacity-70">(Principal)</span>}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {Array.isArray(lead.email) && lead.email.length > 1 && (
                                <div className="space-y-2">
                                    <span className="text-[9px] uppercase font-black tracking-widest text-amber-600/70 dark:text-amber-400/50 block">Emails fusionnés</span>
                                    <div className="flex flex-wrap gap-2">
                                        {lead.email.map((e, i) => (
                                            <span key={i} className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${i === 0 ? 'bg-amber-500 text-white shadow-md shadow-amber-200 dark:shadow-none' : 'bg-white dark:bg-white/5 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'}`}>
                                                {e} {i === 0 && <span className="ml-1 opacity-70">(Principal)</span>}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {Array.isArray(lead.associated_entities) && lead.associated_entities.length > 0 && (
                                <div className="space-y-2 col-span-full border-t border-amber-200/50 dark:border-amber-500/20 pt-4 mt-2">
                                    <span className="text-[9px] uppercase font-black tracking-widest text-amber-600/70 dark:text-amber-400/50 block">{t('intelligence.associatedEntities')}</span>
                                    <div className="flex flex-wrap gap-2">
                                        {lead.associated_entities.map((ent, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-white dark:bg-white/5 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-black flex items-center gap-2 transition-all">
                                                <Building className="w-3.5 h-3.5 opacity-50" /> {ent}
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
                            <section key={section.id} className="space-y-4">
                                <h3 className="font-black text-slate-900 dark:text-white text-[10px] uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    {section.title}
                                </h3>
                                <div className="bg-white dark:bg-white/5 p-6 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm space-y-6 transition-all duration-300">
                                    {section.fields.map(field => {
                                        const raw = lead[field.name];
                                        if (raw === undefined || raw === null || raw === "") return null;
                                        if (Array.isArray(raw) && raw.length === 0) return null;

                                        const isArray = Array.isArray(raw) || field.type === 'multiselect' || field.type === 'chip-group';

                                        return (
                                            <div key={field.name}>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black mb-1.5 px-1 tracking-widest">{field.label}</p>
                                                {isArray ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {(Array.isArray(raw) ? raw : [raw]).map((v: string) => (
                                                            <span key={v} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-black border border-indigo-100 dark:border-indigo-500/20 transition-colors">
                                                                {v}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 break-words whitespace-pre-wrap px-1 leading-relaxed">{String(raw)}</p>
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
                    <section className="space-y-4 pt-6 animate-in fade-in slide-in-from-bottom-4 relative z-10">
                        <h3 className="font-black text-slate-900 dark:text-white text-[10px] uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                            <GitBranch className="w-4 h-4 text-indigo-500" />
                            {t('intelligence.consolidatedHistory')}
                        </h3>
                        <div className="bg-white dark:bg-white/5 p-8 rounded-[40px] border border-indigo-100 dark:border-indigo-500/20 shadow-sm relative overflow-hidden transition-colors">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-full -mr-24 -mt-24 pointer-events-none" />
                            
                            {/* The Golden Head */}
                            <div className="flex items-center gap-4 mb-10 relative z-10">
                                <div className="w-12 h-12 bg-indigo-600 dark:bg-indigo-500 text-white rounded-[18px] flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-0.5">{t('intelligence.goldenRecord')} • Head</p>
                                    <p className="font-black text-slate-800 dark:text-white text-base leading-none">{lead.contact} • Active</p>
                                </div>
                            </div>

                            {/* Intelligence Logs */}
                            {lead._logs && lead._logs.length > 0 && (
                                <div className="mb-10 ml-6 pl-10 border-l-2 border-dashed border-indigo-100 dark:border-indigo-500/20 relative z-10">
                                    <div className="bg-indigo-50 dark:bg-indigo-500/10 p-5 rounded-[24px] border border-indigo-100 dark:border-indigo-500/20 text-sm font-bold text-indigo-800 dark:text-indigo-300 shadow-inner">
                                        <p className="text-[10px] uppercase tracking-[0.2em] font-black text-indigo-400 dark:text-indigo-500/60 mb-3">{t('intelligence.intelligenceStory')}</p>
                                        <div className="space-y-3">
                                            {lead._logs.map((log: any, idx: number) => (
                                                <p key={idx} className="flex items-start gap-3">
                                                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-indigo-400" />
                                                    <span className="leading-relaxed">{log.message}</span>
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Lineage Tree */}
                            <div className="space-y-6 relative z-10">
                                {lead._lineage.map((parent: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-4 group">
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600 rounded-[18px] flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm transition-all group-hover:scale-110">
                                            <History className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-4 rounded-[24px] flex justify-between items-center group-hover:bg-white dark:group-hover:bg-white/10 group-hover:border-slate-200 dark:group-hover:border-white/10 transition-all shadow-sm">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600 mb-0.5">{t('intelligence.identityLineage')} • Parent {idx+1}</p>
                                                <p className="font-black text-slate-700 dark:text-slate-300 text-sm">
                                                    {parent.name} <span className="mx-2 text-slate-300 dark:text-slate-700">|</span> {parent.company || '—'} 
                                                </p>
                                            </div>
                                            <span className="text-[9px] font-black bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full uppercase tracking-widest shadow-inner">Archived</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                <div className="pt-10 text-center pb-10">
                    <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase font-black tracking-[0.3em] bg-white dark:bg-white/5 py-3 px-6 rounded-full border border-slate-100 dark:border-white/5 inline-block">
                        Saisie le {new Date(lead.created_at).toLocaleString('fr-FR')} • Source: {lead.source}
                    </p>
                </div>
            </div>
        </div>
    );
}
