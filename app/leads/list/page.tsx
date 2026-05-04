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
    Link2,
    ShieldCheck,
    Eye,
    EyeOff
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "@/src/context/LanguageContext";
import { useFormConfig, getTableFields, FormField } from "@/src/hooks/useFormConfig";
import { Settings, Check, ListFilter } from "lucide-react";

// TABLE_COLUMNS are now derived from the DB schema inside the component.

interface Lead {
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

/**
 * Resolve the flat metadata object from a lead row.
 * Handles both old broken leads (double-nested: {metadata:{...}}) and new flat leads ({...}).
 */
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

/** Resolve a field's value from a parsed metadata object */
function getCellValue(field: FormField, meta: Record<string, any>): string {
    const raw = meta[field.name];
    if (raw === null || raw === undefined) return "—";
    if (Array.isArray(raw)) return raw.join(", ") || "—";
    return String(raw) || "—";
}

export default function LeadsListPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterSource, setFilterSource] = useState("all");
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [showDisabled, setShowDisabled] = useState(false);
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

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
            
            // Load column preferences
            const saved = localStorage.getItem('wasla_leads_columns');
            if (saved) {
                setVisibleColumns(JSON.parse(saved));
            } else {
                // Default: all visible
                setVisibleColumns(['source', 'form_version', 'score', 'created_at', 'created_by_name', 'sync_status', 'gold_promotion', 'actions']);
            }
            
            fetchLeads();
        };
        init();
    }, [showDisabled]);

    useEffect(() => {
        if (visibleColumns.length > 0) {
            localStorage.setItem('wasla_leads_columns', JSON.stringify(visibleColumns));
        }
    }, [visibleColumns]);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/leads?includeHidden=${showDisabled}`);
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

    const handleToggleStatus = async (id: string, currentStatus: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const nextStatus = currentStatus === 'disabled' ? 'active' : 'disabled';
        
        const confirmMsg = nextStatus === 'disabled' 
            ? "Voulez-vous vraiment désactiver ce lead ? Il sera masqué de la liste principale."
            : "Voulez-vous réactiver ce lead ?";
            
        if (!confirm(confirmMsg)) return;

        try {
            const res = await fetch(`/api/leads/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus })
            });

            if (res.ok) {
                toast.success(nextStatus === 'disabled' ? "Lead désactivé" : "Lead réactivé");
                fetchLeads();
            } else {
                toast.error("Erreur lors de la mise à jour");
            }
        } catch (error) {
            toast.error("Erreur réseau");
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
                // Immediately update local state to reflect promotion visually
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

    const isManager = userRole === 'ADMINISTRATOR';

    // 🛡️ Fixed & Toggleable Column Definitions
    const allSystemCols = [
        { id: 'source', label: 'Source' },
        { id: 'form_version', label: 'Version' },
        { id: 'score', label: 'Score' },
        { id: 'created_at', label: 'Date' },
        { id: 'created_by_name', label: 'Auteur' },
        { id: 'sync_status', label: 'Sync' },
        { id: 'gold_promotion', label: 'Gold', managerOnly: true },
        { id: 'actions', label: 'Actions', fixed: true, managerOnly: true },
    ];

    const getIsColumnVisible = (id: string) => {
        // Dynamic columns are handled differently
        const isDynamic = TABLE_COLUMNS.some(c => c.name === id);
        if (isDynamic) {
            // Check if it's the fixed "Nom" column
            const isFixedName = id === 'name' || id === 'fullName' || id === 'nom' || id === 'contact';
            if (isFixedName) return true;
            
            // For other dynamic columns, check state. 
            // If state is empty (initial load), default to true.
            if (visibleColumns.length === 0) return true;
            return visibleColumns.includes(id);
        }

        // System columns
        const sys = allSystemCols.find(c => c.id === id);
        if (sys?.fixed) return true;
        if (visibleColumns.length === 0) return true;
        return visibleColumns.includes(id);
    };

    const toggleColumn = (id: string) => {
        setVisibleColumns(prev => 
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    return (
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-h-screen">

            {/* ── HEADER ─────────────────────────────────────────────────────── */}
            <header className="bg-white dark:bg-white/5 border-b dark:border-white/10 px-4 md:px-6 py-4 sticky top-0 z-20 shadow-sm backdrop-blur-md">
                <div className="w-full flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => router.push(isManager ? "/admin/dashboard" : "/dashboard")}
                        className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            Liste des Prospects
                        </h1>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-widest">
                            {filteredLeads.length} résultat(s)
                        </p>
                    </div>

                    {/* Export Button — visible only to managers */}
                    {isManager && (
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-60 shadow-md shadow-emerald-200 dark:shadow-none"
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
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-200 dark:shadow-none"
                    >
                        <Plus className="w-4 h-4" />
                        Nouveau
                    </button>

                    {isManager && (
                        <button
                            onClick={() => setShowDisabled(!showDisabled)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                                showDisabled 
                                    ? "bg-amber-50 border-amber-200 text-amber-600 shadow-inner" 
                                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 shadow-sm"
                            }`}
                        >
                            {showDisabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            {showDisabled ? "Masquer Désactivés" : "Voir Désactivés"}
                        </button>
                    )}
                </div>
            </header>

            {/* ── FILTERS ────────────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-900/50 border-b dark:border-white/10 px-4 md:px-6 py-3 sticky top-[65px] z-10 backdrop-blur-md">
                <div className="w-full flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Rechercher nom, société, téléphone..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-all"
                        />
                    </div>
                    {/* Source Filter */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
                        {["all", "commercial", "kiosk", "qrcode"].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilterSource(f)}
                                className={`px-3 py-2 border rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-all ${filterSource === f
                                    ? "bg-slate-900 dark:bg-indigo-500 border-slate-900 dark:border-indigo-500 text-white"
                                    : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-white/30"
                                    }`}
                            >
                                {f === "all" ? "Tous" : f}
                            </button>
                        ))}
                    </div>

                    {/* Column Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowColumnSelector(!showColumnSelector)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                showColumnSelector 
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-inner" 
                                    : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-white/30 shadow-sm"
                            }`}
                        >
                            <ListFilter className="w-4 h-4" />
                            Colonnes
                        </button>

                        {showColumnSelector && (
                            <>
                                <div 
                                    className="fixed inset-0 z-30" 
                                    onClick={() => setShowColumnSelector(false)} 
                                />
                                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-white/10 z-40 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                                    <div className="p-4 border-b dark:border-white/10 bg-slate-50 dark:bg-white/5">
                                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Affichage des colonnes</h3>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                        {/* Dynamic Columns */}
                                        <div className="px-2 py-2 text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Champs Formulaire</div>
                                        {TABLE_COLUMNS.map(col => {
                                            const isFixed = col.name === 'name' || col.name === 'fullName' || col.name === 'nom' || col.name === 'contact';
                                            const isVisible = getIsColumnVisible(col.name);
                                            return (
                                                <button
                                                    key={col.name}
                                                    disabled={isFixed}
                                                    onClick={() => toggleColumn(col.name)}
                                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                                        isFixed ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                                                    }`}
                                                >
                                                    <span className={isVisible ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'}>
                                                        {col.label}
                                                    </span>
                                                    {isVisible && <Check className="w-4 h-4 text-indigo-500" />}
                                                </button>
                                            );
                                        })}
                                        
                                        <div className="h-px bg-slate-100 dark:bg-white/10 my-2 mx-2" />
                                        
                                        {/* System Columns */}
                                        <div className="px-2 py-2 text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Champs Système</div>
                                        {allSystemCols.map(col => {
                                            if (col.managerOnly && !isManager) return null;
                                            const isVisible = getIsColumnVisible(col.id);
                                            return (
                                                <button
                                                    key={col.id}
                                                    disabled={col.fixed}
                                                    onClick={() => toggleColumn(col.id)}
                                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                                        col.fixed ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                                                    }`}
                                                >
                                                    <span className={isVisible ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'}>
                                                        {col.label}
                                                    </span>
                                                    {isVisible && <Check className="w-4 h-4 text-indigo-500" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── TABLE ──────────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-auto p-4 md:p-6">
                <div className="w-full bg-white dark:bg-white/5 rounded-[24px] border border-slate-100 dark:border-white/5 shadow-xl overflow-hidden transition-colors">
                    {loading ? (
                        <div className="flex items-center justify-center p-20 text-indigo-600">
                            <Loader2 className="w-10 h-10 animate-spin" />
                        </div>
                    ) : filteredLeads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-slate-300 dark:text-slate-700 gap-4">
                            <Search className="w-12 h-12 opacity-30" />
                            <p className="font-black text-xs uppercase tracking-widest">Aucun prospect trouvé</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-white/5">
                                        {/* System columns */}
                                        {getIsColumnVisible('source') && <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Source</th>}
                                        {getIsColumnVisible('form_version') && <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Version</th>}
                                        {/* Schema-driven columns from formSchema */}
                                        {TABLE_COLUMNS.map(col => getIsColumnVisible(col.name) && (
                                            <th
                                                key={col.name}
                                                className="px-6 py-5 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap"
                                                style={col.tableWidth ? { minWidth: col.tableWidth } : undefined}
                                            >
                                                {col.label}
                                            </th>
                                        ))}
                                        {/* Trailing columns */}
                                        {getIsColumnVisible('score') && <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Score</th>}
                                        {getIsColumnVisible('created_at') && <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Date</th>}
                                        {getIsColumnVisible('created_by_name') && <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Auteur</th>}
                                        {getIsColumnVisible('sync_status') && <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sync</th>}
                                        {isManager && getIsColumnVisible('gold_promotion') && (
                                            <th className="px-6 py-5 text-right text-[10px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-widest">{t('intelligence.promoteToGold') || "Gold"}</th>
                                        )}
                                        {isManager && getIsColumnVisible('actions') && (
                                            <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
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
                                                onClick={() => router.push(`/leads/${lead.id}`)}
                                                className="hover:bg-indigo-50/50 dark:hover:bg-white/5 cursor-pointer transition-colors group"
                                            >
                                                {/* Source badge */}
                                                {getIsColumnVisible('source') && (
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        {getSourceBadge(lead.source)}
                                                    </td>
                                                )}

                                                {/* Form version badge */}
                                                {getIsColumnVisible('form_version') && (
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase border border-slate-200 dark:border-white/10">
                                                            v{lead.form_version || 1}
                                                        </span>
                                                    </td>
                                                )}

                                                {/* Dynamic schema-driven columns */}
                                                {TABLE_COLUMNS.map(col => getIsColumnVisible(col.name) && (
                                                    <td
                                                        key={col.name}
                                                        className="px-6 py-5 max-w-[220px]"
                                                    >
                                                        {col.type === 'multiselect' || col.type === 'chip-group' ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {(Array.isArray(meta[col.name]) ? meta[col.name] : [])
                                                                    .slice(0, 3)
                                                                    .map((v: string) => (
                                                                        <span key={v} className="inline-block px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-md">
                                                                            {v}
                                                                        </span>
                                                                    ))
                                                                }
                                                                {Array.isArray(meta[col.name]) && meta[col.name].length > 3 && (
                                                                    <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded-md">
                                                                        +{meta[col.name].length - 3}
                                                                    </span>
                                                                )}
                                                                {(!Array.isArray(meta[col.name]) || meta[col.name].length === 0) && (
                                                                    <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="font-bold text-slate-700 dark:text-slate-300 truncate flex items-center gap-2" title={getCellValue(col, meta)}>
                                                                {getCellValue(col, meta)}
                                                                {(col.name === 'name' || col.name === 'fullName' || col.name === 'nom' || col.name === 'contact') && isGoldenRecord && (
                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-md text-[9px] font-black animate-pulse">
                                                                        <Link2 className="w-2.5 h-2.5" />
                                                                        +{multiCount - 2}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        )}
                                                    </td>
                                                ))}

                                                {/* Score badge */}
                                                {getIsColumnVisible('score') && (
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex flex-col gap-0.5">
                                                            <span className="font-black text-slate-800 dark:text-slate-200">{lead.score || 0} pts</span>
                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${lead.quality_score && lead.quality_score < 50 ? 'text-rose-500' : 'text-emerald-500'}`}>Anti-Fraude: {lead.quality_score || 100}%</span>
                                                        </span>
                                                    </td>
                                                )}

                                                {/* Date */}
                                                {getIsColumnVisible('created_at') && (
                                                    <td className="px-6 py-5 text-slate-400 text-xs whitespace-nowrap">
                                                        {new Date(lead.created_at).toLocaleDateString('fr-FR', {
                                                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </td>
                                                )}

                                                {/* Author */}
                                                {getIsColumnVisible('created_by_name') && (
                                                    <td className="px-6 py-5 text-slate-500 dark:text-slate-400 text-xs font-bold whitespace-nowrap">
                                                        {lead.created_by_name || "Système"}
                                                    </td>
                                                )}

                                                {/* Sync status */}
                                                {getIsColumnVisible('sync_status') && (
                                                    <td className="px-6 py-5 text-center">
                                                        {getStatusIcon(lead.sync_status)}
                                                    </td>
                                                )}

                                                {/* Promote to Gold */}
                                                {isManager && getIsColumnVisible('gold_promotion') && (
                                                    <td className="px-6 py-5 text-right">
                                                        {(!isGoldenRecord && meta._is_golden !== true) ? (
                                                            <button 
                                                                onClick={(e) => handlePromoteToGold(lead.id, e)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors shadow-sm"
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

                                                {/* Status Toggle */}
                                                {isManager && getIsColumnVisible('actions') && (
                                                    <td className="px-6 py-5 text-center">
                                                        <button
                                                            onClick={(e) => handleToggleStatus(lead.id, lead.status, e)}
                                                            className={`p-2 rounded-lg transition-all ${
                                                                lead.status === 'disabled'
                                                                    ? "bg-slate-900 text-white hover:bg-black"
                                                                    : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                                                            }`}
                                                            title={lead.status === 'disabled' ? "Réactiver" : "Désactiver"}
                                                        >
                                                            {lead.status === 'disabled' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                        </button>
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
