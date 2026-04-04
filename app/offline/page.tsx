'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Cloud, CloudOff, Smartphone, Layers } from 'lucide-react';

/**
 * 🦖 Offline Fallback — Sprint 6.5
 *
 * Shown by the Service Worker when a user navigates to a page that
 * isn't in the cache and the network is unavailable.
 * Replaces the Chrome dinosaur with a branded, helpful screen.
 */
export default function OfflinePage() {
    const [isRetrying, setIsRetrying] = useState(false);
    const [dots, setDots] = useState('');

    // Animated ellipsis
    useEffect(() => {
        const timer = setInterval(() => {
            setDots(d => (d.length >= 3 ? '' : d + '.'));
        }, 500);
        return () => clearInterval(timer);
    }, []);

    // Auto-retry when connection is restored
    useEffect(() => {
        const onOnline = () => {
            window.location.reload();
        };
        window.addEventListener('online', onOnline);
        return () => window.removeEventListener('online', onOnline);
    }, []);

    const handleRetry = () => {
        setIsRetrying(true);
        setTimeout(() => {
            window.location.reload();
        }, 400);
    };

    // Quick navigation targets that should always be cached
    const cachedPages = [
        { href: '/kiosk', label: 'Kiosk', icon: Smartphone, color: 'from-blue-600 to-indigo-700' },
        { href: '/dashboard', label: 'Dashboard', icon: Layers, color: 'from-slate-700 to-slate-900' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col items-center justify-center px-6 relative overflow-hidden">

            {/* Background decorative blobs */}
            <div className="absolute top-1/4 -left-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />

            {/* Grid pattern overlay */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }}
            />

            {/* Main card */}
            <div className="relative z-10 w-full max-w-sm text-center space-y-8">

                {/* Icon cluster */}
                <div className="flex items-center justify-center">
                    <div className="relative">
                        {/* Outer glow ring */}
                        <div className="absolute inset-0 rounded-full bg-red-500/20 blur-2xl scale-150" />

                        {/* Main icon container */}
                        <div className="relative w-28 h-28 bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-[32px] flex items-center justify-center shadow-2xl">
                            <CloudOff className="w-12 h-12 text-red-400" />

                            {/* Pulsing dot */}
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Text */}
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-xs font-bold uppercase tracking-widest">
                        <WifiOff className="w-3 h-3" />
                        Mode Hors-Ligne
                    </div>

                    <h1 className="text-3xl font-black text-white tracking-tight">
                        Wasla est hors-ligne
                    </h1>

                    <p className="text-slate-400 text-sm leading-relaxed">
                        Cette page n'est pas disponible sans connexion internet.
                        Vérifiez votre réseau Wi-Fi ou revenez à une page mise en cache.
                    </p>

                    {/* Live status */}
                    <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-medium pt-1">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        En attente du réseau{dots}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-3">
                    <button
                        onClick={handleRetry}
                        disabled={isRetrying}
                        className="w-full flex items-center justify-center gap-3 py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-slate-100 active:scale-[0.98] transition-all disabled:opacity-70 shadow-lg shadow-white/10"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRetrying ? 'animate-spin' : ''}`} />
                        {isRetrying ? 'Reconnexion...' : 'Réessayer'}
                    </button>

                    {/* Cached page shortcuts */}
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                        Pages disponibles hors-ligne
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                        {cachedPages.map(({ href, label, icon: Icon, color }) => (
                            <a
                                key={href}
                                href={href}
                                className={`flex flex-col items-center gap-2 py-4 bg-gradient-to-br ${color} rounded-2xl text-white font-bold text-sm hover:opacity-90 active:scale-[0.97] transition-all shadow-lg`}
                            >
                                <Icon className="w-6 h-6 opacity-80" />
                                {label}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Footer info */}
                <div className="flex items-center justify-center gap-2 text-slate-600 text-xs">
                    <Cloud className="w-3.5 h-3.5" />
                    <span>
                        Les leads saisis sont sauvegardés localement et synchronisés automatiquement à la reconnexion.
                    </span>
                </div>
            </div>

            {/* Wasla branding bottom */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.3em]">
                    WASLA · OFFLINE-FIRST
                </p>
            </div>
        </div>
    );
}
