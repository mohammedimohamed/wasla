"use client";

import { useEffect, useState } from "react";
import { 
    PieChart, 
    BarChart3, 
    TrendingUp, 
    Zap, 
    Filter, 
    Activity, 
    Download, 
    Loader2,
    Users
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "@/src/context/LanguageContext";

export default function AnalyticsPage() {
    const { t } = useTranslation();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch("/api/admin/analytics");
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            toast.error("Failed to load analytics");
        } finally {
            setLoading(false);
        }
    };

    const exportStats = () => {
        if (!stats) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stats));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "wasla_analytics.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 min-h-[60vh] transition-colors duration-300">
                <Loader2 className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Calcul du moteur…</p>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="flex-1 selection:bg-indigo-500/30 font-sans transition-colors duration-300">
            <main className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-10">
                
                {/* ── SUB-HEADER ── */}
                <div className="flex flex-wrap items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Business <span className="text-indigo-600 dark:text-indigo-400">Analytics</span></h2>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-widest uppercase mt-1">Real-time Lead Distribution & Efficiency Metrics</p>
                    </div>
                    
                    <button
                        onClick={exportStats}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xl shadow-indigo-100 dark:shadow-none"
                    >
                        <Download className="w-4 h-4" />
                        Export Intelligence
                    </button>
                </div>

                {/* ── STATS GRID ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-white/5 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm group hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Users className="w-5 h-5" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Total Leads</p>
                        </div>
                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.totalLeads}</p>
                    </div>

                    <div className="bg-white dark:bg-white/5 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm group hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-all">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Promotion Rate</p>
                        </div>
                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.promotionRate}%</p>
                    </div>

                    <div className="bg-white dark:bg-white/5 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm group hover:border-amber-200 dark:hover:border-amber-500/30 transition-all">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Zap className="w-5 h-5" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">High Score Leads</p>
                        </div>
                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.highScoreLeads}</p>
                    </div>

                    <div className="bg-white dark:bg-white/5 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm group hover:border-blue-200 dark:hover:border-blue-500/30 transition-all">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Filter className="w-5 h-5" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Last 7 Days</p>
                        </div>
                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.recentLeads}</p>
                    </div>
                </div>

                {/* ── CHARTS SECTION ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Distribution by Source */}
                    <div className="bg-white dark:bg-white/5 p-8 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-sm transition-colors duration-300">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                            <PieChart className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                            Source Distribution
                        </h3>
                        <div className="space-y-6">
                            {stats.leadsBySource.map((s: any) => (
                                <div key={s.source}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{s.source}</span>
                                        <span className="text-xs font-bold text-slate-900 dark:text-slate-300">{s.count}</span>
                                    </div>
                                    <div className="h-2 bg-slate-50 dark:bg-white/10 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-indigo-500 rounded-full"
                                            style={{ width: `${(s.count / stats.totalLeads) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Agent Performance */}
                    <div className="bg-white dark:bg-white/5 p-8 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-sm transition-colors duration-300">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                            Top Agents Efficiency
                        </h3>
                        <div className="space-y-6">
                            {stats.leadsByAgent.map((a: any) => (
                                <div key={a.agent_name}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{a.agent_name}</span>
                                        <span className="text-xs font-bold text-slate-900 dark:text-slate-300">{a.count} leads</span>
                                    </div>
                                    <div className="h-2 bg-slate-50 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-emerald-500 rounded-full"
                                            style={{ width: `${(a.count / stats.totalLeads) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── RAW DATA LOGS ── */}
                <div className="bg-white dark:bg-white/5 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden transition-colors duration-300">
                    <div className="p-8 border-b border-slate-50 dark:border-white/5 flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                            <Activity className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                            Recent Intelligence Logs
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Timestamp</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Context</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Message</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                {stats.recentLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-widest italic">No logs recorded yet</td>
                                    </tr>
                                ) : (
                                    stats.recentLogs.map((log: any, i: number) => (
                                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-8 py-5 text-xs font-medium text-slate-400 dark:text-slate-500">
                                                {new Date(log.timestamp).toLocaleTimeString()}
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-[10px] font-black bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-lg uppercase tracking-tighter border dark:border-white/5">
                                                    {log.type}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-sm font-bold text-slate-700 dark:text-slate-300">
                                                {log.message}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
