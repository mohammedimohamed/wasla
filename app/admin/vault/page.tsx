"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ShieldCheck,
    Lock,
    Unlock,
    Database,
    RefreshCw,
    AlertTriangle,
    Loader2,
    ArrowLeft,
    CheckCircle2
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useTranslation } from "@/src/context/LanguageContext";

export default function VaultPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isEnabled, setIsEnabled] = useState(true);
    const [isMigrating, setIsMigrating] = useState(false);

    useEffect(() => {
        const loadVault = async () => {
            try {
                const res = await fetch('/api/admin/vault');
                if (!res.ok) throw new Error('Failed to load');
                const data = await res.json();
                setIsEnabled(data.encryption_enabled);
            } catch (e) {
                toast.error(t('common.error'));
            } finally {
                setIsLoading(false);
            }
        };
        loadVault();
    }, [t]);

    const toggleEncryption = async () => {
        const next = !isEnabled;
        try {
            const res = await fetch('/api/admin/vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'TOGGLE', enabled: next })
            });
            if (res.ok) {
                setIsEnabled(next);
                toast.success(`Chiffrement ${next ? 'activé' : 'désactivé'}`);
            }
        } catch (e) {
            toast.error('Erreur');
        }
    };

    const runMigration = async () => {
        if (!confirm('Voulez-vous forcer le chiffrement de tous les prospects existants ?')) return;
        setIsMigrating(true);
        try {
            const res = await fetch('/api/admin/vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'MIGRATE' })
            });
            if (res.ok) {
                const data = await res.json();
                toast.success(`${data.migrated} prospects chiffrés avec succès.`);
            }
        } catch (e) {
            toast.error('Erreur de migration');
        } finally {
            setIsMigrating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/admin/dashboard")} className="p-2 -ml-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Wasla Vault (Security)</h1>
                </div>
            </header>

            <div className="p-6 max-w-4xl mx-auto w-full space-y-8">
                <div className="bg-indigo-900 text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-10">
                        <ShieldCheck className="w-48 h-48" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <h2 className="text-3xl font-black tracking-tight uppercase">Chiffrement AES-256-GCM</h2>
                        <p className="text-indigo-200 font-medium max-w-lg leading-relaxed">
                            Protégez les données sensibles de vos prospects. Le Vault assure que même en cas d'accès direct à la base de données, les informations restent illisibles sans la clé système.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                                {isEnabled ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6 text-orange-500" />}
                            </div>
                            <button
                                onClick={toggleEncryption}
                                className={`w-14 h-7 rounded-full p-1 transition-all flex items-center ${isEnabled ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'}`}
                            >
                                <div className="bg-white w-5 h-5 rounded-full shadow-md" />
                            </button>
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 uppercase tracking-tight">Statut du Chiffrement</h3>
                            <p className="text-[11px] text-slate-400 font-medium mt-1 uppercase tracking-wider">
                                {isEnabled ? 'Protection active sur les nouveaux leads' : 'Nouveaux leads stockés en clair (Non Recommandé)'}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner">
                                <RefreshCw className={`w-6 h-6 ${isMigrating ? 'animate-spin' : ''}`} />
                            </div>
                            <button
                                disabled={isMigrating}
                                onClick={runMigration}
                                className="text-[10px] font-black bg-slate-900 text-white px-4 py-2 rounded-full uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
                            >
                                Migrer
                            </button>
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 uppercase tracking-tight">Migration de Masse</h3>
                            <p className="text-[11px] text-slate-400 font-medium mt-1 uppercase tracking-wider">
                                Chiffrer rétroactivement les leads stockés en clair.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-6 rounded-[32px] flex items-start gap-4">
                    <AlertTriangle className="w-6 h-6 text-amber-600 mt-1 shrink-0" />
                    <div>
                        <h4 className="font-black text-amber-900 uppercase text-xs">Avertissement de Sécurité</h4>
                        <p className="text-[11px] text-amber-700/80 font-medium mt-1 leading-relaxed uppercase tracking-wider">
                            La désactivation du chiffrement expose les données personnelles des prospects. Cette action est enregistrée dans les logs d'audit système.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
