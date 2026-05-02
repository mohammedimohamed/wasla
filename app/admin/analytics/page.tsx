"use client";

import { useEffect, useState } from "react";
import { getAnalyticsStatsAction } from "@/app/actions/analytics";
import { 
    BarChart3, Users, Smartphone, Monitor, 
    ArrowUpRight, TrendingUp, Globe, MousePointer2 
} from "lucide-react";
import { Loader2 } from "lucide-react";

export default function AnalyticsDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const data = await getAnalyticsStatsAction();
                setStats(data);
            } catch (e) {
                console.error("Failed to load stats", e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-400">Calcul du moteur d'analyse...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Analytics Engine</h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Données de performance en temps réel</p>
                </div>
                <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl flex items-center gap-2 border border-emerald-100 animate-pulse">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Live Monitoring active</span>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                            <MousePointer2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Scans / Visites</h3>
                        <p className="text-5xl font-black text-slate-900">{stats?.totalVisits || 0}</p>
                    </div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-50/50 rounded-full blur-3xl transition-transform group-hover:scale-110" />
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Taux de Conversion</h3>
                        <p className="text-5xl font-black text-slate-900">-- %</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-2">Calculé via soumissions de leads</p>
                    </div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-50/50 rounded-full blur-3xl transition-transform group-hover:scale-110" />
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                            <Users className="w-6 h-6" />
                        </div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Utilisateurs Actifs</h3>
                        <p className="text-5xl font-black text-slate-900">{stats?.topProfiles?.length || 0}</p>
                    </div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-amber-50/50 rounded-full blur-3xl transition-transform group-hover:scale-110" />
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Profiles */}
                <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Top Profils</h2>
                    </div>

                    <div className="space-y-6">
                        {stats?.topProfiles?.length > 0 ? stats.topProfiles.map((p: any, i: number) => (
                            <div key={i} className="flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center font-black text-xs">
                                        {i + 1}
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{p.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-black text-slate-900">{p.visits}</span>
                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Scans</span>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-10 opacity-30 italic font-bold">Aucune donnée disponible</div>
                        )}
                    </div>
                </div>

                {/* Device Breakdown */}
                <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Répartition Appareils</h2>
                    </div>

                    <div className="flex items-center justify-around py-10">
                        {stats?.deviceBreakdown?.map((d: any) => (
                            <div key={d.device} className="flex flex-col items-center">
                                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-4 ${d.device === 'Mobile' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-600'}`}>
                                    {d.device === 'Mobile' ? <Smartphone className="w-10 h-10" /> : <Monitor className="w-10 h-10" />}
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest text-slate-400">{d.device}</span>
                                <span className="text-2xl font-black text-slate-900 mt-1">{d.count}</span>
                            </div>
                        ))}
                        {(!stats?.deviceBreakdown || stats.deviceBreakdown.length === 0) && (
                            <div className="text-center opacity-30 italic font-bold w-full">En attente de trafic...</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
