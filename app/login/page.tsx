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

    const [branding, setBranding] = useState<{ event_name: string, logo_url: string | null, primary_color: string }>({
        event_name: 'Wasla Lead Collector',
        logo_url: null,
        primary_color: '#6366f1' // Indigo-500 default
    });

    const fetchBranding = async () => {
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

    // ────────────────────────────────────────────────────────
    // Check existing session on mount. If already authenticated
    // and PIN is set, redirect straight to /dashboard.
    // ────────────────────────────────────────────────────────
    useEffect(() => {
        fetchBranding();
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
                        // Already fully authenticated — go to home base
                        window.location.href = '/dashboard';
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
                    window.location.href = '/dashboard';
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
                    body: JSON.stringify({ pin, action: 'VERIFY', userId: cachedUserId }),
                });
            }
            
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
                window.location.href = '/dashboard';
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
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden relative min-h-screen transition-colors duration-300">
            {/* Accent bar */}
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(to right, ${branding.primary_color}80, ${branding.primary_color}, ${branding.primary_color}80)` }} />

            <div className="w-full max-w-sm space-y-8 text-center relative z-10">
                {/* Offline banner */}
                {typeof window !== 'undefined' && !navigator.onLine && (
                    <div className="flex items-center justify-center gap-2 bg-amber-500/20 text-amber-500 text-xs font-bold py-2 px-4 rounded-full border border-amber-500/50 uppercase tracking-widest">
                        <WifiOff className="w-3.5 h-3.5" />
                        Mode Hors Ligne Activé
                    </div>
                )}

                {/* Icon/Logo */}
                <div 
                    className="w-20 h-20 bg-white shadow-2xl rounded-3xl flex items-center justify-center mx-auto overflow-hidden border-2" 
                    style={{ borderColor: branding.primary_color + '40' }}
                >
                    {branding.logo_url ? (
                        <img src={branding.logo_url} alt={branding.event_name} className="w-full h-full object-contain p-2" />
                    ) : (
                        <div 
                            className="w-full h-full flex items-center justify-center font-black text-2xl" 
                            style={{ color: branding.primary_color }}
                        >
                            {branding.event_name.charAt(0)}
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                        {authStep === 'PASSWORD' && branding.event_name}
                        {authStep === 'PIN_SETUP' && 'Créer votre PIN'}
                        {authStep === 'PIN_VERIFY' && (cachedUserName ? `Bonjour, ${cachedUserName}` : 'Entrer votre PIN')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px]">
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
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="agent@wasla.dz"
                                        autoComplete="email"
                                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                        style={{ borderColor: email ? branding.primary_color + '40' : undefined }}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Mot de Passe</label>
                                <div className="relative">
                                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                        style={{ borderColor: password ? branding.primary_color + '40' : undefined }}
                                        required
                                    />
                                </div>
                            </div>
                             <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-5 text-base font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl disabled:opacity-60 mt-4"
                                style={{ 
                                    backgroundColor: branding.primary_color,
                                    boxShadow: `0 20px 25px -5px ${branding.primary_color}33`
                                }}
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
                                    className="w-full text-center text-5xl font-black py-5 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none transition-all tracking-[0.8em] text-slate-900 dark:text-white"
                                    style={{ borderColor: pin ? branding.primary_color : undefined }}
                                    required
                                />
                                {/* Dot indicators */}
                                <div className="flex justify-center gap-3 mt-4">
                                    {[0, 1, 2, 3].map(i => (
                                         <div
                                            key={i}
                                            className={`w-3 h-3 rounded-full transition-all duration-200`}
                                            style={{ 
                                                backgroundColor: pin.length > i ? branding.primary_color : (typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#1e293b' : '#e2e8f0'),
                                                boxShadow: pin.length > i ? `0 0 10px ${branding.primary_color}` : 'none'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                             <button
                                type="submit"
                                disabled={isLoading || pin.length !== 4}
                                className="w-full py-5 text-base font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl disabled:opacity-40"
                                style={{ 
                                    backgroundColor: branding.primary_color,
                                    boxShadow: `0 20px 25px -5px ${branding.primary_color}33`
                                }}
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

                {/* Footer links */}
                <div className="flex flex-col gap-4 mt-4">
                    <button
                        onClick={() => router.push('/admin/login')}
                        className="text-slate-600 dark:text-slate-500 text-xs hover:text-slate-400 transition-colors uppercase tracking-widest font-bold"
                    >
                        Accès Administrateur →
                    </button>
                    
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
        </div>
    );
}
