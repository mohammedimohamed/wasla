"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    BarChart3,
    Gift,
    Download,
    Users,
    ArrowLeft,
    ChevronRight,
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
    Brain,
    ShieldCheck
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useTranslation } from "@/src/context/LanguageContext";
import MediashowOverlay from "../../kiosk/MediashowOverlay";

/**
 * 📊 ENTERPRISE DYNAMIC DASHBOARD
 * Core coordination center for administrators and team leaders.
 * Strictly enforces data ownership and real-time database visibility.
 */
export default function AdminDashboardPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [stats, setStats] = useState({
        totalLeads: 0,
        kioskLeads: 0,
        commercialLeads: 0,
        rewardsGiven: 0,
        rewardsGivenToday: 0,
        totalRewards: 0,
        rewardsDistributed: 0,
        leadsToday: 0,
        syncedLeads: 0,
        recentLeads: [] as any[]
    });

    const [isSignageMode, setIsSignageMode] = useState(false);
    const [mediashowAssets, setMediashowAssets] = useState<any[]>([]);

    const [branding, setBranding] = useState<{ event_name: string, logo_url: string | null }>({
        event_name: 'Wasla Admin',
        logo_url: null
    });

    // 🛡️ RBAC Session & Stats Sync
    useEffect(() => {
        const loadDashboard = async () => {
            try {
                // 1. Fetch Branding
                const brandRes = await fetch('/api/settings');
                if (brandRes.ok) {
                    const brandData = await brandRes.json();
                    setBranding({
                        event_name: brandData.settings.event_name,
                        logo_url: brandData.settings.logo_url
                    });
                }

                // 2. Verify Session & Unlocked State
                const authRes = await fetch('/api/auth');
                if (!authRes.ok) {
                    router.push("/admin/login");
                    return;
                }
                const authData = await authRes.json();
                if (authData.user.role !== 'ADMINISTRATOR' || !authData.user.sessionHasPin) {
                    router.push("/admin/login");
                    return;
                }

                // 3. Fetch Real-time Database Stats
                const statsRes = await fetch('/api/dashboard/stats');
                if (statsRes.ok) {
                    const statsData = await statsRes.json();
                    setStats(state => ({
                        ...state,
                        ...statsData.data
                    }));
                } else {
                    const errData = await statsRes.json().catch(() => ({}));
                    console.error('[Dashboard] Stats fetch failed:', statsRes.status, errData);
                }
                // 4. Fetch Mediashow Assets if enabled
                const assetsRes = await fetch('/api/mediashow');
                if (assetsRes.ok) {
                    const assetsData = await assetsRes.json();
                    setMediashowAssets(assetsData.assets || []);
                }
            } catch (e) {
                toast.error(t('common.error'));
            } finally {
                setIsLoading(false);
            }
        };
        loadDashboard();
    }, [router, t]);

    const handleLogout = async () => {
        await fetch('/api/auth', { method: 'DELETE' });
        window.location.href = "/admin/login";
    };

    const handleBackup = async () => {
        setIsBackingUp(true);
        try {
            const res = await fetch('/api/backup');
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Backup failed');
            }
            const blob = await res.blob();
            const sizeKB = res.headers.get('X-Backup-Size-KB') || '?';
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Extract filename from Content-Disposition header
            const cd = res.headers.get('Content-Disposition') || '';
            const match = cd.match(/filename="(.+)"/);
            a.download = match ? match[1] : `wasla_backup_${new Date().toISOString().split('T')[0]}.sqlite`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success(`✅ Sauvegarde téléchargée (${sizeKB} KB)`);
        } catch (err: any) {
            toast.error(err.message || 'Erreur de sauvegarde');
        } finally {
            setIsBackingUp(false);
        }
    };


    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4 text-slate-400">
                    <Loader2 className="w-10 h-10 animate-spin" />
                    <p className="font-bold uppercase tracking-widest text-[10px]">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    const { totalLeads, kioskLeads, commercialLeads, rewardsGiven, leadsToday, syncedLeads, recentLeads } = stats;

    return (
        <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
            {/* 📺 MEDIASHOW OVERLAY ENGINE */}
            <MediashowOverlay
                assets={mediashowAssets}
                isVisible={isSignageMode}
                onDismiss={() => setIsSignageMode(false)}
            />

            {/* 🔘 SLIDESHOW LAUNCHER FAB */}
            {mediashowAssets.length > 0 && (
                <div className="fixed bottom-8 right-8 z-50">
                    <button
                        onClick={() => setIsSignageMode(true)}
                        title="Démarrer le Mediashow"
                        className="w-16 h-16 bg-slate-900 border-4 border-white text-white rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:scale-110 active:scale-95 transition-all group"
                    >
                        <Monitor className="w-7 h-7 group-hover:text-blue-400" />
                    </button>
                </div>
            )}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/leads/new")} className="p-2 -ml-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors flex items-center gap-2">
                        <Plus className="w-5 h-5 font-black" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Add Lead</span>
                    </button>
                    <div className="flex items-center gap-2 ml-4">
                        {branding.logo_url && <img src={branding.logo_url} alt={branding.event_name} className="w-8 h-8 object-contain" />}
                        <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">{branding.event_name}</h1>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="text-[10px] font-black p-2 px-4 bg-slate-100 text-slate-400 uppercase tracking-widest hover:bg-red-50 hover:text-red-500 rounded-full transition-all"
                >
                    {t('common.logout')}
                </button>
            </header>

            <div className="p-6 space-y-8 max-w-4xl mx-auto w-full">
                {/* Real-time Business Intelligence Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-2 group hover:shadow-xl transition-all">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 leading-none">{totalLeads}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-2 group hover:shadow-xl transition-all">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 leading-none">{leadsToday}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Aujourd'hui</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-2 group hover:shadow-xl transition-all">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                            <RefreshCw className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 leading-none">{syncedLeads}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Synchronisés</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-2 group hover:shadow-xl transition-all">
                        <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center">
                            <Gift className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-end gap-2">
                                <p className="text-2xl font-black text-slate-900 leading-none">{stats.rewardsDistributed || 0}</p>
                                <p className="text-sm font-bold text-slate-400 mb-0.5">/ {stats.totalRewards || 0} Campaigns</p>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Distributed / Active Types</p>
                        </div>
                    </div>
                </div>

                {/* Performance Mix Breakdown */}
                <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-12 opacity-5">
                        <TrendingUp className="w-48 h-48" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" /> Répartition par source
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {[
                                { label: 'Kiosque Automatisé', value: kioskLeads, color: 'bg-blue-400', icon: Monitor },
                                { label: 'Force de Vente', value: commercialLeads, color: 'bg-emerald-400', icon: Users }
                            ].map((source, idx) => (
                                <div key={idx} className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="flex items-center gap-3 font-bold text-sm text-slate-300">
                                            <source.icon className="w-5 h-5 text-slate-500" /> {source.label}
                                        </span>
                                        <span className="text-xl font-black">{source.value}</span>
                                    </div>
                                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${source.color} rounded-full transition-all duration-1000 ease-out`}
                                            style={{ width: `${totalLeads > 0 ? (source.value / totalLeads) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recent Intelligence Table */}
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Derniers Prospects Capturés</h3>
                        <button onClick={() => router.push("/leads/list")} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
                            Voir Tout
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Source</th>
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Temps</th>
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {recentLeads.length > 0 ? (
                                    recentLeads.map((lead) => {
                                        const meta = JSON.parse(lead.metadata);
                                        return (
                                            <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-5">
                                                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${lead.source === 'kiosk' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        {lead.source}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-sm font-bold text-slate-700">
                                                    {meta.projectType || 'Standard'}
                                                </td>
                                                <td className="px-8 py-5 text-sm font-medium text-slate-400 italic">
                                                    {new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <span className={`w-2 h-2 rounded-full inline-block ${lead.sync_status === 'synced' ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`} />
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center">
                                            <p className="text-slate-300 font-bold italic">{t('kiosk.emptyState')}</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Enterprise Governance Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                    <button
                        onClick={() => router.push("/admin/qr")}
                        className="p-6 bg-white rounded-[32px] border border-slate-100 hover:border-indigo-400 hover:shadow-xl transition-all text-left flex flex-col gap-4 group"
                    >
                        <div className="w-12 h-12 bg-slate-100 text-slate-800 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <QrCode className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-black text-slate-900 uppercase tracking-tight text-xs">Visuel QR Code</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">Imprimer le mode Kiosk public</p>
                        </div>
                    </button>

                    <button
                        onClick={() => router.push("/admin/users")}
                        className="p-6 bg-white rounded-[32px] border border-slate-100 hover:shadow-xl transition-all text-left flex flex-col gap-4 group"
                    >
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-black text-slate-900 uppercase tracking-tight text-xs">Utilisateurs</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">Gérer les accès & rôles</p>
                        </div>
                    </button>

                    <button
                        onClick={() => router.push("/admin/teams")}
                        className="p-6 bg-white rounded-[32px] border border-slate-100 hover:shadow-xl transition-all text-left flex flex-col gap-4 group"
                    >
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-black text-slate-900 uppercase tracking-tight text-xs">Équipes</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">Gérer les équipes & leaders</p>
                        </div>
                    </button>

                    <button
                        onClick={() => router.push("/admin/rewards")}
                        className="p-6 bg-white rounded-[32px] border border-slate-100 hover:shadow-xl transition-all text-left flex flex-col gap-4 group"
                    >
                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Gift className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-black text-slate-900 uppercase tracking-tight text-xs">Catalogue Récompenses</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">Gérer les quotas & cadeaux</p>
                        </div>
                    </button>

                    <button
                        onClick={() => router.push("/admin/golden-records")}
                        className="p-6 bg-amber-50 rounded-[32px] border border-amber-200 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-100 transition-all text-left flex flex-col gap-4 group relative overflow-hidden"
                    >
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-400 opacity-10 rounded-full blur-xl group-hover:opacity-30 group-hover:scale-150 transition-all duration-700" />
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl shadow-lg shadow-amber-200 flex items-center justify-center group-hover:scale-110 transition-transform relative z-10">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div className="relative z-10">
                            <p className="font-black text-amber-900 uppercase tracking-tight text-xs">{t('intelligence.goldenRecordsMenu') || 'Golden Records'}</p>
                            <p className="text-[10px] text-amber-700/80 font-medium mt-1">{t('intelligence.cleanRoomDesc') || 'Premium Verified Leads'}</p>
                        </div>
                    </button>

                    <button
                        onClick={() => router.push("/admin/settings")}
                        className="p-6 bg-white rounded-[32px] border border-slate-100 hover:shadow-xl transition-all text-left flex flex-col gap-4 group"
                    >
                        <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-black text-slate-900 uppercase tracking-tight text-xs">Configuration Stand</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">Identité & RBAC Global</p>
                        </div>
                    </button>

                    <button
                        onClick={() => router.push("/admin/settings/form-builder")}
                        className="p-6 bg-white rounded-[32px] border border-slate-100 hover:shadow-xl transition-all text-left flex flex-col gap-4 group"
                    >
                        <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <LayoutTemplate className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-black text-slate-900 uppercase tracking-tight text-xs">Form Builder</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">Éditeur de Formulaire No-Code</p>
                        </div>
                    </button>

                    <button
                        onClick={() => router.push("/admin/settings/mediashow")}
                        className="p-6 bg-white rounded-[32px] border border-slate-100 hover:shadow-xl transition-all text-left flex flex-col gap-4 group"
                    >
                        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Monitor className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-black text-slate-900 uppercase tracking-tight text-xs">Mediashow</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">Écran de Veille & Publicité</p>
                        </div>
                    </button>

                    {/* 💾 DATABASE MAINTENANCE CARD */}
                    <button
                        onClick={() => router.push("/admin/maintenance")}
                        className="p-6 bg-white rounded-[32px] border border-slate-100 hover:border-emerald-400 hover:shadow-xl transition-all text-left flex flex-col gap-4 group relative overflow-hidden"
                    >
                        {/* Subtle cron command hint shown on hover */}
                        <div className="absolute inset-0 bg-slate-900 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4 rounded-[32px]">
                            <div className="text-center">
                                <Server className="w-5 h-5 mx-auto mb-2 text-emerald-400" />
                                <p className="text-[9px] font-mono text-emerald-400 break-all leading-relaxed">
                                    Manage local SQLite<br />
                                    Download / Upload
                                </p>
                            </div>
                        </div>
                        <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform relative z-10">
                            <HardDrive className="w-6 h-6" />
                        </div>
                        <div className="relative z-10 group-hover:opacity-0 transition-opacity">
                            <p className="font-black text-slate-900 uppercase tracking-tight text-xs">Maintenance DB</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">
                                Sauvegarde & Restauration
                            </p>
                        </div>
                    </button>

                    <button
                        onClick={() => router.push("/admin/intelligence")}
                        className="p-6 bg-white rounded-[32px] border border-slate-100 hover:border-indigo-400 hover:shadow-xl transition-all text-left flex flex-col gap-4 group"
                    >
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Brain className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-black text-slate-900 uppercase tracking-tight text-xs">Intelligence Leads</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">Dédoublonnage & Anti-Fraude</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
