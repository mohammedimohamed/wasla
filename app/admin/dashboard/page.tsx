"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    BarChart3,
    Gift,
    Download,
    Users,
    ArrowLeft,
    Settings,
    ChevronRight,
    TrendingUp,
    Globe,
    Monitor
} from "lucide-react";

export default function AdminDashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState({
        totalLeads: 0,
        kioskLeads: 0,
        commercialLeads: 0,
        rewardsGiven: 0
    });

    useEffect(() => {
        if (localStorage.getItem("admin_auth") !== "true") {
            router.push("/admin/login");
            return;
        }

        // Fetch stats placeholder
        setStats({
            totalLeads: 45,
            kioskLeads: 28,
            commercialLeads: 17,
            rewardsGiven: 32
        });
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("admin_auth");
        router.push("/login");
    };

    return (
        <div className="flex-1 flex flex-col bg-slate-50">
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/dashboard")} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg text-gray-400">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Console Manager</h1>
                </div>
                <button onClick={handleLogout} className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-error transition-colors">
                    Déconnexion
                </button>
            </header>

            <div className="p-6 space-y-8">
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-2">
                        <div className="w-10 h-10 bg-blue-50 text-primary rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{stats.totalLeads}</p>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Leads</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-2">
                        <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                            <Gift className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{stats.rewardsGiven}</p>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cadeaux</p>
                        </div>
                    </div>
                </div>

                {/* Source Breakdown */}
                <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <TrendingUp className="w-32 h-32" />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Répartition par source</h3>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between items-end text-sm font-bold">
                                <span className="flex items-center gap-2"><Monitor className="w-4 h-4 text-blue-400" /> Kiosque</span>
                                <span>{stats.kioskLeads}</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-400 rounded-full"
                                    style={{ width: `${(stats.kioskLeads / stats.totalLeads) * 100}%` }}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-end text-sm font-bold">
                                <span className="flex items-center gap-2"><Users className="w-4 h-4 text-emerald-400" /> Commercial</span>
                                <span>{stats.commercialLeads}</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-400 rounded-full"
                                    style={{ width: `${(stats.commercialLeads / stats.totalLeads) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Menu Grid */}
                <div className="grid grid-cols-1 gap-4">
                    <button
                        onClick={() => router.push("/admin/rewards")}
                        className="w-full bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                                <Gift className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-slate-900">Gérer les récompenses</p>
                                <p className="text-xs text-gray-500 font-medium">Config. catalogues, promos & cadeaux</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
                    </button>

                    <button
                        onClick={() => router.push("/admin/export")}
                        className="w-full bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                                <Download className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-slate-900">Export & Statistiques</p>
                                <p className="text-xs text-gray-500 font-medium">Extraire en CSV ou JSON pour Excel</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
                    </button>

                    <button
                        onClick={() => router.push("/leads/list")}
                        className="w-full bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center">
                                <BarChart3 className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-slate-900">Vue liste complète</p>
                                <p className="text-xs text-gray-500 font-medium">Consulter et filtrer tous les prospects</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
                    </button>
                </div>
            </div>
        </div>
    );
}
