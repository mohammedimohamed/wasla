"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Search, Download, Loader2, Plus,
    Circle, CheckCircle2, AlertCircle, User as UserIcon, Monitor, QrCode, Link2, ShieldCheck
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "@/src/context/LanguageContext";
import { useFormConfig, getTableFields, FormField } from "@/src/hooks/useFormConfig";
import { useSubBarEffect } from "@/src/modules/desktop-ui/hooks/useSubBarEffect";

export interface Lead {
    id: string;
    source: string;
    created_at: string;
    sync_status: string;
    created_by_name?: string;
    form_version?: number;
    score?: number;
    quality_score?: number;
    metadata: string; // Raw JSON from DB — we parse it per-row
    [key: string]: any; // Dynamic metadata fields
}

function getStatusIcon(status: string) {
    switch (status) {
        case "synced": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
        case "pending": return <Circle className="w-4 h-4 text-orange-400 animate-pulse" />;
        case "error": return <AlertCircle className="w-4 h-4 text-red-500" />;
        default: return <Circle className="w-4 h-4 text-gray-300" />;
    }
}

function getSourceBadge(source: string) {
    const styles: Record<string, string> = {
        commercial: "bg-blue-100 text-blue-700",
        kiosk: "bg-slate-100 text-slate-600",
        qrcode: "bg-purple-100 text-purple-700",
    };
    const icons: Record<string, JSX.Element> = {
        commercial: <UserIcon className="w-3 h-3" />,
        kiosk: <Monitor className="w-3 h-3" />,
        qrcode: <QrCode className="w-3 h-3" />,
    };
    const cls = styles[source] || "bg-gray-100 text-gray-500";
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${cls}`}>
            {icons[source]}
            {source}
        </span>
    );
}

function resolveMeta(lead: Lead): Record<string, any> {
    try {
        const parsed = typeof lead.metadata === 'string' ? JSON.parse(lead.metadata || '{}') : (lead.metadata || {});
        // If double-nested (old bug), unwrap it
        if (parsed.metadata && typeof parsed.metadata === 'object' && !Array.isArray(parsed.metadata)) {
            return parsed.metadata;
        }
        return parsed;
    } catch (_) {
        return {};
    }
}

function getCellValue(field: FormField, meta: Record<string, any>): string {
    const raw = meta[field.name];
    if (raw === null || raw === undefined) return "—";
    if (Array.isArray(raw)) return raw.join(", ") || "—";
    return String(raw) || "—";
}

interface LeadListProps {
    isAdmin: boolean;
}

export function LeadList({ isAdmin }: LeadListProps) {
    const { t } = useTranslation();
    const router = useRouter();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterSource, setFilterSource] = useState("all");
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // 📊 DB-driven table columns
    const { config: formConfig } = useFormConfig();
    const TABLE_COLUMNS = formConfig ? getTableFields(formConfig) : [];

    useEffect(() => {
        const init = async () => {
            try {
                const authRes = await fetch('/api/auth');
                if (authRes.ok) {
                    const authData = await authRes.json();
                    setUserRole(authData.user?.role || null);
                }
            } catch (_) { }
            fetchLeads();
        };
        init();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/leads");
            if (res.ok) {
                const data = await res.json();
                setLeads(data.leads || []);
            }
        } catch (err) {
            toast.error("Erreur de chargement des leads");
        } finally {
            setLoading(false);
        }
    };

    const handlePromoteToGold = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await fetch('/api/admin/golden-records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'PROMOTE', id })
            });

            if (res.ok) {
                toast.success(t('intelligence.promoteToGold') || "Promoted to Golden Record");
                setLeads(prev => prev.map(lead => {
                     if (lead.id === id) {
                          const meta = JSON.parse(lead.metadata || '{}');
                          const flat = meta.metadata && !Array.isArray(meta.metadata) ? meta.metadata : meta;
                          flat._is_golden = true;
                          return { ...lead, metadata: JSON.stringify(flat) };
                     }
                     return lead;
                }));
            } else {
                toast.error("Error promoting lead");
            }
        } catch (error) {
            toast.error("Internal Server Error");
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const res = await fetch("/api/export");
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Export failed");
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `wasla_leads_${new Date().toISOString().split("T")[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success("✅ Fichier CSV téléchargé");
        } catch (err: any) {
            toast.error(err.message || "Erreur d'export");
        } finally {
            setIsExporting(false);
        }
    };

    // Filter: search across all metadata string values & source filter
    const filteredLeads = leads.filter(lead => {
        const meta = resolveMeta(lead);

        const searchable = Object.values(meta)
            .map(v => (Array.isArray(v) ? v.join(" ") : String(v ?? "")))
            .join(" ")
            .toLowerCase();

        const matchesSearch = search === "" || searchable.includes(search.toLowerCase());
        const matchesSource = filterSource === "all" || lead.source === filterSource;
        return matchesSearch && matchesSource;
    });

    const isManager = userRole === 'ADMINISTRATOR' || userRole === 'TEAM_LEADER';

    // ── Inject into DesktopLayout sub-bar ───────────────────────────────────
    useSubBarEffect({
        title: "Leads",
        subtitle: `${filteredLeads.length} résultat(s)`,
        actions: (
            <>
                {isManager && isAdmin && (
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-60"
                    >
                        {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        {isExporting ? "Export..." : "Export CSV"}
                    </button>
                )}
                <button
                    onClick={() => router.push(isAdmin ? "/admin/leads/new" : "/leads/new")}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#714B67] hover:bg-[#5a3c52] text-white rounded text-xs font-bold uppercase tracking-wider transition-all"
                >
                    <Plus className="w-3 h-3" />
                    Nouveau
                </button>
            </>
        ),
    });

    return (
        <div className="flex-1 flex flex-col">

            {/* ── FILTERS ────────────────────────────────────────────────────── */}
            <div className="bg-white border-b px-4 md:px-6 py-3">
                <div className="w-full flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Rechercher nom, société, téléphone..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-slate-50"
                        />
                    </div>
                    {/* Source Filter */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        {["all", "commercial", "kiosk", "qrcode"].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilterSource(f)}
                                className={`px-3 py-1.5 border rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-all ${
                                    filterSource === f
                                        ? "bg-slate-900 border-slate-900 text-white"
                                        : "bg-white border-gray-200 text-gray-500 hover:border-slate-400"
                                }`}
                            >
                                {f === "all" ? "Tous" : f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── TABLE ──────────────────────────────────────────────────────── */}
            <div className="flex-1 p-4 md:p-6">
                <div className="w-full bg-white rounded-[24px] border border-slate-100 shadow-xl overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center p-20 text-slate-300">
                            <Loader2 className="w-10 h-10 animate-spin" />
                        </div>
                    ) : filteredLeads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-slate-300 gap-4">
                            <Search className="w-12 h-12 opacity-30" />
                            <p className="font-bold text-sm">Aucun prospect trouvé</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        {/* System columns */}
                                        <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Source</th>
                                        <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Version</th>
                                        {/* Schema-driven columns from formSchema */}
                                        {TABLE_COLUMNS.map(col => (
                                            <th
                                                key={col.name}
                                                className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap"
                                                style={col.tableWidth ? { minWidth: col.tableWidth } : undefined}
                                            >
                                                {col.label}
                                            </th>
                                        ))}
                                        {/* Trailing columns */}
                                        <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Score</th>
                                        <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Date</th>
                                        <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Auteur</th>
                                        <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Sync</th>
                                        {isManager && isAdmin && (
                                            <th className="px-6 py-5 text-right text-[10px] font-black text-amber-500 uppercase tracking-widest">{t('intelligence.promoteToGold') || "Gold"}</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredLeads.map(lead => {
                                        const meta = resolveMeta(lead);
                                        const phones = meta.phone;
                                        const emails = meta.email;
                                        const multiCount = (
                                            (Array.isArray(phones) ? phones.length : 0) +
                                            (Array.isArray(emails) ? emails.length : 0)
                                        );
                                        const isGoldenRecord = multiCount > 2;

                                        return (
                                            <tr
                                                key={lead.id}
                                                onClick={() => router.push(isAdmin ? `/admin/leads/${lead.id}` : `/leads/${lead.id}`)}
                                                className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                                            >
                                                {/* Source badge */}
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    {getSourceBadge(lead.source)}
                                                </td>

                                                {/* Form version badge */}
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold text-[10px] uppercase border border-slate-200">
                                                        v{lead.form_version || 1}
                                                    </span>
                                                </td>

                                                {/* Dynamic schema-driven columns */}
                                                {TABLE_COLUMNS.map(col => {
                                                    const value = getCellValue(col, meta);
                                                    const isArray = col.type === 'multiselect' || col.type === 'chip-group';

                                                    // Check if this is the 'name' column to attach multi-identity badge
                                                    const isNameCol = col.name === 'name' || col.name === 'fullName';

                                                    return (
                                                        <td
                                                            key={col.name}
                                                            className="px-6 py-5 max-w-[220px]"
                                                        >
                                                            {isArray ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {(Array.isArray(meta[col.name]) ? meta[col.name] : [])
                                                                        .slice(0, 3)
                                                                        .map((v: string) => (
                                                                            <span key={v} className="inline-block px-2 py-0.5 bg-blue-50 text-primary text-[10px] font-bold rounded-md">
                                                                                {v}
                                                                            </span>
                                                                        ))
                                                                    }
                                                                    {Array.isArray(meta[col.name]) && meta[col.name].length > 3 && (
                                                                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-md">
                                                                            +{meta[col.name].length - 3}
                                                                        </span>
                                                                    )}
                                                                    {(!Array.isArray(meta[col.name]) || meta[col.name].length === 0) && (
                                                                        <span className="text-slate-300 text-xs">—</span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="font-semibold text-slate-700 truncate flex items-center gap-2" title={value}>
                                                                    {value}
                                                                    {isNameCol && isGoldenRecord && (
                                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded-md text-[9px] font-black animate-pulse">
                                                                            <Link2 className="w-2.5 h-2.5" />
                                                                            +{multiCount - 2}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            )}
                                                        </td>
                                                    );
                                                })}

                                                {/* Score badge */}
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <span className="inline-flex flex-col gap-0.5">
                                                        <span className="font-black text-slate-800">{lead.score || 0} pts</span>
                                                        <span className={`text-[9px] font-bold uppercase tracking-widest ${lead.quality_score && lead.quality_score < 50 ? 'text-red-500' : 'text-emerald-500'}`}>Anti-Fraude: {lead.quality_score || 100}%</span>
                                                    </span>
                                                </td>

                                                {/* Date */}
                                                <td className="px-6 py-5 text-slate-400 text-xs whitespace-nowrap">
                                                    {new Date(lead.created_at).toLocaleDateString('fr-FR', {
                                                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </td>

                                                {/* Author */}
                                                <td className="px-6 py-5 text-slate-500 text-xs font-semibold whitespace-nowrap">
                                                    {lead.created_by_name || "Système"}
                                                </td>

                                                {/* Sync status */}
                                                <td className="px-6 py-5 text-center">
                                                    {getStatusIcon(lead.sync_status)}
                                                </td>

                                                {/* Promote to Gold */}
                                                {isManager && isAdmin && (
                                                    <td className="px-6 py-5 text-right">
                                                        {(!isGoldenRecord && meta._is_golden !== true) ? (
                                                            <button 
                                                                onClick={(e) => handlePromoteToGold(lead.id, e)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors shadow-sm"
                                                            >
                                                                <ShieldCheck className="w-3 h-3" />
                                                                {t('intelligence.verifyAndPromote') || "Verify"}
                                                            </button>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm">
                                                                <ShieldCheck className="w-3 h-3" /> Or
                                                            </span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
