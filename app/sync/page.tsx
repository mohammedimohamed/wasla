"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    CheckCircle2,
    AlertCircle,
    Clock,
    RefreshCw,
    Server,
    Cloud
} from "lucide-react";
import toast from "react-hot-toast";

interface SyncStatus {
    pendingCount: number;
    lastSync: string | null;
    isSyncing: boolean;
}

export default function SyncPage() {
    const router = useRouter();
    const [status, setStatus] = useState<SyncStatus>({
        pendingCount: 0,
        lastSync: null,
        isSyncing: false
    });

    useEffect(() => {
        fetchSyncInfo();
    }, []);

    const fetchSyncInfo = async () => {
        try {
            const response = await fetch("/api/leads?status=pending");
            if (response.ok) {
                const data = await response.json();
                setStatus(prev => ({
                    ...prev,
                    pendingCount: data.leads.length
                }));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const startSync = async () => {
        if (status.pendingCount === 0) {
            toast.success("Tout est déjà synchronisé !");
            return;
        }

        if (!navigator.onLine) {
            toast.error("Connexion internet requise pour synchroniser");
            return;
        }

        setStatus(prev => ({ ...prev, isSyncing: true }));
        const loadingToast = toast.loading("Envoi des données au serveur...");

        try {
            // 1. Get pending leads
            const getResponse = await fetch("/api/leads?status=pending");
            const { leads } = await getResponse.json();

            // 2. Transmit to remote (Simulated using the /api/sync endpoint for demo)
            const syncResponse = await fetch("/api/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(leads)
            });

            if (syncResponse.ok) {
                toast.success("Synchronisation effectuée", { id: loadingToast });
                setStatus(prev => ({
                    ...prev,
                    pendingCount: 0,
                    lastSync: new Date().toISOString()
                }));
            } else {
                throw new Error();
            }
        } catch (error) {
            toast.error("Échec de la synchronisation", { id: loadingToast });
        } finally {
            setStatus(prev => ({ ...prev, isSyncing: false }));
        }
    };

    return (
        <div className="flex-1 flex flex-col pt-4 bg-slate-50">
            <header className="px-6 mb-8 flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-black text-slate-900">Synchronisation</h1>
            </header>

            <div className="px-6 space-y-6">
                {/* Main Status Hero */}
                <div className="bg-slate-900 rounded-[32px] p-8 text-center space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary opacity-50" />

                    <div className="flex justify-center">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${status.pendingCount > 0 ? 'border-orange-500/20 bg-orange-500/10' : 'border-emerald-500/20 bg-emerald-500/10'}`}>
                            {status.pendingCount > 0 ? (
                                <Clock className="w-10 h-10 text-orange-500" />
                            ) : (
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            )}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <h2 className="text-3xl font-black text-white">
                            {status.pendingCount} <span className="text-slate-500 text-xl font-bold uppercase tracking-tight">Leads en attente</span>
                        </h2>
                        <p className="text-slate-400 text-xs font-medium">
                            {status.pendingCount > 0 ? "Des données locales doivent être envoyées au serveur." : "Toutes vos fiches sont sauvegardées en sécurité sur le serveur."}
                        </p>
                    </div>

                    <button
                        onClick={startSync}
                        disabled={status.isSyncing}
                        className={`w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 ${status.pendingCount > 0 ? 'bg-primary text-white shadow-xl shadow-blue-900/40' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                    >
                        {status.isSyncing ? (
                            <RefreshCw className="w-6 h-6 animate-spin" />
                        ) : (
                            <Cloud className="w-6 h-6" />
                        )}
                        Synchroniser maintenant
                    </button>
                </div>

                {/* Details Card */}
                <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4 shadow-sm">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Informations techniques</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 font-medium">Serveur distant</span>
                            <span className="font-bold text-slate-900 flex items-center gap-2">
                                <Server className="w-4 h-4 text-emerald-500" />
                                wasla-api.main.dz
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 font-medium">Dernière réussite</span>
                            <span className="font-bold text-slate-900">
                                {status.lastSync ? new Date(status.lastSync).toLocaleString() : "Jamais"}
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
