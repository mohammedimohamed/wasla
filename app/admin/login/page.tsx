"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft, Mail, KeyRound, Lock, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "@/src/context/LanguageContext";

export default function AdminLoginPage() {
    const { t } = useTranslation();
    const router = useRouter();

    // Auth States
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false); // 🚨 THE KEY
    const [authStep, setAuthStep] = useState<'PASSWORD' | 'PIN_SETUP' | 'PIN_VERIFY'>('PASSWORD');
    const [isChecking, setIsChecking] = useState(true);

    // Input States
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [pin, setPin] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const [branding, setBranding] = useState<{ event_name: string, logo_url: string | null }>({
        event_name: 'Wasla Admin',
        logo_url: null
    });

    // Initial check for session
    useEffect(() => {
        const fetchBranding = async () => {
            try {
                const res = await fetch('/api/settings');
                if (res.ok) {
                    const data = await res.json();
                    setBranding({
                        event_name: data.settings.event_name,
                        logo_url: data.settings.logo_url
                    });
                }
            } catch (_) {}
        };
        fetchBranding();
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/auth');
                if (res.ok) {
                    const data = await res.json();
                    if (data.user.role === 'ADMINISTRATOR') {
                        setIsAuthenticated(true);
                        if (data.user.needsPin) {
                            setAuthStep('PIN_SETUP');
                            setIsUnlocked(false);
                        } else if (!data.user.sessionHasPin) {
                            setAuthStep('PIN_VERIFY');
                            setIsUnlocked(false);
                        } else {
                            setIsUnlocked(true);
                            setAuthStep('PIN_VERIFY');
                            // If already unlocked, we could redirect immediately
                            window.location.href = '/admin/dashboard';
                        }
                    } else {
                        // Authenticated but not admin
                        setAuthStep('PASSWORD');
                    }
                } else {
                    setAuthStep('PASSWORD');
                }
            } catch (e) {
                setAuthStep('PASSWORD');
            } finally {
                setIsChecking(false);
            }
        };
        checkAuth();
    }, []);

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error(t('validation.fieldRequired'));
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok && data.user.role === 'ADMINISTRATOR') {
                setIsAuthenticated(true);
                if (data.user.needsPin) {
                    setAuthStep('PIN_SETUP');
                    setIsUnlocked(false);
                } else {
                    setAuthStep('PIN_VERIFY');
                    setIsUnlocked(false);
                }
                toast.success(t('common.success'));
            } else if (response.ok) {
                toast.error(t('auth.incorrect')); // Not an admin
            } else {
                toast.error(t('auth.incorrect'));
            }
        } catch (error) {
            toast.error(t('common.error'));
        } finally {
            setIsLoading(false);
        }
    };

    const handlePinAction = async () => {
        if (pin.length !== 6) {
            toast.error("Le PIN administrateur comporte 6 chiffres");
            return;
        }

        setIsLoading(true);
        try {
            let res;
            if (authStep === 'PIN_SETUP') {
                // 🛡️ Bypassing session-dependency for initial setup
                res = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, newPin: pin }),
                });
            } else {
                // Regular session resumption or verification
                res = await fetch('/api/auth', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin, action: 'VERIFY' }),
                });
            }

            if (res.ok) {
                setIsAuthenticated(true);
                setIsUnlocked(true); // 🚨 ACCESS GRANTED
                toast.success(t('common.success'));
                setPin('');

                // 🔄 BREAK REDIRECT RACE CONDITION
                setTimeout(() => {
                    window.location.href = "/admin/dashboard";
                }, 500);
            } else {
                const data = await res.json();
                toast.error(authStep === 'PIN_SETUP' ? 'Erreur lors de la création du PIN.' : t('auth.incorrect'));
                setPin('');
            }
        } catch (error) {
            toast.error(t('common.error'));
        } finally {
            setIsLoading(false);
        }
    };

    if (isChecking) return null;

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 relative overflow-hidden transition-colors duration-300">

            {/* Admin Decorative Background */}
            <div className="absolute top-0 right-0 w-full h-1 bg-slate-900 dark:bg-indigo-600 shadow-xl" />

            <div className="w-full max-w-md flex flex-col items-center gap-8 relative z-10 transition-all duration-500">
                <button
                    onClick={() => router.push("/")}
                    className="self-start flex items-center gap-2 text-slate-400 dark:text-slate-500 font-bold text-xs uppercase hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('common.cancel')}
                </button>

                <div className="text-center">
                    <div className="w-20 h-20 bg-white dark:bg-white/5 rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-2xl border-2 border-slate-100 dark:border-white/10 overflow-hidden p-2">
                        {branding.logo_url ? <img src={branding.logo_url} className="w-full h-full object-contain" /> : <div className="font-black text-2xl text-slate-800 dark:text-white">{branding.event_name.charAt(0)}</div>}
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">{branding.event_name} <span className="text-indigo-600 dark:text-indigo-400">ADMIN</span></h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-black uppercase text-[10px] tracking-[0.2em]">Wasla Control Center</p>
                </div>

                <div className="w-full space-y-5 bg-white dark:bg-white/5 p-10 rounded-[48px] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5 transition-colors">
                    {(!isAuthenticated || !isUnlocked) && (
                        authStep === 'PASSWORD' ? (
                            <form onSubmit={handlePasswordLogin} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 ml-1">Email Administrateur</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="admin@wasla.dz"
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-white/5 rounded-2xl outline-none focus:border-indigo-600 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 ml-1">Mot De Passe</label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="********"
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-white/5 rounded-2xl outline-none focus:border-indigo-600 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 dark:hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-slate-200 dark:shadow-none uppercase tracking-widest"
                                >
                                    {isLoading ? t('common.loading') : "Ouvrir la Console"}
                                </button>
                            </form>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl text-center">
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                        {authStep === 'PIN_SETUP'
                                            ? "Définissez un PIN de 6 chiffres pour sécuriser l'accès à cette console d'administration."
                                            : "Veuillez entrer votre PIN administrateur à 6 chiffres."}
                                    </p>
                                </div>
                                <div className="relative">
                                    <input
                                        type="password"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handlePinAction()}
                                        placeholder="------"
                                        className="w-full text-center text-5xl font-black py-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent dark:border-white/5 rounded-2xl outline-none focus:border-indigo-600 dark:focus:border-indigo-500 transition-all tracking-[0.5em] text-slate-900 dark:text-white"
                                        maxLength={6}
                                        autoFocus
                                    />
                                </div>
                                <button
                                    onClick={handlePinAction}
                                    disabled={isLoading || pin.length !== 6}
                                    className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 dark:hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-slate-200 dark:shadow-none uppercase tracking-widest"
                                >
                                    {isLoading ? t('common.loading') : 'Confirmer le PIN'}
                                </button>
                            </div>
                        )
                    )}
                </div>

                <button
                    onClick={() => {
                        import('@/lib/recovery').then(m => m.forceAppUpdate());
                    }}
                    className="text-slate-400 dark:text-slate-600 text-[9px] hover:text-indigo-500 transition-colors uppercase tracking-widest font-black"
                >
                    Problème d'affichage ? Mettre à jour l'app
                </button>
            </div>
        </div>
    );
}
