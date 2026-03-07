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

    // Initial check for session
    useEffect(() => {
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
            const action = authStep === 'PIN_SETUP' ? 'SETUP' : 'VERIFY';
            const response = await fetch('/api/auth', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin, action }),
            });

            if (response.ok) {
                setIsAuthenticated(true);
                setIsUnlocked(true); // 🚨 ACCESS GRANTED
                toast.success(t('common.success'));

                // 🔄 BREAK REDIRECT RACE CONDITION
                setTimeout(() => {
                    window.location.href = "/admin/dashboard";
                }, 500);
            } else {
                toast.error(t('auth.incorrect'));
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
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden">

            {/* Admin Decorative Background */}
            <div className="absolute top-0 right-0 w-full h-1 bg-slate-900 shadow-xl" />

            <div className="w-full max-w-md flex flex-col items-center gap-8 relative z-10 transition-all duration-500">
                <button
                    onClick={() => router.push("/")}
                    className="self-start flex items-center gap-2 text-gray-400 font-bold text-xs uppercase hover:text-gray-600 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('common.cancel')}
                </button>

                <div className="text-center">
                    <div className="w-20 h-20 bg-slate-900 rounded-[32px] flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-slate-200">
                        {authStep === 'PASSWORD' ? <ShieldAlert className="w-10 h-10 text-primary" /> : <ShieldCheck className="w-10 h-10 text-primary" />}
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('auth.adminTitle')}</h1>
                    <p className="text-gray-500 mt-2 font-medium">Authentification sécurisée requise</p>
                </div>

                <div className="w-full space-y-5 bg-white p-10 rounded-[48px] shadow-2xl shadow-slate-200/50 border border-slate-100">
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
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-medium text-slate-900"
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
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-medium text-slate-900"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-slate-200"
                                >
                                    {isLoading ? t('common.loading') : "Accéder à la gestion"}
                                </button>
                            </form>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                                    <p className="text-sm font-medium text-slate-600">
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
                                        className="w-full text-center text-5xl font-black py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:border-primary transition-all tracking-[0.5em] text-slate-900"
                                        maxLength={6}
                                        autoFocus
                                    />
                                </div>
                                <button
                                    onClick={handlePinAction}
                                    disabled={isLoading || pin.length !== 6}
                                    className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-slate-200"
                                >
                                    {isLoading ? t('common.loading') : 'Confirmer le PIN'}
                                </button>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
