"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    BarChart3,
    Download,
    Users,
    TrendingUp,
    Monitor,
    Loader2,
    Calendar,
    RefreshCw,
    Plus,
    HardDrive,
    Server,
    QrCode,
    LayoutTemplate,
    ShieldCheck,
    ArrowUpRight,
    ArrowDownRight,
    Database,
    Zap,
    Clock
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useTranslation } from "@/src/context/LanguageContext";
import { getDashboardV2Data } from "@/app/actions/dashboard";
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from 'recharts';

/**
 * 📊 ENTERPRISE DYNAMIC DASHBOARD V2
 * "The Control Tower"
 */
export default function AdminDashboardPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [period, setPeriod] = useState("global");

    const fetchData = async (showLoading = true, currentPeriod = period) => {
        if (showLoading) setIsLoading(true);
        try {
            const res = await getDashboardV2Data(currentPeriod);
            setData(res);
            setLastUpdated(new Date());
        } catch (e: any) {
            if (e.message.includes("Unauthorized")) {
                router.push("/admin/login");
            } else {
                toast.error("Erreur de synchronisation");
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData(true, period);
        // 🔄 Periodic refresh (30s) for "Real-time Feel"
        const interval = setInterval(() => fetchData(false, period), 30000);
        return () => clearInterval(interval);
    }, [period]);

    const handleLogout = async () => {
        await fetch('/api/auth', { method: 'DELETE' });
        window.location.href = "/admin/login";
    };

    if (isLoading && !data) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-300">
                <div className="flex flex-col items-center gap-4 text-indigo-600 dark:text-indigo-400">
                    <div className="relative">
                        <Loader2 className="w-16 h-16 animate-spin opacity-20" />
                        <Zap className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <p className="font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Wasla Control Tower • Initializing</p>
                </div>
            </div>
        );
    }

    const { stats, analytics, trends, health, topAgents, branding, conversion } = data;

    // Derived stats for "Trend" simulation (since we don't have historical comparison in this view)
    const leadTrend = stats.totalLeads > 0 ? Math.round((stats.leadsToday / (stats.totalLeads || 1)) * 100) : 0;

    return (
        <div className="flex-1 selection:bg-indigo-500/30 font-sans transition-colors duration-300 bg-slate-50 dark:bg-slate-950 min-h-screen">
            <main className="p-6 lg:p-8 space-y-10 max-w-7xl mx-auto w-full">
                
                {/* 🚀 QUICK ACTIONS & SYSTEM STATUS */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 p-4 rounded-[28px] shadow-sm">
                    <div className="flex items-center gap-6 px-4">
                        <div className="flex items-center gap-2">
                            <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                Live Sync: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        <div className="hidden sm:flex items-center gap-4 border-l border-slate-100 dark:border-white/10 pl-6">
                             <div className="flex items-center gap-2">
                                <HardDrive className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{health.dbSize} MB</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <RefreshCw className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{health.syncQueueCount} Pending</span>
                             </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                         <button 
                            onClick={() => router.push("/leads/new")}
                            className="bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-500 dark:hover:bg-indigo-400 px-6 py-2.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 dark:shadow-none active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Lead</span>
                        </button>
                    </div>
                </div>
                
                {/* 🎛️ DASHBOARD HEADER & PERIOD SELECTOR */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                            <LayoutTemplate className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Master Dashboard</span>
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Command <span className="bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent italic">Tower</span></h2>
                        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">Real-time intelligence for {branding?.event_name}.</p>
                    </div>
                    
                    <div className="flex p-1.5 bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-[20px] shadow-xl">
                        {[
                            { id: 'today', label: 'Aujourd\'hui' },
                            { id: 'salon', label: 'Salon' },
                            { id: 'global', label: 'Global' }
                        ].map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setPeriod(p.id)}
                                className={`px-6 py-3 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                                    period === p.id 
                                        ? 'bg-indigo-600 dark:bg-white text-white dark:text-black shadow-lg scale-105' 
                                        : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 🍱 BENTO GRID: LEVEL 1 (Critical KPIs) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* KPI 1: Leads */}
                    <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 p-7 rounded-[32px] relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-500 shadow-sm">
                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all" />
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <Users className="w-5 h-5" />
                            </div>
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${leadTrend > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/10 text-slate-500 dark:text-slate-400'}`}>
                                <ArrowUpRight className="w-3 h-3" />
                                {leadTrend}%
                            </div>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Leads Captured</p>
                        <h3 className="text-4xl font-black text-slate-900 dark:text-white tabular-nums">{stats.totalLeads}</h3>
                        <div className="mt-4 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 w-[70%] rounded-full shadow-sm" />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Target</span>
                        </div>
                    </div>

                    {/* KPI 2: Page Views */}
                    <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 p-7 rounded-[32px] relative overflow-hidden group hover:border-blue-500/30 transition-all duration-500 shadow-sm">
                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all" />
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Monitor className="w-5 h-5" />
                            </div>
                            <TrendingUp className="w-4 h-4 text-blue-500/40" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Digital Traffic</p>
                        <h3 className="text-4xl font-black text-slate-900 dark:text-white tabular-nums">{analytics.totalPageViews}</h3>
                        <p className="text-[9px] font-black text-blue-600/50 dark:text-blue-500/50 uppercase tracking-widest mt-2">Views Across Network</p>
                    </div>

                    {/* KPI 3: NFC Scans */}
                    <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 p-7 rounded-[32px] relative overflow-hidden group hover:border-violet-500/30 transition-all duration-500 shadow-sm">
                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-all" />
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-600 dark:text-violet-400">
                                <QrCode className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Live Interactions</p>
                        <h3 className="text-4xl font-black text-slate-900 dark:text-white tabular-nums">{analytics.totalNfcScans}</h3>
                        <p className="text-[9px] font-black text-violet-500/50 uppercase tracking-widest mt-2">NFC & QR Touchpoints</p>
                    </div>

                    {/* KPI 4: Rewards */}
                    <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 p-7 rounded-[32px] relative overflow-hidden group hover:border-amber-500/30 transition-all duration-500 shadow-sm">
                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all" />
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Rewards Claimed</p>
                        <h3 className="text-4xl font-black text-slate-900 dark:text-white tabular-nums">{stats.rewardsGiven}</h3>
                        <p className="text-[9px] font-black text-amber-600/50 dark:text-amber-500/50 uppercase tracking-widest mt-2">Conversion: {Math.round((stats.rewardsGiven / (stats.totalLeads || 1)) * 100)}% of Leads</p>
                    </div>
                </div>

                {/* 🍱 BENTO GRID: LEVEL 2 (Large Visuals) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Performance Trends (Large) */}
                    <div className="lg:col-span-8 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 p-10 rounded-[40px] flex flex-col group shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Performance Velocity</h3>
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Acquisition vs Awareness (Last 7 Days)</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/40" />
                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Leads</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 border-2 border-slate-200 dark:border-white/20 rounded-full" />
                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Views</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 min-h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trends}>
                                    <defs>
                                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                    <XAxis 
                                        dataKey="date" 
                                        stroke="#475569" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false}
                                        tickFormatter={(val) => new Date(val).toLocaleDateString('fr', { weekday: 'short' })}
                                        dy={15}
                                    />
                                    <YAxis hide />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '12px' }}
                                        itemStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                                        cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="leads" 
                                        stroke="#6366f1" 
                                        strokeWidth={4} 
                                        fillOpacity={1} 
                                        fill="url(#chartGradient)" 
                                        animationDuration={2000}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="views" 
                                        stroke="rgba(255,255,255,0.1)" 
                                        strokeWidth={2} 
                                        strokeDasharray="8 8" 
                                        fillOpacity={0} 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Agent Leaderboard (Sidebar) */}
                    <div className="lg:col-span-4 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 p-10 rounded-[40px] flex flex-col relative overflow-hidden group shadow-sm">
                        <div className="absolute top-0 right-0 p-8">
                            <TrendingUp className="w-12 h-12 text-indigo-500/10 group-hover:scale-125 transition-transform duration-700" />
                        </div>
                        
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">Top Agents</h3>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-10">Real-time Performance</p>
                        
                        <div className="flex-1 space-y-8">
                            {topAgents.length > 0 ? topAgents.map((agent: any, idx: number) => (
                                <div key={agent.name} className="flex items-center gap-5 group/agent">
                                    <div className="relative w-12 h-12">
                                        <div className="absolute inset-0 bg-indigo-500/10 rounded-2xl rotate-6 group-hover/agent:rotate-12 transition-transform" />
                                        <div className="absolute inset-0 bg-slate-900 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 shadow-xl transition-colors">
                                            {idx + 1}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="font-black text-sm text-slate-900 dark:text-white truncate uppercase tracking-tight">{agent.name}</p>
                                            <p className="font-black text-xs text-indigo-600 dark:text-indigo-400">{agent.count}</p>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-[1.5s] ease-out" 
                                                style={{ width: `${(agent.count / (topAgents[0].count || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-700">
                                    <Users className="w-12 h-12 mb-4 opacity-10" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No active telemetry</p>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={() => router.push("/admin/users")}
                            className="mt-10 w-full py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400 transition-all active:scale-[0.98]"
                        >
                            View All Teams
                        </button>
                    </div>
                </div>

                {/* 🍱 BENTO GRID: LEVEL 3 (Conversion & System) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Conversion Tunnel (Bento 7/12) */}
                    <div className="lg:col-span-7 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 p-10 rounded-[40px] flex flex-col group shadow-sm">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Conversion Tunnel</h3>
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Funnel Intelligence</p>
                            </div>
                            <BarChart3 className="w-6 h-6 text-slate-400 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                        </div>

                        <div className="flex-1 min-h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={conversion} layout="vertical" barSize={32} margin={{ left: 40, right: 40 }}>
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        stroke="#94a3b8" 
                                        fontSize={10}
                                        width={80}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }}
                                        itemStyle={{ fontSize: '10px', fontWeight: '900' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 10, 10, 0]} animationDuration={1500}>
                                        {conversion.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-100 dark:border-white/5">
                            {conversion.map((item: any) => (
                                <div key={item.name} className="text-center">
                                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{item.name}</p>
                                    <p className="text-lg font-black text-slate-900 dark:text-white">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* System Health (Bento 5/12) */}
                    <div className="lg:col-span-5 bg-indigo-500/5 dark:bg-indigo-900/10 border border-indigo-500/10 dark:border-indigo-500/20 p-10 rounded-[40px] flex flex-col relative overflow-hidden group shadow-sm">
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all" />
                        
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">System Node</h3>
                                <p className="text-[10px] font-black text-indigo-600/60 dark:text-indigo-400/60 uppercase tracking-[0.2em]">Operational Health</p>
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${health.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                {health.status}
                            </div>
                        </div>

                        <div className="flex-1 space-y-8">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                                    <Database className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">SQLite Archive</p>
                                    <h4 className="text-2xl font-black text-slate-900 dark:text-white">{health.dbSize} <span className="text-sm font-normal text-slate-400 dark:text-slate-500 uppercase">MB</span></h4>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
                                    <RefreshCw className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Cloud Sync Queue</p>
                                    <div className="flex items-center gap-3">
                                        <h4 className="text-2xl font-black text-slate-900 dark:text-white">{health.syncQueueCount} <span className="text-sm font-normal text-slate-400 dark:text-slate-500 uppercase">items</span></h4>
                                        {health.syncQueueCount > 0 && <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 p-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl flex items-center justify-between transition-colors">
                            <div className="flex items-center gap-3">
                                <Server className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Worker Latency</span>
                            </div>
                            <span className="text-[10px] font-black text-emerald-500">12ms</span>
                        </div>
                    </div>
                </div>

                {/* 🍱 BENTO GRID: LEVEL 4 (Quick Shortcuts) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 pb-20">
                    {[
                        { label: 'Deep Analytics', title: 'Intelligence', icon: BarChart3, path: '/admin/analytics', color: 'indigo' },
                        { label: 'Brand Settings', title: 'White-Label', icon: LayoutTemplate, path: '/admin/settings', color: 'blue' },
                        { label: 'Kiosk Entry', title: 'QR Manager', icon: QrCode, path: '/admin/qr', color: 'violet' },
                        { label: 'Data Export', title: 'Backup Center', icon: Download, path: '/admin/settings', color: 'emerald' }
                    ].map((item) => (
                        <div 
                            key={item.label}
                            onClick={() => router.push(item.path)}
                            className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 p-6 rounded-[30px] flex items-center gap-5 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-indigo-500/20 dark:hover:border-white/10 transition-all cursor-pointer group shadow-sm"
                        >
                            <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-400 group-hover:scale-110 group-hover:text-slate-900 dark:group-hover:text-white transition-all shadow-sm group-hover:shadow-indigo-500/10 dark:group-hover:shadow-white/5">
                                <item.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-0.5">{item.label}</p>
                                <h4 className="font-black text-slate-900 dark:text-white text-sm">{item.title}</h4>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

