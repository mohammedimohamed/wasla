'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, KeyRound, ShieldCheck, ArrowLeft, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCachedSession, validateOfflinePin, cacheAuthSession } from '@/lib/offlineAuthCache';

export default function LoginPage() {
    const router = useRouter();

    const [authStep, setAuthStep] = useState<'PASSWORD' | 'PIN_SETUP' | 'PIN_VERIFY'>('PASSWORD');
    const [isChecking, setIsChecking] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [pin, setPin] = useState('');

    const [cachedUserId, setCachedUserId] = useState<string | null>(null);
    const [cachedUserName, setCachedUserName] = useState<string | null>(null);

    // ────────────────────────────────────────────────────────
    // Check existing session on mount. If already authenticated
    // and PIN is set, redirect straight to /commercial.
    // ────────────────────────────────────────────────────────
    useEffect(() => {
        const checkSession = async () => {
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                const cached = await getCachedSession();
                if (cached) {
                    setCachedUserId(cached.userId);
                    setCachedUserName(cached.name);
                    setAuthStep('PIN_VERIFY');
                } else {
                    toast.error('Aucune session hors-ligne disponible.');
                }
                setIsChecking(false);
                return;
            }

            try {
                const res = await fetch('/api/auth');
                if (res.ok) {
                    const data = await res.json();
                    if (data.user?.sessionHasPin) {
                        // Already fully authenticated — go to portal
                        window.location.href = '/commercial';
                        return;
                    } else if (data.user?.needsPin) {
                        setAuthStep('PIN_SETUP');
                    } else {
                        setAuthStep('PIN_VERIFY');
                    }
                }
            } catch (_) {}
            setIsChecking(false);
        };
        checkSession();
    }, []);

    // ────────────────────────────────────────────────────────
    // Step 1: Email + Password
    // ────────────────────────────────────────────────────────
    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!navigator.onLine) {
            toast.error('Connexion internet requise pour la première connexion.');
            return;
        }

        if (!email.trim() || !password.trim()) {
            toast.error('Veuillez remplir tous les champs.');
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Connexion réussie');
                setAuthStep(data.user?.needsPin ? 'PIN_SETUP' : 'PIN_VERIFY');
            } else {
                toast.error('Email ou mot de passe incorrect.');
            }
        } catch (_) {
            toast.error('Erreur de connexion. Réessayez.');
        } finally {
            setIsLoading(false);
        }
    };

    // ────────────────────────────────────────────────────────
    // Step 2: PIN Setup or Verify (exactly 4 digits)
    // ────────────────────────────────────────────────────────
    const handlePinAction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length !== 4) {
            toast.error('Le PIN doit comporter exactement 4 chiffres.');
            return;
        }
        setIsLoading(true);

        if (!navigator.onLine) {
            if (authStep === 'PIN_VERIFY' && cachedUserId) {
                const valid = await validateOfflinePin(cachedUserId, pin);
                if (valid) {
                    toast.success('Mode hors ligne vérifié !');
                    window.location.href = '/commercial';
                } else {
                    toast.error('PIN incorrect ou session hors ligne expirée.');
                    setPin('');
                }
            } else {
                toast.error('Impossible de configurer un PIN hors ligne.');
            }
            setIsLoading(false);
            return;
        }

        try {
            const action = authStep === 'PIN_SETUP' ? 'SETUP' : 'VERIFY';
            const res = await fetch('/api/auth', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin, action }),
            });
            const data = await res.json();

            if (res.ok) {
                if (data.user) {
                    await cacheAuthSession(
                        data.user.id,
                        data.user.name,
                        data.user.role,
                        data.user.team_id,
                        pin
                    );
                }
                toast.success('Accès accordé !');
                // Hard redirect so middleware sees the new cookie with hasPin=true
                window.location.href = '/commercial';
            } else {
                toast.error(authStep === 'PIN_VERIFY' ? 'PIN incorrect.' : 'Erreur lors de la création du PIN.');
                setPin('');
            }
        } catch (_) {
            toast.error('Erreur. Réessayez.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToPassword = async () => {
        if (navigator.onLine) {
            await fetch('/api/auth', { method: 'DELETE' });
        }
        setAuthStep('PASSWORD');
        setPin('');
        setEmail('');
        setPassword('');
    };

    if (isChecking) return null;

    const isSetupStep = authStep !== 'PASSWORD';

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-white overflow-hidden relative min-h-screen">
            {/* Accent bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />

            <div className="w-full max-w-sm space-y-8 text-center relative z-10">
                {/* Offline banner */}
                {typeof window !== 'undefined' && !navigator.onLine && (
                    <div className="flex items-center justify-center gap-2 bg-amber-500/20 text-amber-500 text-xs font-bold py-2 px-4 rounded-full border border-amber-500/50 uppercase tracking-widest">
                        <WifiOff className="w-3.5 h-3.5" />
                        Mode Hors Ligne Activé
                    </div>
                )}

                {/* Icon */}
                <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl border border-primary/30 mt-4">
                    {isSetupStep
                        ? <ShieldCheck className="w-10 h-10 text-primary" />
                        : <Lock className="w-10 h-10 text-primary" />
                    }
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tight">
                        {authStep === 'PASSWORD' && 'Connexion Agent'}
                        {authStep === 'PIN_SETUP' && 'Créer votre PIN'}
                        {authStep === 'PIN_VERIFY' && (cachedUserName ? `Bonjour, ${cachedUserName}` : 'Entrer votre PIN')}
                    </h1>
                    <p className="text-slate-400 font-semibold uppercase tracking-widest text-xs">
                        {authStep === 'PASSWORD' && 'Portail Agent Commercial'}
                        {authStep === 'PIN_SETUP' && 'Premier accès — sécurisez votre session'}
                        {authStep === 'PIN_VERIFY' && 'Authentification de session rapide'}
                    </p>
                </div>

                {/* ── FORM ── */}
                <div className="space-y-6 pt-4 text-left">
                    {authStep === 'PASSWORD' ? (
                        <form onSubmit={handlePasswordLogin} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="agent@wasla.dz"
                                        autoComplete="email"
                                        className="w-full pl-12 pr-4 py-4 bg-slate-900 border-2 border-slate-800 rounded-2xl outline-none focus:border-primary transition-all font-medium"
                                        required
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
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        className="w-full pl-12 pr-4 py-4 bg-slate-900 border-2 border-slate-800 rounded-2xl outline-none focus:border-primary transition-all font-medium"
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-5 text-base font-black uppercase tracking-widest rounded-2xl bg-primary hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-60 mt-4"
                            >
                                {isLoading ? 'Connexion...' : 'Se Connecter'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handlePinAction} className="space-y-6">
                            <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl text-center">
                                <p className="text-sm font-medium text-primary">
                                    {authStep === 'PIN_SETUP'
                                        ? 'Définissez un PIN de 4 chiffres pour sécuriser vos accès rapides.'
                                        : 'Entrez votre PIN de 4 chiffres pour continuer.'}
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500 ml-1 block mb-2">
                                    Code PIN — 4 chiffres
                                </label>
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="— — — —"
                                    inputMode="numeric"
                                    pattern="\d{4}"
                                    maxLength={4}
                                    autoFocus
                                    className="w-full text-center text-5xl font-black py-5 bg-slate-900 border-2 border-slate-800 rounded-2xl outline-none focus:border-primary transition-all tracking-[0.8em]"
                                    required
                                />
                                {/* Dot indicators */}
                                <div className="flex justify-center gap-3 mt-4">
                                    {[0, 1, 2, 3].map(i => (
                                        <div
                                            key={i}
                                            className={`w-3 h-3 rounded-full transition-all duration-200 ${pin.length > i ? 'bg-primary shadow-[0_0_10px_rgba(99,102,241,0.8)]' : 'bg-slate-700'}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || pin.length !== 4}
                                className="w-full py-5 text-base font-black uppercase tracking-widest rounded-2xl bg-primary hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-40"
                            >
                                {isLoading ? 'Vérification...' : (authStep === 'PIN_SETUP' ? 'Créer mon PIN' : 'Valider mon PIN')}
                            </button>

                            <button
                                type="button"
                                onClick={handleBackToPassword}
                                className="w-full flex items-center justify-center gap-2 text-slate-500 text-xs font-bold uppercase hover:text-white transition-colors"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Changer d'utilisateur
                            </button>
                        </form>
                    )}
                </div>

                {/* Footer link to admin */}
                <button
                    onClick={() => router.push('/admin/login')}
                    className="text-slate-600 text-xs hover:text-slate-400 transition-colors mt-4 uppercase tracking-widest font-bold"
                >
                    Accès Administrateur →
                </button>
            </div>
        </div>
    );
}
