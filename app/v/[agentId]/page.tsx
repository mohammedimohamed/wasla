"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
    Phone,
    Mail,
    Building2,
    Briefcase,
    Linkedin,
    Download,
    Loader2,
    UserCircle2,
    Wifi,
    WifiOff
} from "lucide-react";

interface AgentProfile {
    name: string;
    email: string;
    phone_number?: string;
    job_title?: string;
    company_name?: string;
    linkedin_url?: string;
}

export default function DigitalBusinessCardPage() {
    const params = useParams();
    const agentId = params.agentId as string;

    const [profile, setProfile] = useState<AgentProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!agentId) return;
        fetch(`/api/v/${agentId}`)
            .then(res => {
                if (!res.ok) { setNotFound(true); return null; }
                return res.json();
            })
            .then(data => {
                if (data?.profile) setProfile(data.profile);
            })
            .finally(() => setLoading(false));
    }, [agentId]);

    const handleSaveContact = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/v/${agentId}?vcf=1`);
            if (!res.ok) throw new Error('Failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = profile ? profile.name.replace(/\s+/g, '_').toLowerCase() + '.vcf' : 'contact.vcf';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } finally {
            setSaving(false);
        }
    };

    // Derive initials for avatar
    const initials = profile?.name
        ? profile.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
        : '?';

    // Derive hue for gradient avatar
    const hue = agentId
        ? agentId.charCodeAt(0) * 13 + agentId.charCodeAt(agentId.length - 1) * 7
        : 200;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <Loader2 className="w-10 h-10 text-slate-500 animate-spin" />
            </div>
        );
    }

    if (notFound || !profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-8 text-center gap-4">
                <UserCircle2 className="w-16 h-16 text-slate-600" />
                <h1 className="text-2xl font-black tracking-tight">Agent introuvable</h1>
                <p className="text-slate-500 font-medium">Ce profil n'existe pas ou a été désactivé.</p>
            </div>
        );
    }

    return (
        <>
            <meta name="theme-color" content="#020617" />
            <div
                className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4 relative overflow-hidden"
                style={{ fontFamily: "'Inter', sans-serif" }}
            >
                {/* Decorative background glow */}
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-10 pointer-events-none"
                    style={{ backgroundImage: `radial-gradient(circle, hsl(${hue},80%,60%), transparent)` }}
                />

                {/* Card */}
                <div className="relative z-10 w-full max-w-sm">
                    {/* Top gradient bar */}
                    <div
                        className="h-2 rounded-t-3xl"
                        style={{ background: `linear-gradient(to right, hsl(${hue}, 70%, 55%), hsl(${(hue + 60) % 360}, 80%, 65%))` }}
                    />

                    <div className="bg-slate-900 border border-slate-800 rounded-b-3xl shadow-2xl overflow-hidden">
                        {/* Avatar + Name section */}
                        <div className="p-8 flex flex-col items-center text-center gap-4">
                            <div
                                className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-black shadow-xl ring-4 ring-slate-800"
                                style={{ background: `linear-gradient(135deg, hsl(${hue}, 70%, 45%), hsl(${(hue + 60) % 360}, 75%, 55%))` }}
                            >
                                {initials}
                            </div>

                            <div>
                                <h1 className="text-2xl font-black text-white tracking-tight">{profile.name}</h1>
                                {profile.job_title && (
                                    <p className="text-sm font-bold mt-1" style={{ color: `hsl(${hue}, 70%, 65%)` }}>
                                        {profile.job_title}
                                    </p>
                                )}
                                {profile.company_name && (
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                                        {profile.company_name}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="mx-6 h-px bg-slate-800" />

                        {/* Contact Details */}
                        <div className="p-6 space-y-3">
                            {profile.email && (
                                <a
                                    href={`mailto:${profile.email}`}
                                    className="flex items-center gap-4 p-4 bg-slate-800/60 hover:bg-slate-800 rounded-2xl transition-all group"
                                >
                                    <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Email</p>
                                        <p className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">{profile.email}</p>
                                    </div>
                                </a>
                            )}

                            {profile.phone_number && (
                                <a
                                    href={`tel:${profile.phone_number}`}
                                    className="flex items-center gap-4 p-4 bg-slate-800/60 hover:bg-slate-800 rounded-2xl transition-all group"
                                >
                                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Téléphone</p>
                                        <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{profile.phone_number}</p>
                                    </div>
                                </a>
                            )}

                            {profile.company_name && (
                                <div className="flex items-center gap-4 p-4 bg-slate-800/60 rounded-2xl">
                                    <div className="w-10 h-10 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center shrink-0">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Entreprise</p>
                                        <p className="text-sm font-bold text-white">{profile.company_name}</p>
                                    </div>
                                </div>
                            )}

                            {profile.linkedin_url && (
                                <a
                                    href={profile.linkedin_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-4 p-4 bg-slate-800/60 hover:bg-slate-800 rounded-2xl transition-all group"
                                >
                                    <div className="w-10 h-10 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center shrink-0">
                                        <Linkedin className="w-5 h-5" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">LinkedIn</p>
                                        <p className="text-sm font-bold text-sky-400 truncate">Voir le profil</p>
                                    </div>
                                </a>
                            )}
                        </div>

                        {/* CTA */}
                        <div className="px-6 pb-8">
                            <button
                                onClick={handleSaveContact}
                                disabled={saving}
                                className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest text-sm shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-70"
                                style={{ background: `linear-gradient(to right, hsl(${hue}, 70%, 50%), hsl(${(hue + 60) % 360}, 75%, 55%))` }}
                            >
                                {saving
                                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Préparation...</>
                                    : <><Download className="w-5 h-5" /> Enregistrer dans Contacts</>
                                }
                            </button>
                            <p className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-4">
                                Propulsé par Wasla CRM
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
