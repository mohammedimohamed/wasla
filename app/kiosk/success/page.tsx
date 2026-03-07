"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle2,
    Gift,
    Ticket,
    DownloadCloud,
    Loader2,
    RefreshCw,
    XCircle,
    Copy,
    ExternalLink
} from "lucide-react";
import toast from "react-hot-toast";

interface Reward {
    id: string;
    name: string;
    type: 'digital_download' | 'promo_code' | 'physical_gift';
    value?: string;
    description?: string;
}

export default function KioskSuccessPage() {
    const router = useRouter();
    const [reward, setReward] = useState<Reward | null>(null);
    const [settings, setSettings] = useState<any>(null);
    const [countdown, setCountdown] = useState(10);
    const [copied, setCopied] = useState(false);
    const [returnUrl, setReturnUrl] = useState('/kiosk');

    useEffect(() => {
        // Fetch Settings
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setSettings(data.settings);
                    document.documentElement.style.setProperty('--primary-color', data.settings.primary_color);
                }
            });

        // Load Reward from Session
        const savedReward = sessionStorage.getItem('kiosk_reward');
        if (savedReward && savedReward !== "undefined") {
            try {
                setReward(JSON.parse(savedReward));
            } catch (e) { }
        }

        // Clean up session immediately to prevent stale states on navigation
        sessionStorage.removeItem('kiosk_reward');

        // Grab location to restart securely 
        const searchParams = new URLSearchParams(window.location.search);
        const location = searchParams.get('location');
        const targetUrl = location ? `/kiosk?location=${encodeURIComponent(location)}` : '/kiosk';
        setReturnUrl(targetUrl);

        // Auto-redirect Timer
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    router.push(targetUrl);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [router]);

    const handleCopy = () => {
        if (reward?.value) {
            navigator.clipboard.writeText(reward.value);
            setCopied(true);
            toast.success("Code copié !");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!settings) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-slate-300" />
            </div>
        );
    }

    const primaryColor = settings.primary_color;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden font-sans">

            {/* Background Decor */}
            <div className="absolute top-0 inset-x-0 h-64 opacity-20" style={{ backgroundImage: `linear-gradient(to bottom, ${primaryColor}, transparent)` }} />

            <div className="w-full max-w-2xl bg-white rounded-[40px] shadow-2xl p-10 md:p-16 relative z-10 text-center border border-slate-100">

                {/* ── SUCCESS HEADER ── */}
                <div className="mx-auto w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center border-4 border-white shadow-xl -mt-20 mb-8">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </div>

                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight uppercase leading-none mb-4">
                    Inscription Réussie !
                </h1>
                <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-lg mx-auto mb-10">
                    Merci d'avoir pris le temps de vous inscrire sur notre stand.
                </p>

                {/* ── REWARD SECTION ── */}
                {reward ? (
                    <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-200 mb-10 overflow-hidden relative group transition-all hover:shadow-lg">

                        <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: primaryColor }} />

                        <h2 className="text-[12px] font-black tracking-widest uppercase mb-6 flex items-center justify-center gap-2" style={{ color: primaryColor }}>
                            <Gift className="w-4 h-4" /> Voici votre récompense
                        </h2>

                        <div className="flex flex-col items-center">
                            <h3 className="text-2xl font-black text-slate-900 leading-tight mb-2">
                                {reward.name}
                            </h3>
                            {reward.description && (
                                <p className="text-sm text-slate-600 font-medium mb-8">
                                    {reward.description}
                                </p>
                            )}

                            {/* Reward Action based on TYPE */}
                            {reward.type === 'promo_code' && reward.value && (
                                <div className="w-full max-w-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Code Promotionnel</p>
                                    <div className="flex bg-white rounded-2xl border-2 border-dashed border-slate-300 p-1 group-hover:border-indigo-300 transition-colors">
                                        <div className="flex-1 py-4 text-2xl font-black tracking-[0.2em] font-mono text-slate-800">
                                            {reward.value}
                                        </div>
                                        <button
                                            onClick={handleCopy}
                                            className="px-6 rounded-xl text-white font-bold uppercase text-xs tracking-wider transition-all hover:opacity-90 flex items-center gap-2"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            {copied ? 'Copié' : 'Copier'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {reward.type === 'digital_download' && reward.value && (
                                <a
                                    href={reward.value}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-10 py-5 rounded-2xl text-white font-black uppercase text-sm tracking-widest transition-all shadow-lg hover:-translate-y-1 flex items-center gap-3 w-full max-w-sm"
                                    style={{ backgroundColor: primaryColor, boxShadow: `0 10px 15px -3px ${primaryColor}40` }}
                                >
                                    <DownloadCloud className="w-6 h-6" />
                                    Télécharger le fichier
                                </a>
                            )}

                            {reward.type === 'physical_gift' && (
                                <div className="w-full max-w-md bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-800 text-sm font-bold flex gap-4 text-left items-start">
                                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                                        <Gift className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <p className="leading-relaxed">
                                        Veuillez présenter cet écran à l'une de nos hôtesses sur le stand immédiatement pour récupérer votre cadeau physique.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // Generic fallback if no rewards were available/won
                    <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-200 border-dashed mb-10">
                        <p className="text-slate-500 font-medium">Un agent vous contactera très prochainement.</p>
                    </div>
                )}

                {/* ── AUTO CLOSE FOOTER ── */}
                <button
                    onClick={() => router.push(returnUrl)}
                    className="w-full bg-slate-900 hover:bg-black text-white rounded-[24px] shadow-xl py-6 text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 relative overflow-hidden"
                >
                    <RefreshCw className="w-5 h-5 absolute left-8 opacity-50" />
                    Terminer & Retourner à l'accueil

                    {/* Progress Bar inside Button */}
                    <div className="absolute bottom-0 left-0 h-1 bg-white/30" style={{ width: `${(countdown / 10) * 100}%`, transition: 'width 1s linear' }} />
                </button>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-4">
                    Fermeture automatique dans <span style={{ color: primaryColor }}>{countdown}</span> seconde{countdown !== 1 ? 's' : ''}
                </p>
            </div>
        </div>
    );
}
