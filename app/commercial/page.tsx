'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LeadForm } from '@/src/components/LeadForm';
import { SyncStatusIcon } from '@/src/components/SyncStatusIcon';
import { Lock, UserCheck, X, Mail, KeyRound, ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/src/context/LanguageContext';
import { toast } from 'react-hot-toast';

export default function CommercialPage() {
    const { t, locale, setLocale } = useTranslation();
    const router = useRouter();

    // Auth States
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false); // 🚨 THE KEY: sessionHasPin
    const [authStep, setAuthStep] = useState<'PASSWORD' | 'PIN_SETUP' | 'PIN_VERIFY'>('PASSWORD');
    const [isChecking, setIsChecking] = useState(true);

    // Input States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Initial check for session
    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Use the new session check endpoint
                const res = await fetch('/api/auth');
                if (res.ok) {
                    const data = await res.json();
                    setIsAuthenticated(true);

                    if (data.user.needsPin) {
                        setAuthStep('PIN_SETUP');
                        setIsUnlocked(false);
                    } else if (!data.user.sessionHasPin) {
                        setAuthStep('PIN_VERIFY');
                        setIsUnlocked(false);
                    } else {
                        // 🏁 Fully Verified/Unlocked
                        setIsUnlocked(true);
                        setAuthStep('PIN_VERIFY');
                    }
                } else {
                    setIsAuthenticated(false);
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

    /**
     * 🔐 Step 1: Password Login
     */
    const handlePasswordLogin = async () => {
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

            if (response.ok) {
                setIsAuthenticated(true);
                if (data.user.needsPin) {
                    setAuthStep('PIN_SETUP');
                    setIsUnlocked(false);
                } else {
                    setAuthStep('PIN_VERIFY');
                    setIsUnlocked(false);
                }
                toast.success(t('common.success'));
            } else {
                toast.error(t('auth.incorrect'));
            }
        } catch (error) {
            toast.error(t('common.error'));
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 🔑 Step 2: PIN Setup/Verify
     */
    const handlePinAction = async () => {
        if (pin.length !== 6) {
            toast.error("Le PIN comporte 6 chiffres");
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
                setAuthStep('PIN_VERIFY'); // Stabilized
                setIsAuthenticated(true);
                setIsUnlocked(true); // 🚨 ACCESS GRANTED
                toast.success(t('common.success'));

                // 🔄 BREAK REDIRECT RACE CONDITION
                // A hard location.href ensures the browser clears cookie cache 
                // and the Middleware sees the fresh JWT issued in the PUT request.
                setTimeout(() => {
                    window.location.href = '/dashboard';
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

    const handleLogout = async () => {
        await fetch('/api/auth', { method: 'DELETE' });
        setIsAuthenticated(false);
        setAuthStep('PASSWORD');
        setEmail('');
        setPassword('');
        setPin('');
    };

    if (isChecking) return null;

    // LOGIN GATE (Password or PIN)
    if (!isAuthenticated || !isUnlocked) {
        const isSetup = authStep === 'PIN_SETUP';
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-white overflow-hidden relative">

                {/* Visual context for visitors */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-primary animate-pulse" />

                <div className="w-full max-w-sm space-y-8 text-center relative z-10 transition-all duration-500 ease-in-out">
                    <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl border border-primary/30">
                        {authStep === 'PASSWORD' ? <Lock className="w-10 h-10 text-primary" /> : <ShieldCheck className="w-10 h-10 text-primary" />}
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-3xl font-black">{t('commercial.accessTitle')}</h1>
                        <p className="text-slate-400 font-semibold uppercase tracking-widest text-xs">
                            {authStep === 'PASSWORD' ? 'Authentification Initiale' : 'Sécurisation de Session'}
                        </p>
                    </div>

                    <div className="space-y-6 pt-6 text-left">
                        {authStep === 'PASSWORD' ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 ml-1">Email Personnel</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="agent@wasla.dz"
                                            className="w-full pl-12 pr-4 py-4 bg-slate-900 border-2 border-slate-800 rounded-2xl outline-none focus:border-primary transition-all font-medium"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500 ml-1">Mot de Passe</label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="********"
                                            className="w-full pl-12 pr-4 py-4 bg-slate-900 border-2 border-slate-800 rounded-2xl outline-none focus:border-primary transition-all font-medium"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handlePasswordLogin}
                                    disabled={isLoading}
                                    className="btn-primary w-full py-5 text-xl font-bold mt-4"
                                >
                                    {isLoading ? t('common.loading') : t('commercial.loginBtn')}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl text-center">
                                    <p className="text-sm font-medium text-primary">
                                        {isSetup
                                            ? "Veuillez définir votre PIN de 6 chiffres pour les accès rapides sur ce stand."
                                            : "Veuillez entrer votre PIN de session pour continuer."}
                                    </p>
                                </div>
                                <div className="flex justify-center gap-2">
                                    <input
                                        type="password"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handlePinAction()}
                                        placeholder="------"
                                        className="w-full text-center text-5xl font-black py-4 bg-slate-900 border-2 border-slate-800 rounded-2xl outline-none focus:border-primary transition-all tracking-[0.5em]"
                                        maxLength={6}
                                        autoFocus
                                    />
                                </div>
                                <button
                                    onClick={handlePinAction}
                                    disabled={isLoading || pin.length !== 6}
                                    className="btn-primary w-full py-5 text-xl font-bold shadow-xl shadow-primary/20"
                                >
                                    {isLoading ? t('common.loading') : 'Valider mon PIN'}
                                </button>
                                {authStep === 'PIN_VERIFY' && (
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-center text-slate-500 text-xs font-bold uppercase hover:text-white transition-colors"
                                    >
                                        Changer d'utilisateur
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 justify-center pt-4 opacity-50">
                        {['en', 'fr', 'ar'].map(l => (
                            <button key={l} onClick={() => setLocale(l as any)} className={`uppercase text-xs font-bold ${locale === l ? 'text-primary underline' : ''}`}>
                                {l}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // MAIN FORM VIEW (Session Resumption Verified)
    return (
        <div className="flex-1 flex flex-col bg-gray-50">
            <header className="p-6 bg-white border-b flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                        <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="font-black text-slate-900 tracking-tight">{t('commercial.formTitle')}</h2>
                        <SyncStatusIcon />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:block text-right">
                        <p className="text-[10px] font-black uppercase text-slate-400">Session Actve</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-3 hover:bg-red-50 rounded-2xl text-slate-400 hover:text-red-500 transition-all active:scale-95 border border-transparent hover:border-red-100"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pt-10 pb-20">
                <div className="max-w-2xl mx-auto px-6">
                    <div className="mb-10 text-center space-y-2">
                        <h3 className="text-4xl font-black text-slate-900 tracking-tight">{t('commercial.formTitle')}</h3>
                        <p className="text-gray-500 font-medium">{t('commercial.formSubtitle')}</p>
                    </div>

                    <div className="bg-white p-8 rounded-[48px] shadow-2xl shadow-slate-200/50 border border-slate-100 mb-10 transition-all hover:shadow-primary/5">
                        <LeadForm
                            source="commercial"
                            onSubmitSuccess={() => {
                                toast.success(t('kiosk.successMsg'));
                            }}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
