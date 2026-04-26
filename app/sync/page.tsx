"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ChevronLeft,
    CheckCircle2,
    Clock,
    RefreshCw,
    Server,
    Cloud,
    CloudOff,
    WifiOff
} from "lucide-react";
import toast from "react-hot-toast";
import { useSyncStatus } from "@/src/hooks/useSyncStatus";

export default function SyncPage() {
    const router = useRouter();
    const { isOnline, isSyncing, pendingCount, triggerSync } = useSyncStatus();
    const [lastSync, setLastSync] = useState<string | null>(null);

    const handleSync = async () => {
        if (pendingCount === 0) {
            toast.success("Tout est déjà synchronisé !");
            return;
        }

        if (!isOnline) {
            toast.error("Connexion internet requise pour synchroniser");
            return;
        }

        const loadingToast = toast.loading("Envoi des données au serveur...");

        try {
            await triggerSync();
            toast.success("Synchronisation effectuée", { id: loadingToast });
            setLastSync(new Date().toISOString());
        } catch (error) {
            toast.error("Échec de la synchronisation", { id: loadingToast });
        }
    };

    return (
        <div className="flex-1 flex flex-col pt-4 bg-slate-50">
            <header className="px-6 mb-8 flex items-center gap-4">
                <Link href="/" className="p-2 -ml-2 hover:bg-gray-100 rounded-lg inline-flex items-center justify-center text-slate-700">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-xl font-black text-slate-900">Synchronisation</h1>
            </header>

            <div className="px-6 space-y-6">
                {/* Offline Banner */}
                {!isOnline && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                        <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
                        <p className="text-amber-800 text-sm font-bold">
                            Vous êtes hors ligne. Les données sont stockées localement et seront envoyées dès que la connexion sera rétablie.
                        </p>
                    </div>
                )}

                {/* Main Status Hero */}
                <div className="bg-slate-900 rounded-[32px] p-8 text-center space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary opacity-50" />

                    <div className="flex justify-center">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${pendingCount > 0 ? 'border-orange-500/20 bg-orange-500/10' : 'border-emerald-500/20 bg-emerald-500/10'}`}>
                            {pendingCount > 0 ? (
                                <Clock className="w-10 h-10 text-orange-500" />
                            ) : (
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            )}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <h2 className="text-3xl font-black text-white">
                            {pendingCount} <span className="text-slate-500 text-xl font-bold uppercase tracking-tight">Leads en attente</span>
                        </h2>
                        <p className="text-slate-400 text-xs font-medium">
                            {pendingCount > 0 ? "Des données locales doivent être envoyées au serveur." : "Toutes vos fiches sont sauvegardées en sécurité sur le serveur."}
                        </p>
                    </div>

                    <button
                        onClick={handleSync}
                        disabled={isSyncing || !isOnline || pendingCount === 0}
                        className={`w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 ${
                            pendingCount > 0 && isOnline
                                ? 'bg-primary text-white shadow-xl shadow-blue-900/40'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                    >
                        {isSyncing ? (
                            <RefreshCw className="w-6 h-6 animate-spin" />
                        ) : isOnline ? (
                            <Cloud className="w-6 h-6" />
                        ) : (
                            <CloudOff className="w-6 h-6" />
                        )}
                        {isSyncing ? "Synchronisation en cours..." : isOnline ? "Synchroniser maintenant" : "Hors ligne"}
                    </button>
                </div>

                {/* Details Card */}
                <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4 shadow-sm">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Informations techniques</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 font-medium">Statut réseau</span>
                            <span className={`font-bold flex items-center gap-2 ${isOnline ? 'text-emerald-600' : 'text-red-500'}`}>
                                {isOnline ? (
                                    <><Server className="w-4 h-4" /> En ligne</>
                                ) : (
                                    <><CloudOff className="w-4 h-4" /> Hors ligne</>
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 font-medium">Stockage local</span>
                            <span className="font-bold text-slate-900">
                                IndexedDB
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 font-medium">Dernière réussite</span>
                            <span className="font-bold text-slate-900">
                                {lastSync ? new Date(lastSync).toLocaleString() : "Jamais"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 font-medium">Mode de transfert</span>
                            <span className="bg-blue-50 text-primary text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">
                                Batch JSON
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
