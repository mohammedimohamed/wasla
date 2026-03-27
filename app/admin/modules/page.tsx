"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    LayoutGrid,
    ShieldCheck,
    Gift,
    Monitor,
    Brain,
    Loader2,
    ToggleLeft,
    ToggleRight,
    ArrowLeft,
    CheckCircle2,
    XCircle
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useTranslation } from "@/src/context/LanguageContext";

interface Module {
    id: string;
    name: string;
    is_enabled: number;
    description: string;
}

export default function ModuleRegistryPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [modules, setModules] = useState<Module[]>([]);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    useEffect(() => {
        const loadModules = async () => {
            try {
                const res = await fetch('/api/admin/modules');
                if (!res.ok) throw new Error('Failed to load');
                const data = await res.json();
                setModules(data);
            } catch (e) {
                toast.error(t('common.error'));
            } finally {
                setIsLoading(false);
            }
        };
        loadModules();
    }, [t]);

    const toggleModule = async (id: string, currentStatus: number) => {
        setIsUpdating(id);
        const nextStatus = currentStatus === 1 ? 0 : 1;
        try {
            const res = await fetch('/api/admin/modules', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, is_enabled: nextStatus })
            });

            if (res.ok) {
                setModules(prev => 
                    prev.map(m => m.id === id ? { ...m, is_enabled: nextStatus } : m)
                );
                toast.success(`Module ${id} ${nextStatus ? 'activé' : 'désactivé'}`);
            } else {
                throw new Error('Update failed');
            }
        } catch (e) {
            toast.error('Erreur lors de la mise à jour');
        } finally {
            setIsUpdating(null);
        }
    };

    const getIcon = (id: string) => {
        switch (id) {
            case 'vault': return <ShieldCheck className="w-6 h-6" />;
            case 'rewards': return <Gift className="w-6 h-6" />;
            case 'mediashow': return <Monitor className="w-6 h-6" />;
            case 'intelligence': return <Brain className="w-6 h-6" />;
            default: return <LayoutGrid className="w-6 h-6" />;
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
                <div className="flex flex-col items-center gap-4 text-slate-400">
                    <Loader2 className="w-10 h-10 animate-spin" />
                    <p className="font-black uppercase tracking-widest text-[10px]">{t('common.loading')}</p>
                </div>
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
                    <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Gestion des Modules</h1>
                </div>
            </header>

            <div className="p-6 max-w-4xl mx-auto w-full space-y-8">
                <div className="bg-slate-900 text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-10">
                        <LayoutGrid className="w-48 h-48" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <h2 className="text-3xl font-black tracking-tight uppercase">Modular Engine v2.0</h2>
                        <p className="text-slate-400 font-medium max-w-lg leading-relaxed">
                            Contrôlez les fonctionnalités de l'écosystème Wasla. 
                            Désactiver un module réduit la charge système et sécurise les routes correspondantes.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {modules.map((m) => (
                        <div key={m.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all flex items-center justify-between group">
                            <div className="flex items-center gap-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${m.is_enabled ? 'bg-indigo-50 text-indigo-600 shadow-inner' : 'bg-slate-100 text-slate-400 grayscale'}`}>
                                    {getIcon(m.id)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-slate-900 uppercase tracking-tight">{m.name}</h3>
                                        {m.is_enabled ? 
                                            <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-100">Live</span> : 
                                            <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full uppercase tracking-widest border border-slate-100">Hidden</span>
                                        }
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium mt-1 uppercase tracking-wider">{m.description}</p>
                                </div>
                            </div>

                            <button
                                disabled={isUpdating === m.id}
                                onClick={() => toggleModule(m.id, m.is_enabled)}
                                className={`w-16 h-8 rounded-full p-1 transition-all flex items-center relative ${m.is_enabled ? 'bg-emerald-500 justify-end shadow-lg shadow-emerald-200' : 'bg-slate-200 justify-start shadow-inner'}`}
                            >
                                <div className="bg-white w-6 h-6 rounded-full shadow-md flex items-center justify-center">
                                    {isUpdating === m.id ? 
                                        <Loader2 className="w-3 h-3 animate-spin text-slate-400" /> : 
                                        (m.is_enabled ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-slate-400" />)
                                    }
                                </div>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
