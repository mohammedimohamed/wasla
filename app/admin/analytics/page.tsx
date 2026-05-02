"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAnalyticsDashboardAction } from "@/app/actions/analytics";
import {
    BarChart3, MousePointer2, Smartphone, Monitor,
    TrendingUp, Users, Tablet, Download, Nfc, Globe, 
    Chrome, Activity, Clock, Loader2, ArrowLeft,
    Search, Filter, FileSpreadsheet
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Stats = Awaited<ReturnType<typeof getAnalyticsDashboardAction>>;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
    return (
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center mb-6`}>
                <Icon className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-5xl font-black text-slate-900 tabular-nums">{value.toLocaleString()}</p>
            <div className={`absolute -bottom-8 -right-8 w-32 h-32 ${color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />
        </div>
    );
}

function DeviceIcon({ device }: { device: string }) {
    if (device === "Mobile") return <Smartphone className="w-8 h-8" />;
    if (device === "Tablet") return <Tablet className="w-8 h-8" />;
    return <Monitor className="w-8 h-8" />;
}

const EVENT_BADGE: Record<string, string> = {
    PAGE_VIEW:     "bg-indigo-50 text-indigo-600",
    NFC_SCAN:      "bg-emerald-50 text-emerald-600",
    FILE_DOWNLOAD: "bg-amber-50 text-amber-600",
};

const EVENT_LABEL: Record<string, string> = {
    PAGE_VIEW:     "Vue",
    NFC_SCAN:      "Scan NFC",
    FILE_DOWNLOAD: "Download",
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");

    useEffect(() => {
        getAnalyticsDashboardAction()
            .then(setStats)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleExport = () => {
        if (!stats) return;
        const headers = ["ID", "Type", "Chemin", "Resource ID", "Appareil", "Navigateur", "Horodatage"];
        const rows = stats.recentEvents.map(e => [
            e.id,
            e.event_type,
            e.path,
            e.resource_id || "N/A",
            e.device_type || "N/A",
            e.browser || "N/A",
            new Date(e.timestamp).toISOString()
        ]);

        const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `wasla_analytics_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 min-h-[60vh]">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Calcul du moteur…</p>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10">

            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => router.push("/admin/dashboard")}
                        className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Analytics Engine</h1>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Données de performance — anonymisées & RGPD-safe</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl border border-emerald-100">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Live Monitoring</span>
                </div>
            </div>

            {/* ── KPI Cards ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={Activity}      label="Total Événements"  value={stats.totalEvents}    color="bg-slate-100 text-slate-600" />
                <StatCard icon={MousePointer2} label="Pages Vues"        value={stats.totalPageViews} color="bg-indigo-50 text-indigo-600" />
                <StatCard icon={Nfc}           label="Scans NFC"         value={stats.totalNfcScans}  color="bg-emerald-50 text-emerald-600" />
                <StatCard icon={Download}      label="Téléchargements"   value={stats.totalDownloads} color="bg-amber-50 text-amber-600" />
            </div>

            {/* ── Second Row ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Top Profils */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <h2 className="text-base font-black text-slate-900 uppercase tracking-widest">Top Profils NFC</h2>
                    </div>

                    {stats.topProfiles.length === 0 ? (
                        <div className="text-center py-12 opacity-30 italic font-bold text-slate-400">
                            En attente de trafic…
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {stats.topProfiles.map((p: any, i: number) => (
                                <div key={p.resource_id} className="flex items-center gap-4">
                                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-orange-300 text-white" : "bg-slate-100 text-slate-400"}`}>
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-slate-900 truncate">{p.name || p.slug || p.resource_id}</p>
                                        <p className="text-[10px] font-bold text-slate-400">/p/{p.slug}</p>
                                    </div>
                                    <div className="flex items-baseline gap-1 shrink-0">
                                        <span className="text-2xl font-black text-slate-900 tabular-nums">{p.visits}</span>
                                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Scans</span>
                                    </div>
                                    {/* Bar */}
                                    <div className="w-24 hidden sm:block">
                                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-indigo-500 transition-all"
                                                style={{ width: `${Math.min(100, (p.visits / (stats.topProfiles[0]?.visits || 1)) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Device Breakdown */}
                <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm flex flex-col">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <h2 className="text-base font-black text-slate-900 uppercase tracking-widest">Appareils</h2>
                    </div>

                    <div className="flex-1 flex flex-col justify-center gap-6">
                        {stats.deviceBreakdown.length === 0 ? (
                            <div className="text-center opacity-30 italic font-bold text-slate-400">En attente…</div>
                        ) : (
                            stats.deviceBreakdown.map((d: any) => {
                                const total = stats.deviceBreakdown.reduce((sum: number, x: any) => sum + x.count, 0);
                                const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                                return (
                                    <div key={d.device}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <DeviceIcon device={d.device} />
                                                <span className="text-sm font-black text-slate-700">{d.device}</span>
                                            </div>
                                            <span className="text-sm font-black text-slate-900">{pct}%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-indigo-500 transition-all"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Browser breakdown */}
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Navigateurs</p>
                        <div className="flex flex-wrap gap-2">
                            {stats.browserBreakdown.map((b: any) => (
                                <span key={b.browser} className="flex items-center gap-1 bg-slate-50 text-slate-600 text-[10px] font-black px-3 py-1.5 rounded-full border border-slate-100">
                                    <Chrome className="w-3 h-3" />
                                    {b.browser} <span className="text-slate-300">·</span> {b.count}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Recent Events ─────────────────────────────────────── */}
            <div className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                            <Clock className="w-5 h-5" />
                        </div>
                        <h2 className="text-base font-black text-slate-900 uppercase tracking-widest">Événements Récents</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Rechercher chemin..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-11 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-48 transition-all"
                            />
                        </div>

                        {/* Type Filter */}
                        <div className="relative">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select 
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="pl-11 pr-8 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer"
                            >
                                <option value="ALL">Tous les types</option>
                                <option value="PAGE_VIEW">Vues</option>
                                <option value="NFC_SCAN">Scans NFC</option>
                                <option value="FILE_DOWNLOAD">Downloads</option>
                            </select>
                        </div>

                        {/* Export Button */}
                        <button 
                            onClick={handleExport}
                            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg active:scale-95"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                <th className="text-left px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Chemin</th>
                                <th className="text-left px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Appareil</th>
                                <th className="text-left px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Navigateur</th>
                                <th className="text-right px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Horodatage</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentEvents
                                .filter(e => {
                                    const matchSearch = e.path.toLowerCase().includes(searchTerm.toLowerCase());
                                    const matchType = typeFilter === "ALL" || e.event_type === typeFilter;
                                    return matchSearch && matchType;
                                })
                                .length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-slate-400 italic font-bold opacity-40">
                                        Aucun événement correspondant aux filtres
                                    </td>
                                </tr>
                            ) : (
                                stats.recentEvents
                                    .filter(e => {
                                        const matchSearch = e.path.toLowerCase().includes(searchTerm.toLowerCase());
                                        const matchType = typeFilter === "ALL" || e.event_type === typeFilter;
                                        return matchSearch && matchType;
                                    })
                                    .map((e: any) => (
                                    <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-4">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase ${EVENT_BADGE[e.event_type] || "bg-slate-100 text-slate-500"}`}>
                                                {EVENT_LABEL[e.event_type] || e.event_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 font-mono text-xs text-slate-600 max-w-[200px] truncate">{e.path}</td>
                                        <td className="px-4 py-4 text-xs font-bold text-slate-600">{e.device_type || "—"}</td>
                                        <td className="px-4 py-4 text-xs font-bold text-slate-600">{e.browser || "—"}</td>
                                        <td className="px-8 py-4 text-right text-xs text-slate-400 font-mono whitespace-nowrap">
                                            {new Date(e.timestamp).toLocaleString("fr-DZ", { dateStyle: "short", timeStyle: "short" })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
