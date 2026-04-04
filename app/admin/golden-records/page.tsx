"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    ShieldCheck,
    Download,
    Loader2,
    Link2,
    History,
    Search,
    X,
    GitBranch,
    AlertTriangle,
    ExternalLink
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "@/src/context/LanguageContext";
import { useFormConfig, getTableFields, FormField } from "@/src/hooks/useFormConfig";

// 🌳 LINEAGE STORY MODAL COMPONENT
function LineageStoryModal({ leadId, onClose }: { leadId: string; onClose: () => void }) {
    const router = useRouter();
    const [lead, setLead] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { t } = useTranslation();

    useEffect(() => {
        const fetchLineage = async () => {
             try {
                const res = await fetch(`/api/leads/${leadId}`);
                if (res.ok) {
                    const data = await res.json();
                    setLead(data.lead);
                }
             } catch (e) {
                 toast.error("Failed to fetch lineage.");
             } finally {
                 setLoading(false);
             }
        };
        fetchLineage();
    }, [leadId]);

    if (loading) return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] p-10 flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Génération de l'histoire...</p>
            </div>
        </div>
    );

    if (!lead) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in">
            <div className="bg-slate-50 w-full max-w-2xl max-h-[90vh] rounded-[48px] shadow-2xl border border-white/20 overflow-hidden flex flex-col relative scale-in-center">
                
                {/* Close Trigger */}
                <button onClick={onClose} className="absolute top-8 right-8 p-3 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-full transition-all z-20 shadow-lg border border-slate-100">
                    <X className="w-5 h-5" />
                </button>

                <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-10">
                    
                    {/* Golden Record Title */}
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-[24px] shadow-xl shadow-amber-200 flex items-center justify-center">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <div>
                             <h2 className="text-2xl font-black text-slate-900 tracking-tight">{lead.contact}</h2>
                             <p className="text-[10px] uppercase font-black tracking-[0.2em] text-amber-600">Golden Identity • Verified Record</p>
                        </div>
                    </div>

                    {/* The Visual Story Section */}
                    <div className="space-y-6">
                        <h3 className="text-[10px] uppercase font-black text-slate-400 flex items-center gap-2">
                             <GitBranch className="w-4 h-4" /> The Lineage & Business Story
                        </h3>

                        {/* Integration Path Visual */}
                        <div className="bg-white p-8 rounded-[40px] border border-amber-100 shadow-sm relative overflow-hidden">
                             <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-amber-50 rounded-full blur-3xl opacity-50" />
                             
                             {/* The Golden Result */}
                             <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-amber-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-100">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-0.5">Golden Record State</p>
                                    <p className="font-bold text-slate-800 text-sm">{lead.contact} (Active)</p>
                                </div>
                             </div>

                             {/* Intelligence Narrative */}
                             {lead._logs && lead._logs.length > 0 && (
                                <div className="mb-8 ml-6 pl-8 border-l-2 border-dashed border-amber-200 py-2">
                                     <div className="bg-amber-50 p-5 rounded-[24px] border border-amber-100 space-y-3 shadow-inner">
                                        <div className="flex items-center gap-2 text-amber-700 font-bold text-[10px] uppercase tracking-widest">
                                            <AlertTriangle className="w-3.5 h-3.5" /> Intelligence memo
                                        </div>
                                        {lead._logs.map((log: any, i: number) => (
                                            <p key={i} className="text-sm font-medium text-amber-900 leading-relaxed italic">&quot;{log.message}&quot;</p>
                                        ))}
                                     </div>
                                </div>
                             )}

                             {/* Tree Origin(s) */}
                             <div className="space-y-4">
                                {(lead._lineage || []).map((parent: any, i: number) => (
                                    <div key={i} className="flex items-center gap-4 group">
                                         <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-200 group-hover:bg-amber-50 group-hover:text-amber-500 transition-colors">
                                              <History className="w-6 h-6" />
                                         </div>
                                         <div className="flex-1 bg-slate-50 border border-slate-100 p-4 rounded-[24px] flex justify-between items-center group-hover:bg-white group-hover:border-amber-200 transition-all">
                                             <div>
                                                 <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Origin Archive {i+1}</p>
                                                 <p className="font-bold text-slate-700 text-xs">{parent.name} • {parent.company || "—"}</p>
                                             </div>
                                             <span className="text-[8px] font-black bg-slate-200 text-slate-500 px-2 py-1 rounded-md uppercase tracking-tighter">Archived</span>
                                         </div>
                                    </div>
                                ))}
                                {(!lead._lineage || lead._lineage.length === 0) && (
                                    <div className="flex items-center gap-4 group">
                                         <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center border border-amber-100">
                                              <History className="w-6 h-6" />
                                         </div>
                                         <div className="flex-1 bg-amber-50/10 border border-amber-100 p-4 rounded-[24px]">
                                             <p className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-0.5">Origin Point</p>
                                             <p className="font-bold text-slate-600 text-xs">Direct Verification (Promoted)</p>
                                         </div>
                                    </div>
                                )}
                             </div>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-8 border-t border-slate-100 bg-white flex justify-between items-center">
                    <button 
                        onClick={() => router.push(`/admin/leads/${lead.id}`)}
                        className="flex items-center gap-2 text-indigo-600 font-black uppercase tracking-widest text-[10px] hover:underline"
                    >
                         <ExternalLink className="w-4 h-4" /> Edit Full Profile
                    </button>
                    <button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200 hover:scale-105 transition-all">
                        Fermer l'histoire
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function GoldenRecordsPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

    const { config: formConfig } = useFormConfig();
    const TABLE_COLUMNS = formConfig ? getTableFields(formConfig) : [];

    useEffect(() => {
        const fetchGoldenLeads = async () => {
            try {
                const res = await fetch("/api/admin/golden-records");
                if (res.ok) {
                    const data = await res.json();
                    setLeads(data.leads || []);
                } else {
                    toast.error("Failed to load Golden Records.");
                }
            } catch (err) {
                toast.error("Network error.");
            } finally {
                setLoading(false);
            }
        };
        fetchGoldenLeads();
    }, []);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const res = await fetch('/api/export');
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Export failed');
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `wasla_golden_records_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success(t('intelligence.exportSuccess') || '✅ Export CSV téléchargé');
        } catch (err: any) {
            toast.error(err.message || "Erreur d'export");
        } finally {
            setIsExporting(false);
        }
    };

    const filteredLeads = leads.filter(lead => {
        const searchable = Object.values(lead)
            .map(v => (Array.isArray(v) ? v.join(" ") : String(v ?? "")))
            .join(" ")
            .toLowerCase();
        return search === "" || searchable.includes(search.toLowerCase());
    });

    const getCellValue = (field: FormField, meta: Record<string, any>) => {
        const raw = meta[field.name];
        if (raw === null || raw === undefined) return "—";
        if (Array.isArray(raw)) return raw.join(", ") || "—";
        return String(raw) || "—";
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
            
            {/* 🌳 Lineage Modal */}
            {selectedLeadId && (
                <LineageStoryModal 
                    leadId={selectedLeadId} 
                    onClose={() => setSelectedLeadId(null)} 
                />
            )}

            <header className="bg-amber-50 border-b border-amber-200 px-4 md:px-6 py-4 sticky top-0 z-20 shadow-sm">
                <div className="w-full flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => router.push("/admin/dashboard")}
                        className="p-2 -ml-2 text-amber-700 hover:bg-amber-100 rounded-lg"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1 flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-200 flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-amber-900 uppercase tracking-tight">
                                {t('intelligence.goldenRecordsMenu') || "Golden Records"}
                            </h1>
                            <p className="text-[10px] text-amber-600/80 font-semibold uppercase tracking-widest">
                                {t('intelligence.cleanRoomDesc') || "Premium Verified Database"} • {filteredLeads.length}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:scale-105 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-60 shadow-lg shadow-orange-300"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Business Extraction
                    </button>
                </div>
            </header>

            <div className="bg-white border-b px-6 py-4 z-10 shadow-sm">
                <div className="relative max-w-xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search by name, company, intelligence logs..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-400"
                    />
                </div>
            </div>

            <div className="flex-1 p-4 md:p-6 overflow-x-auto min-h-0 bg-slate-50">
                <div className="bg-white rounded-3xl shadow-sm border border-amber-100/50 overflow-hidden min-w-[800px]">
                    {filteredLeads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-center">
                            <ShieldCheck className="w-16 h-16 text-slate-200 mb-4" />
                            <p className="text-sm font-bold text-slate-400">No Golden Records found</p>
                            <p className="text-xs text-slate-400">Merge leads or promote them to build the Clean Room.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-amber-50 bg-amber-50/20">
                                    <th className="px-6 py-4 text-[10px] font-black text-amber-700/60 uppercase tracking-widest">Type</th>
                                    {TABLE_COLUMNS.map(col => (
                                        <th key={col.name} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {col.label}
                                        </th>
                                    ))}
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identities</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredLeads.map((lead) => {
                                    const meta = lead; // It is already flattened
                                    const isManuallyPromoted = meta._is_golden === true;
                                    const hasLineage = lead.lineage_count > 0;
                                    
                                    const multiPhone = Array.isArray(meta.phone) ? meta.phone.length : 1;
                                    const multiEmail = Array.isArray(meta.email) ? meta.email.length : 1;
                                    const idCount = Math.max(multiPhone, multiEmail, hasLineage ? 2 : 1);

                                    return (
                                        <tr 
                                            key={lead.id} 
                                            onClick={() => setSelectedLeadId(lead.id)}
                                            className="hover:bg-amber-50/30 cursor-pointer transition-colors group"
                                        >
                                            <td className="px-6 py-4">
                                                {isManuallyPromoted && !hasLineage ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-200 shadow-inner">
                                                        <ShieldCheck className="w-3 h-3" /> Promoted
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-200 shadow-inner">
                                                        <History className="w-3 h-3" /> Merged 
                                                    </span>
                                                )}
                                            </td>
                                            
                                            {TABLE_COLUMNS.map(col => (
                                                <td key={col.name} className="px-6 py-4 text-sm font-semibold text-slate-700 max-w-[200px] truncate group-hover:text-amber-900">
                                                    {getCellValue(col, meta)}
                                                </td>
                                            ))}

                                            <td className="px-6 py-4">
                                                {idCount > 1 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-600 rounded-md text-[10px] font-black">
                                                        <Link2 className="w-3 h-3" />
                                                        {idCount} Contacts
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-400">Clean</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-slate-400 text-xs font-medium text-right">
                                                {new Date(lead.created_at).toLocaleDateString('fr-FR', {
                                                    day: '2-digit', month: '2-digit'
                                                })}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
