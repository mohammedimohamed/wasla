"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    Download,
    FileJson,
    FileSpreadsheet,
    Trash2,
    Calendar,
    Filter,
    AlertTriangle
} from "lucide-react";
import toast from "react-hot-toast";

export default function ExportPage() {
    const router = useRouter();
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (format: 'csv' | 'json') => {
        setIsExporting(true);
        try {
            window.location.href = `/api/export?format=${format}`;
            toast.success(`Export ${format.toUpperCase()} lancé`);
        } catch (error) {
            toast.error("Erreur d'export");
        } finally {
            setIsExporting(false);
        }
    };

    const handleResetDb = async () => {
        const confirmation = confirm("⚠️ ATTENTION : Cette action supprimera TOUS les leads définitivement. Souhaitez-vous continuer ?");
        if (!confirmation) return;

        const doubleCheck = confirm("Dernière confirmation : Êtes-vous ABSOLUMENT sûr ?");
        if (!doubleCheck) return;

        try {
            const response = await fetch("/api/export", { method: "DELETE" });
            if (response.ok) {
                toast.success("Base de données réinitialisée");
            }
        } catch (error) {
            toast.error("Erreur lors de la réinitialisation");
        }
    };

    return (
        <div className="flex-1 flex flex-col pt-4 bg-slate-50">
            <header className="px-6 mb-8">
                <div className="flex items-center gap-4 mb-2">
                    <button onClick={() => router.push('/admin/dashboard')} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-black text-slate-900 leading-tight">Export & Données</h1>
                </div>
                <p className="text-sm text-gray-500 font-medium">Extraire les fiches prospects collectées pendant l'événement.</p>
            </header>

            <div className="px-6 space-y-8">
                {/* Export Options */}
                <section className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                        <Download className="w-3 h-3" /> formats disponibles
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        <button
                            onClick={() => handleExport('csv')}
                            className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                                    <FileSpreadsheet className="w-7 h-7" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-slate-900">Format Excel (CSV)</p>
                                    <p className="text-xs text-gray-500 font-medium whitespace-pre-wrap">Toutes les colonnes, encodage UTF-8 avec BOM</p>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => handleExport('json')}
                            className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                    <FileJson className="w-7 h-7" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-slate-900">Format JSON</p>
                                    <p className="text-xs text-gray-500 font-medium whitespace-pre-wrap">Format brut pour intégration technique</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </section>

                {/* Advanced Filters Card */}
                <section className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                            <Filter className="w-4 h-4 text-primary" /> Filtres d'extraction
                        </h3>
                        <span className="text-[10px] bg-slate-100 px-2 py-1 rounded font-bold text-slate-400">BIENTÔT</span>
                    </div>

                    <div className="space-y-4 opacity-40 pointer-events-none">
                        <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                <span className="text-sm font-bold text-slate-700">Période : Tout</span>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-gray-400" />
                                <span className="text-sm font-bold text-slate-700">Statut : Tous les leads</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Danger Zone */}
                <section className="pt-8">
                    <div className="bg-red-50 p-6 rounded-[32px] border border-red-100 space-y-4">
                        <div className="flex items-center gap-3 text-red-600">
                            <Trash2 className="w-5 h-5" />
                            <h3 className="font-black text-sm uppercase tracking-widest">Zone de danger</h3>
                        </div>
                        <p className="text-xs text-red-600 font-medium leading-relaxed">
                            Utilisez cette option pour purger tous les leads de la base. Recommandé uniquement avant un nouvel événement ou pour tests.
                        </p>
                        <button
                            onClick={handleResetDb}
                            className="w-full bg-white text-red-600 border-2 border-red-100 py-4 rounded-2xl font-black text-sm uppercase tracking-widest active:bg-red-100 active:scale-[0.98] transition-all"
                        >
                            Réinitialiser la base de données
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
