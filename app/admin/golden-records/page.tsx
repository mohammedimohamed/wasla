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
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 flex flex-col items-center gap-4 border dark:border-white/10">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500 dark:text-amber-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Génération de l'histoire...</p>
            </div>
        </div>
    );

    if (!lead) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in transition-colors duration-300">
            <div className="bg-slate-50 dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-[48px] shadow-2xl border border-white/20 dark:border-white/5 overflow-hidden flex flex-col relative scale-in-center">
                
                {/* Close Trigger */}
                <button onClick={onClose} className="absolute top-8 right-8 p-3 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 rounded-full transition-all z-20 shadow-lg border border-slate-100 dark:border-white/5">
                    <X className="w-5 h-5" />
                </button>

                <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-10">
                    
                    {/* Golden Record Title */}
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-[24px] shadow-xl shadow-amber-200 dark:shadow-none flex items-center justify-center">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <div>
                             <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{lead.contact}</h2>
                             <p className="text-[10px] uppercase font-black tracking-[0.2em] text-amber-600 dark:text-amber-400">Golden Identity • Verified Record</p>
                        </div>
                    </div>

                    {/* The Visual Story Section */}
                    <div className="space-y-6">
                        <h3 className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 flex items-center gap-2">
                             <GitBranch className="w-4 h-4" /> The Lineage & Business Story
                        </h3>

                        {/* Integration Path Visual */}
                        <div className="bg-white dark:bg-white/5 p-8 rounded-[40px] border border-amber-100 dark:border-amber-500/10 shadow-sm relative overflow-hidden transition-colors duration-300">
                             <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-amber-50 dark:bg-amber-500/10 rounded-full blur-3xl opacity-50" />
                             
                             {/* The Golden Result */}
                             <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-amber-600 dark:bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-100 dark:shadow-none">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 dark:text-amber-400 mb-0.5">Golden Record State</p>
                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{lead.contact} (Active)</p>
                                </div>
                             </div>

                             {/* Intelligence Narrative */}
                             {lead._logs && lead._logs.length > 0 && (
                                <div className="mb-8 ml-6 pl-8 border-l-2 border-dashed border-amber-200 dark:border-amber-500/30 py-2">
                                     <div className="bg-amber-50 dark:bg-amber-500/10 p-5 rounded-[24px] border border-amber-100 dark:border-amber-500/20 space-y-3 shadow-inner">
                                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-[10px] uppercase tracking-widest">
                                            <AlertTriangle className="w-3.5 h-3.5" /> Intelligence memo
                                        </div>
                                        {lead._logs.map((log: any, i: number) => (
                                            <p key={i} className="text-sm font-medium text-amber-900 dark:text-amber-200 leading-relaxed italic">&quot;{log.message}&quot;</p>
                                        ))}
                                     </div>
                                </div>
                             )}

                             {/* Tree Origin(s) */}
                             <div className="space-y-4">
                                {lead._lineage && lead._lineage.length > 0 && lead._lineage.map((parent: any, i: number) => (
                                    <div key={i} className="flex items-center gap-4 group">
                                         <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-white/5 group-hover:bg-amber-50 dark:group-hover:bg-amber-500/20 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
                                              <History className="w-6 h-6" />
                                         </div>
                                         <div className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-4 rounded-[24px] flex justify-between items-center group-hover:bg-white dark:group-hover:bg-white/10 group-hover:border-amber-200 dark:group-hover:border-amber-500/30 transition-all">
                                             <div>
                                                 <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Origin Archive {i+1}</p>
                                                 <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">{parent.name} • {parent.company || "—"}</p>
                                             </div>
                                             <span className="text-[8px] font-black bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md uppercase tracking-tighter border dark:border-white/5">Archived</span>
                                         </div>
                                    </div>
                                ))}
                                {(!lead._lineage || lead._lineage.length === 0) && (
                                    <div className="flex items-center gap-4 group">
                                         <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 rounded-2xl flex items-center justify-center border border-amber-100 dark:border-amber-500/20 transition-colors">
                                              <History className="w-6 h-6" />
                                         </div>
                                         <div className="flex-1 bg-amber-50/10 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 p-4 rounded-[24px]">
                                             <p className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-0.5">Origin Point</p>
                                             <p className="font-bold text-slate-600 dark:text-slate-400 text-xs">Direct Verification (Promoted)</p>
                                         </div>
                                    </div>
                                )}
                             </div>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-8 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 flex justify-between items-center transition-colors">
                    <button 
                        onClick={() => router.push(`/leads/${lead.id}`)}
                        className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest text-[10px] hover:underline"
                    >
                         <ExternalLink className="w-4 h-4" /> Edit Full Profile
                    </button>
                    <button onClick={onClose} className="px-8 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200 dark:shadow-none hover:scale-105 transition-all">
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
            <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-300">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500 dark:text-amber-400" />
            </div>
        );
    }

    return (
        <div className="flex-1 selection:bg-indigo-500/30 font-sans transition-colors duration-300">
            <main className="p-6 lg:p-8 max-w-7xl mx-auto w-full flex flex-col min-h-0">
                
                {/* 🌳 Lineage Modal */}
                {selectedLeadId && (
                    <LineageStoryModal 
                        leadId={selectedLeadId} 
                        onClose={() => setSelectedLeadId(null)} 
                    />
                )}

                {/* ── SUB-HEADER ── */}
                <div className="flex flex-wrap items-center justify-between gap-6 mb-10">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black text-amber-900 dark:text-amber-500 uppercase tracking-tighter">Golden <span className="text-amber-500 dark:text-amber-400">Records</span></h2>
                        <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-bold tracking-widest uppercase mt-1">Premium Verified Database • {filteredLeads.length} Entries</p>
                    </div>
                    
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600 hover:scale-105 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-60 shadow-lg shadow-amber-200 dark:shadow-none"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Business Extraction
                    </button>
                </div>

            <div className="bg-white dark:bg-slate-900 border-b dark:border-white/5 px-6 py-4 z-10 shadow-sm transition-colors">
                <div className="relative max-w-xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-600 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search by name, company, intelligence logs..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border-none dark:border dark:border-white/10 rounded-xl focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500/50 text-slate-900 dark:text-white transition-all shadow-inner"
                    />
                </div>
            </div>

            <div className="flex-1 p-4 md:p-6 overflow-x-auto min-h-0 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
                <div className="bg-white dark:bg-white/5 rounded-3xl shadow-sm border border-amber-100/50 dark:border-white/5 overflow-hidden min-w-[800px] transition-colors duration-300">
                    {filteredLeads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-center">
                            <ShieldCheck className="w-16 h-16 text-slate-200 dark:text-slate-800 mb-4" />
                            <p className="text-sm font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">No Golden Records found</p>
                            <p className="text-xs text-slate-400 dark:text-slate-600 italic">Merge leads or promote them to build the Clean Room.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-amber-50 dark:border-white/5 bg-amber-50/20 dark:bg-white/5">
                                    <th className="px-6 py-4 text-[10px] font-black text-amber-700/60 dark:text-amber-400/60 uppercase tracking-widest">Type</th>
                                    {TABLE_COLUMNS.map(col => (
                                        <th key={col.name} className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                            {col.label}
                                        </th>
                                    ))}
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Identities</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
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
                                            className="hover:bg-amber-50/30 dark:hover:bg-white/5 cursor-pointer transition-colors group"
                                        >
                                            <td className="px-6 py-4">
                                                {isManuallyPromoted && !hasLineage ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-200 dark:border-amber-500/20 shadow-inner">
                                                        <ShieldCheck className="w-3 h-3" /> Promoted
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-200 dark:border-indigo-500/20 shadow-inner">
                                                        <History className="w-3 h-3" /> Merged 
                                                    </span>
                                                )}
                                            </td>
                                            
                                            {TABLE_COLUMNS.map(col => (
                                                <td key={col.name} className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300 max-w-[200px] truncate group-hover:text-amber-900 dark:group-hover:text-amber-400 transition-colors">
                                                    {getCellValue(col, meta)}
                                                </td>
                                            ))}

                                            <td className="px-6 py-4">
                                                {idCount > 1 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-md text-[10px] font-black border border-orange-200 dark:border-orange-500/20">
                                                        <Link2 className="w-3 h-3" />
                                                        {idCount} Contacts
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600">Clean</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-slate-400 dark:text-slate-500 text-xs font-medium text-right">
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
        </main>
    </div>
    );
}
