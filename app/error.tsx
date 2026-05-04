'use client';

import { useEffect } from 'react';
import { RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('[GlobalError]', error);
    }, [error]);

    const isChunkError = error.name === 'ChunkLoadError' || 
                         error.message.includes('Loading chunk') || 
                         error.message.includes('unexpected token <');

    const handleHardReset = () => {
        import('@/lib/recovery').then(m => m.forceAppUpdate());
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 transition-colors duration-500">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[48px] shadow-2xl p-10 text-center border border-slate-100 dark:border-white/5 relative overflow-hidden">
                {/* Decorative background */}
                <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600" />
                
                <div className="mb-8 relative">
                    <div className="w-20 h-20 bg-indigo-600/10 rounded-3xl flex items-center justify-center mx-auto mb-4 animate-bounce">
                        {isChunkError ? (
                            <RefreshCw className="w-10 h-10 text-indigo-600" />
                        ) : (
                            <AlertTriangle className="w-10 h-10 text-amber-500" />
                        )}
                    </div>
                </div>

                <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
                    {isChunkError ? 'Mise à jour disponible' : 'Oups, une erreur !'}
                </h1>
                
                <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-8 leading-relaxed">
                    {isChunkError 
                        ? 'Une nouvelle version de Wasla est prête. Nous devons rafraîchir vos fichiers système.'
                        : 'Le système a rencontré une erreur inattendue. Nos équipes sont prévenues.'}
                </p>

                <div className="space-y-4">
                    {isChunkError ? (
                        <button
                            onClick={handleHardReset}
                            className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Mettre à jour maintenant
                        </button>
                    ) : (
                        <button
                            onClick={() => reset()}
                            className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all active:scale-95"
                        >
                            Réessayer
                        </button>
                    )}

                    <button
                        onClick={handleHardReset}
                        className="w-full py-3 text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest hover:text-indigo-500 transition-colors"
                    >
                        Réinitialisation forcée
                    </button>
                </div>

                {error.digest && (
                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5">
                        <p className="text-[8px] font-mono text-slate-300 dark:text-slate-700 uppercase">
                            Error ID: {error.digest}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
