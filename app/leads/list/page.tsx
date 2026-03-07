"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    Search,
    Download,
    Loader2,
    Plus,
    Circle,
    CheckCircle2,
    AlertCircle,
    User as UserIcon,
    Monitor,
    QrCode,
} from "lucide-react";
import toast from "react-hot-toast";
import { leadFormSchema, getTableFields } from "@/src/config/formSchema";

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA-DRIVEN TABLE COLUMNS
// Columns are derived from formSchema fields marked showInTable: true.
// To change columns across the ENTIRE APP, only edit formSchema.ts.
// ─────────────────────────────────────────────────────────────────────────────
const TABLE_COLUMNS = getTableFields(leadFormSchema);

interface Lead {
    id: string;
    source: string;
    created_at: string;
    sync_status: string;
    created_by_name?: string;
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

/** Resolve a field's value from a parsed metadata object */
function getCellValue(field: (typeof TABLE_COLUMNS)[number], meta: Record<string, any>): string {
    const raw = meta[field.name];
    if (raw === null || raw === undefined) return "—";
    if (Array.isArray(raw)) return raw.join(", ") || "—";
    return String(raw) || "—";
}

export default function LeadsListPage() {
    const router = useRouter();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterSource, setFilterSource] = useState("all");
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

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
        let meta: Record<string, any> = {};
        try { meta = JSON.parse(lead.metadata || "{}"); } catch (_) { }

        const searchable = Object.values(meta)
            .map(v => (Array.isArray(v) ? v.join(" ") : String(v ?? "")))
            .join(" ")
            .toLowerCase();

        const matchesSearch = search === "" || searchable.includes(search.toLowerCase());
        const matchesSource = filterSource === "all" || lead.source === filterSource;
        return matchesSearch && matchesSource;
    });

    const isManager = userRole === 'ADMINISTRATOR' || userRole === 'TEAM_LEADER';

    return (
        <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">

            {/* ── HEADER ─────────────────────────────────────────────────────── */}
            <header className="bg-white border-b px-4 md:px-6 py-4 sticky top-0 z-20 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => router.push(isManager ? "/admin/dashboard" : "/dashboard")}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-lg"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                            Liste des Prospects
                        </h1>
                        <p className="text-[10px] text-slate-400 font-semibold">
                            {filteredLeads.length} résultat(s)
                        </p>
                    </div>

                    {/* Export Button — visible only to managers */}
                    {isManager && (
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-60 shadow-md shadow-emerald-200"
                        >
                            {isExporting
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Download className="w-4 h-4" />
                            }
                            {isExporting ? "Export..." : "Export CSV"}
                        </button>
                    )}

                    <button
                        onClick={() => router.push("/leads/new")}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-200"
                    >
                        <Plus className="w-4 h-4" />
                        Nouveau
                    </button>
                </div>
            </header>

            {/* ── FILTERS ────────────────────────────────────────────────────── */}
            <div className="bg-white border-b px-4 md:px-6 py-3 sticky top-[65px] z-10">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Rechercher nom, société, téléphone..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-slate-50"
                        />
                    </div>
                    {/* Source Filter */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        {["all", "commercial", "kiosk", "qrcode"].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilterSource(f)}
                                className={`px-3 py-2 border rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-all ${filterSource === f
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
            <div className="flex-1 overflow-auto p-4 md:p-6">
                <div className="max-w-7xl mx-auto bg-white rounded-[24px] border border-slate-100 shadow-xl overflow-hidden">
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
                                        <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Source</th>
                                        {/* Schema-driven columns from formSchema */}
                                        {TABLE_COLUMNS.map(col => (
                                            <th
                                                key={col.name}
                                                className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap"
                                                style={col.tableWidth ? { minWidth: col.tableWidth } : undefined}
                                            >
                                                {col.label}
                                            </th>
                                        ))}
                                        {/* Trailing columns */}
                                        <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Date</th>
                                        <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Auteur</th>
                                        <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Sync</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredLeads.map(lead => {
                                        let meta: Record<string, any> = {};
                                        try { meta = JSON.parse(lead.metadata || "{}"); } catch (_) { }

                                        return (
                                            <tr
                                                key={lead.id}
                                                onClick={() => router.push(`/leads/${lead.id}`)}
                                                className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                                            >
                                                {/* Source badge */}
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    {getSourceBadge(lead.source)}
                                                </td>

                                                {/* Dynamic schema-driven columns */}
                                                {TABLE_COLUMNS.map(col => {
                                                    const value = getCellValue(col, meta);
                                                    const isArray = col.type === 'multiselect' || col.type === 'chip-group';
                                                    return (
                                                        <td
                                                            key={col.name}
                                                            className="px-4 py-4 max-w-[220px]"
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
                                                                <span className="font-semibold text-slate-700 truncate block" title={value}>
                                                                    {value}
                                                                </span>
                                                            )}
                                                        </td>
                                                    );
                                                })}

                                                {/* Date */}
                                                <td className="px-4 py-4 text-slate-400 text-xs whitespace-nowrap">
                                                    {new Date(lead.created_at).toLocaleDateString('fr-FR', {
                                                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </td>

                                                {/* Author */}
                                                <td className="px-4 py-4 text-slate-500 text-xs font-semibold whitespace-nowrap">
                                                    {lead.created_by_name || "Système"}
                                                </td>

                                                {/* Sync status */}
                                                <td className="px-4 py-4 text-center">
                                                    {getStatusIcon(lead.sync_status)}
                                                </td>
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
