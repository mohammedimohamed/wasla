"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Plus, List, RefreshCw, Monitor, LogOut,
    QrCode, X, Share2, User, Phone, Briefcase,
    Building2, Linkedin, Save, Loader2, ChevronRight,
    CheckCircle2, WifiOff
} from "lucide-react";
import toast from "react-hot-toast";
import dynamic from 'next/dynamic';
import { generateVCard } from "@/lib/vcard";

const QRCodeSVG = dynamic(() => import('qrcode.react').then(mod => mod.QRCodeSVG), { ssr: false });

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
interface AgentProfile {
    name: string;
    email: string;
    phone_number?: string | null;
    job_title?: string | null;
    company_name?: string | null;
    linkedin_url?: string | null;
    image_url?: string | null;
    updated_at?: string;
}

interface StatsState {
    total: number;
    synced: number;
    pending: number;
}

export default function AgentDashboardPage() {
    const router = useRouter();

    const [isOnline, setIsOnline] = useState(true);
    const [agentId, setAgentId] = useState<string | null>(null);
    const [agentName, setAgentName] = useState("");
    const [stats, setStats] = useState<StatsState>({ total: 0, synced: 0, pending: 0 });
    const [profile, setProfile] = useState<AgentProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);

    // Modal states
    const [showQrModal, setShowQrModal] = useState(false);
    const [showProfilePanel, setShowProfilePanel] = useState(false);

    // Profile edit states
    const [editPhone, setEditPhone] = useState("");
    const [editTitle, setEditTitle] = useState("");
    const [saving, setSaving] = useState(false);

    // ─── Init: verify session + load profile ─────────────────────
    const fetchProfile = useCallback(async () => {
        setProfileLoading(true);
        try {
            const res = await fetch('/api/profile');
            if (res.ok) {
                const data = await res.json();
                const p: AgentProfile = data.profile;
                setProfile(p);
                setEditPhone(p.phone_number || "");
                setEditTitle(p.job_title || "");
            }
        } finally {
            setProfileLoading(false);
        }
    }, []);

    const [branding, setBranding] = useState<{ event_name: string, logo_url: string | null, primary_color: string }>({
        event_name: 'Wasla Lead Collector',
        logo_url: null,
        primary_color: '#6366f1'
    });

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                if (res.ok) {
                    const data = await res.json();
                    setBranding({
                        event_name: data.settings.event_name,
                        logo_url: data.settings.logo_url,
                        primary_color: data.settings.primary_color
                    });
                }
            } catch (_) {}
        };
        loadSettings();

        // ── Online / Offline detection ────────────────────────────
        const handleOnline  = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener("online",  handleOnline);
        window.addEventListener("offline", handleOffline);
        setIsOnline(navigator.onLine);

        const init = async () => {
            try {
                const res = await fetch('/api/auth');
                const data = await res.json();

                // Handle offline case: SW returns { offline: true }
                if (data.offline) {
                    setIsOnline(false); // Ensure UI reflects offline state
                    const cachedId   = localStorage.getItem("sales_agent_id");
                    const cachedName = localStorage.getItem("sales_name");
                    if (cachedId) {
                        setAgentId(cachedId);
                        setAgentName(cachedName || 'Agent');
                        await fetchProfile();
                        return;
                    }
                }

                if (!res.ok) { window.location.href = '/login'; return; }

                if (data.user.role === 'ADMINISTRATOR' || data.user.role === 'TEAM_LEADER') {
                    window.location.href = '/admin/dashboard';
                    return;
                }

                setAgentId(data.user.id);
                setAgentName(data.user.name);
                localStorage.setItem("sales_agent_id", data.user.id);
                localStorage.setItem("sales_name", data.user.name);
                localStorage.setItem("sales_tenant_id", data.user.tenantId || "00000000-0000-0000-0000-000000000000");

                // Load stats
                try {
                    const statsRes = await fetch('/api/dashboard/stats');
                    if (statsRes.ok) {
                        const d = await statsRes.json();
                        setStats({
                            total:   d.data?.totalLeads   ?? 0,
                            synced:  d.data?.syncedLeads  ?? 0,
                            pending: d.data?.pendingLeads ?? 0,
                        });
                    }
                } catch (_) {}

                await fetchProfile();

            } catch (err) {
                // fetch() throws a TypeError when the network is completely
                // unavailable (airplane mode). Treat it as offline.
                console.warn("[Dashboard] Init failed (likely offline):", err);
                setIsOnline(false);
                const cachedId   = localStorage.getItem("sales_agent_id");
                const cachedName = localStorage.getItem("sales_name");
                if (cachedId) {
                    setAgentId(cachedId);
                    setAgentName(cachedName || 'Agent');
                    await fetchProfile();
                }
            }
        };

        init();

        return () => {
            window.removeEventListener("online",  handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [fetchProfile]);

    // ─── Generate vCard string client-side for offline QR ────────
    const vcardString = profile ? generateVCard(profile) : null;

    // ─── Profile save ──────────────────────────────────────────
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone_number: editPhone || null,
                    job_title: editTitle || null,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setProfile(data.profile);
                toast.success("Profil mis à jour !");
                setShowProfilePanel(false);
            } else {
                toast.error("Échec de la mise à jour.");
            }
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth', { method: 'DELETE' });
        localStorage.removeItem("sales_name");
        localStorage.removeItem("sales_agent_id");
        window.location.href = '/login';
    };

    const handleShareCard = async () => {
        if (!agentId) return;
        const cardURL = `${window.location.origin}/v/${agentId}`;
        if (navigator.share) {
            try { await navigator.share({ title: `Carte de ${agentName}`, url: cardURL }); return; }
            catch (_) {}
        }
        await navigator.clipboard.writeText(cardURL);
        toast.success("Lien copié !");
    };

    // Derive avatar hue from agentId for personalized color
    const hue = agentId
        ? (agentId.charCodeAt(0) * 13 + agentId.charCodeAt(agentId.length - 1) * 7) % 360
        : 240;
    const initials = agentName
        ? agentName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
        : '?';

    return (
        <>
            <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
                {/* ── HEADER ── */}
                <header className="bg-white border-b px-5 py-4 sticky top-0 z-10 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        {profile?.image_url ? (
                            <img src={`${profile.image_url}?v=${new Date(profile.updated_at || Date.now()).getTime()}`} className="w-10 h-10 rounded-xl object-cover bg-white shadow-sm border border-slate-100" />
                        ) : branding.logo_url ? (
                            <img src={branding.logo_url} className="w-10 h-10 rounded-xl object-contain bg-white shadow-sm border border-slate-100" />
                        ) : (
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md"
                                style={{ background: `linear-gradient(135deg, hsl(${hue},70%,45%), hsl(${(hue + 60) % 360},75%,55%))` }}
                            >
                                {initials}
                            </div>
                        )}
                        <div>
                            <p className="font-black text-slate-900 leading-tight tracking-tight">{agentName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                {isOnline
                                    ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    : <WifiOff className="w-3 h-3 text-amber-500" />
                                }
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                    {isOnline ? 'En ligne' : 'Hors ligne'} — {branding.event_name}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-500 transition-colors">
                        <LogOut className="w-5 h-5" />
                    </button>
                </header>

                {/* ── BODY ── */}
                <div className="flex-1 p-5 space-y-5 max-w-lg mx-auto w-full">

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Total', value: stats.total, color: 'text-slate-800' },
                            { label: 'En attente', value: stats.pending, color: 'text-amber-600' },
                            { label: 'Sync', value: stats.synced, color: 'text-emerald-600' },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center gap-1 shadow-sm">
                                <span className={`text-2xl font-black ${color}`}>{value}</span>
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Primary CTA */}
                    <Link
                        href="/leads/new"
                        className="w-full py-6 rounded-2xl font-black text-lg text-white shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                        style={{ backgroundColor: branding.primary_color, boxShadow: `0 20px 25px -5px ${branding.primary_color}40` }}
                    >
                        <Plus className="w-6 h-6" />
                        Nouveau Lead
                    </Link>

                    {/* Secondary Actions */}
                    <div className="grid grid-cols-2 gap-3">
                        <Link
                            href="/leads/list"
                            className="bg-white border border-slate-200 h-20 flex-col rounded-2xl shadow-sm flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors"
                        >
                            <List className="w-5 h-5 text-slate-500" />
                            <span className="text-xs font-black uppercase text-slate-600 tracking-wide">Mes Leads</span>
                        </Link>

                        <button
                            onClick={() => setShowQrModal(true)}
                            className="bg-white border border-indigo-100 h-20 flex-col rounded-2xl shadow-sm flex items-center justify-center gap-1.5 hover:bg-indigo-50 transition-colors"
                        >
                            <QrCode className="w-5 h-5 text-indigo-500" />
                            <span className="text-xs font-black uppercase text-indigo-600 tracking-wide">Ma Carte</span>
                        </button>

                        <button
                            onClick={() => setShowProfilePanel(!showProfilePanel)}
                            className="bg-white border border-slate-200 h-20 flex-col rounded-2xl shadow-sm flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors"
                        >
                            <User className="w-5 h-5 text-slate-500" />
                            <span className="text-xs font-black uppercase text-slate-600 tracking-wide">Mon Profil</span>
                        </button>

                        <Link
                            href="/kiosk"
                            className="bg-slate-900 h-20 flex-col rounded-2xl shadow-sm flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-colors"
                        >
                            <Monitor className="w-5 h-5 text-blue-400" />
                            <span className="text-xs font-black uppercase text-slate-300 tracking-wide">Kiosque</span>
                        </Link>
                    </div>

                    {/* ── Profile Edit Panel (inline slide-down) ── */}
                    {showProfilePanel && (
                        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    {profile?.image_url ? (
                                        <img src={`${profile.image_url}?v=${new Date(profile.updated_at || Date.now()).getTime()}`} className="w-12 h-12 rounded-2xl object-cover shadow-sm border border-white" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm border border-white">
                                            <User className="w-6 h-6" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-black text-slate-900 tracking-tight leading-none">Modifier mon profil</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Visible sur votre carte de visite</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowProfilePanel(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
                                {/* Read-only (admin-managed) */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Nom</p>
                                        <p className="text-sm font-bold text-slate-500">{profile?.name || agentName}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Email</p>
                                        <p className="text-sm font-bold text-slate-500 truncate">{profile?.email || '—'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Entreprise</p>
                                        <p className="text-sm font-bold text-slate-500 truncate">{profile?.company_name || '—'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-0.5">LinkedIn</p>
                                        <p className="text-sm font-bold text-slate-500 truncate">{profile?.linkedin_url ? 'Profil Lié' : '—'}</p>
                                    </div>
                                </div>

                                {/* Editable fields */}
                                {[
                                    { icon: <Phone className="w-4 h-4" />, label: 'Téléphone', value: editPhone, setter: setEditPhone, placeholder: '+213 xxx xxx xxx', type: 'tel' },
                                    { icon: <Briefcase className="w-4 h-4" />, label: 'Poste / Titre', value: editTitle, setter: setEditTitle, placeholder: 'Ex: Ingénieur Commercial', type: 'text' },
                                ].map(({ icon, label, value, setter, placeholder, type }) => (
                                    <div key={label} className="space-y-1.5">
                                        <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {icon} {label}
                                        </label>
                                        <input
                                            type={type}
                                            value={value}
                                            onChange={e => setter(e.target.value)}
                                            placeholder={placeholder}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"
                                        />
                                    </div>
                                ))}

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* ── QR CODE MODAL (100% Offline-First vCard) ── */}
            {showQrModal && vcardString && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowQrModal(false); }}
                >
                    <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-6 pb-4">
                            <div>
                                <h3 className="font-black text-slate-900 text-lg tracking-tight">Ma Carte de Visite</h3>
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                    Fonctionne sans internet
                                </p>
                            </div>
                            <button
                                onClick={() => setShowQrModal(false)}
                                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>

                        {/* QR — encodes the full vCard string for offline scanning */}
                        <div className="flex justify-center py-4 px-8">
                            <div className="bg-white p-4 rounded-3xl shadow-lg border border-slate-100 inline-flex">
                                <QRCodeSVG
                                    value={vcardString}
                                    size={210}
                                    level="M"
                                    includeMargin={false}
                                    fgColor="#0f172a"
                                />
                            </div>
                        </div>

                        {/* Info */}
                        <div className="text-center pb-2 px-4">
                            <p className="font-black text-slate-900 tracking-tight">{agentName}</p>
                            {profile?.job_title && <p className="text-xs text-slate-500 font-medium">{profile.job_title}</p>}
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                Scan → Sauvegarder le contact directement
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="p-6 pt-3 grid grid-cols-2 gap-3">
                            <button
                                onClick={handleShareCard}
                                className="flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black uppercase tracking-wider text-[10px] rounded-2xl transition-colors"
                            >
                                <Share2 className="w-4 h-4" />
                                Partager lien
                            </button>
                            {agentId && (
                                <a
                                    href={`/api/v/${agentId}?vcf=1`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 py-3 bg-slate-900 text-white font-black uppercase tracking-wider text-[10px] rounded-2xl hover:bg-slate-800 transition-colors"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Télécharger VCF
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Profile not set warning in QR modal fallback */}
            {showQrModal && !vcardString && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowQrModal(false); }}
                >
                    <div className="bg-white rounded-[32px] w-full max-w-xs p-8 text-center shadow-2xl">
                        <Loader2 className="w-10 h-10 animate-spin text-slate-400 mx-auto mb-4" />
                        <p className="font-black text-slate-800 mb-1">Chargement du profil…</p>
                        <p className="text-xs text-slate-500">Veuillez compléter votre profil d'abord.</p>
                    </div>
                </div>
            )}
        </>
    );
}
