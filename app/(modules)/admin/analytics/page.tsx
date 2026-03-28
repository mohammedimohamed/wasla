"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    BarChart3,
    ArrowLeft,
    Monitor,
    Users,
    TrendingUp,
    Clock,
    Target
} from "lucide-react";
import { toast } from "react-hot-toast";

/**
 * 📈 ANALYTICS EXPERT DASHBOARD
 * Advanced metrics reserved for administrators and leaders.
 */
export default function AnalyticsDashboardPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const statsRes = await fetch('/api/analytics');
                if (statsRes.ok) {
                    const statsData = await statsRes.json();
                    setStats(statsData.data);
                } else {
                    toast.error("Module Analytics inactif ou non autorisé");
                    router.push('/admin/dashboard');
                }
            } catch (e) {
                toast.error("Erreur Analytics");
            } finally {
                setIsLoading(false);
            }
        };
        loadStats();
    }, [router]);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
                <div className="flex flex-col items-center gap-4 text-slate-400">
                    <BarChart3 className="w-10 h-10 animate-bounce" />
                    <p className="font-bold uppercase tracking-widest text-[10px]">Chargement Expert...</p>
                </div>
            </div>
        );
    }

    if (!stats) return null;

    const { totalLeads, kioskLeads, commercialLeads, hourlyStats, agentStats } = stats;

    return (
        <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/admin/dashboard")} className="p-2 -ml-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors flex items-center gap-2">
                        <ArrowLeft className="w-5 h-5 font-black" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Retour</span>
                    </button>
                    <div className="flex items-center gap-2 ml-4 text-indigo-600">
                        <BarChart3 className="w-6 h-6" />
                        <h1 className="text-lg font-black uppercase tracking-tight">Analytics Expert</h1>
                    </div>
                </div>
            </header>

            <div className="p-6 space-y-8 max-w-5xl mx-auto w-full pb-20">
                {/* Répartition par Source */}
                <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-5">
                        <TrendingUp className="w-48 h-48" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8 flex items-center gap-2">
                            <Target className="w-4 h-4" /> Répartition Globale
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {[
                                { label: 'Kiosque Automatisé', value: kioskLeads, color: 'bg-indigo-400', icon: Monitor },
                                { label: 'Force de Vente (Saisie Manuelle)', value: commercialLeads, color: 'bg-emerald-400', icon: Users }
                            ].map((source, idx) => (
                                <div key={idx} className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="flex items-center gap-3 font-bold text-sm text-slate-300">
                                            <source.icon className="w-5 h-5 text-slate-400" /> {source.label}
                                        </span>
                                        <span className="text-2xl font-black">{source.value}</span>
                                    </div>
                                    <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                                        <div
                                            className={`h-full ${source.color} rounded-full transition-all duration-1000 ease-out relative overflow-hidden`}
                                            style={{ width: `${totalLeads > 0 ? (source.value / totalLeads) * 100 : 0}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 w-1/2 skew-x-12 -translate-x-full animate-[shimmer_2s_infinite]" />
                                        </div>
                                    </div>
                                    <p className="text-right text-[10px] font-bold text-slate-500">{totalLeads > 0 ? ((source.value / totalLeads) * 100).toFixed(1) : 0}% du total</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Leads par heure */}
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                        <h3 className="text-xs font-black uppercase tracking-[0.1em] text-slate-800 mb-6 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-indigo-500" /> Performance Horaire (Aujourd'hui)
                        </h3>
                        {hourlyStats && hourlyStats.length > 0 ? (
                            <div className="space-y-4">
                                {hourlyStats.map((stat: any, i: number) => {
                                    const maxCount = Math.max(...hourlyStats.map((s: any) => s.count)) || 1;
                                    return (
                                        <div key={i} className="flex items-center gap-4">
                                            <div className="w-16 text-right text-xs font-bold text-slate-400">{stat.hour}</div>
                                            <div className="flex-1 h-8 bg-slate-50 rounded-xl overflow-hidden relative">
                                                <div 
                                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-200 to-indigo-500 rounded-xl"
                                                    style={{ width: `${(stat.count / maxCount) * 100}%` }}
                                                />
                                                <div className="absolute top-0 left-4 h-full flex items-center text-xs font-black text-indigo-900 drop-shadow-sm">
                                                    {stat.count}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center p-8 bg-slate-50 rounded-2xl text-slate-400 text-sm font-medium">
                                Aucune donnée horaire aujourd'hui.
                            </div>
                        )}
                    </div>

                    {/* Performances Agents */}
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                        <h3 className="text-xs font-black uppercase tracking-[0.1em] text-slate-800 mb-6 flex items-center gap-2">
                            <Users className="w-4 h-4 text-emerald-500" /> Leaderboard Force de Vente
                        </h3>
                        {agentStats && agentStats.length > 0 ? (
                            <div className="space-y-4">
                                {agentStats.map((agent: any, i: number) => {
                                    const maxCount = Math.max(...agentStats.map((s: any) => s.conversion_count)) || 1;
                                    return (
                                        <div key={i} className="group relative">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                    {i === 0 && <span className="text-yellow-500">🏆</span>}
                                                    {i === 1 && <span className="text-slate-400">🥈</span>}
                                                    {i === 2 && <span className="text-amber-600">🥉</span>}
                                                    {agent.agent_name}
                                                </span>
                                                <span className="text-sm font-black text-emerald-600">{agent.conversion_count} leads</span>
                                            </div>
                                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-emerald-400 rounded-full"
                                                    style={{ width: `${(agent.conversion_count / maxCount) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center p-8 bg-slate-50 rounded-2xl text-slate-400 text-sm font-medium">
                                Aucun agent n'a encore converti.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
