"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, HardDrive, Download, UploadCloud, ShieldAlert, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function MaintenancePage() {
    const router = useRouter();
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [fileToRestore, setFileToRestore] = useState<File | null>(null);

    // 🛡️ RBAC Session 
    useEffect(() => {
        const loadPage = async () => {
            const authRes = await fetch('/api/auth');
            if (!authRes.ok) {
                router.push("/admin/login");
                return;
            }
            const authData = await authRes.json();
            if (authData.user.role !== 'ADMINISTRATOR') {
                router.push("/admin/login");
            }
        };
        loadPage();
    }, [router]);

    const handleBackup = async () => {
        setIsBackingUp(true);
        try {
            const res = await fetch('/api/backup');
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Backup failed');
            }
            const blob = await res.blob();
            const sizeKB = res.headers.get('X-Backup-Size-KB') || '?';
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const cd = res.headers.get('Content-Disposition') || '';
            const match = cd.match(/filename="(.+)"/);
            a.download = match ? match[1] : `wasla_backup_${new Date().toISOString().split('T')[0]}.sqlite`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success(`✅ Sauvegarde téléchargée (${sizeKB} KB)`);
        } catch (err: any) {
            toast.error(err.message || 'Erreur de sauvegarde');
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleRestore = async () => {
        if (!fileToRestore) return;
        if (!confirm("⚠️ DANGER : Êtes-vous sûr de vouloir écraser la base de données actuelle ? Cette action supprimera toutes les données récentes et redémarrera le serveur.")) {
            return;
        }

        setIsRestoring(true);
        const formData = new FormData();
        formData.append("database", fileToRestore);

        try {
            const res = await fetch('/api/maintenance/restore', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Restore failed');
            }

            toast.success("Restoration réussie. Le serveur redémarre...");
            
            // Wait a few seconds for server to restart, then return to login
            setTimeout(() => {
                window.location.href = '/admin/login';
            }, 3000);

        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la restauration');
            setIsRestoring(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/admin/dashboard")} className="p-2 -ml-2 hover:bg-slate-100 rounded-xl transition-all">
                        <ChevronLeft className="w-6 h-6 text-slate-700" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Maintenance</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Base de données & Sauvegardes</p>
                    </div>
                </div>
            </header>

            <div className="p-6 md:p-10 max-w-4xl mx-auto w-full space-y-10">
                {/* Download Section */}
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-50" />
                    
                    <div className="p-8 relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
                                <Download className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 uppercase tracking-tight text-lg">Exporter la base de données</h3>
                                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Télécharger un snapshot SQLite .db</p>
                            </div>
                        </div>

                        <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed max-w-2xl">
                            Téléchargez la base de données de production incluant tous les leads, récompenses, et configurations. 
                            Recommandé en fin de journée pour conservation hors ligne.
                        </p>

                        <button
                            onClick={handleBackup}
                            disabled={isBackingUp}
                            className="flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-emerald-200 transition-all disabled:opacity-50"
                        >
                            {isBackingUp ? <Loader2 className="w-5 h-5 animate-spin" /> : <HardDrive className="w-5 h-5" />}
                            {isBackingUp ? "Création du Backup..." : "Télécharger la Base de données"}
                        </button>
                    </div>
                </div>

                {/* Upload Section */}
                <div className="bg-white rounded-[32px] border border-rose-100 shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-rose-50 rounded-full -mr-20 -mt-20 opacity-50 pointer-events-none" />
                    
                    <div className="p-8 relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shadow-sm">
                                <ShieldAlert className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-black text-rose-900 uppercase tracking-tight text-lg">Restaurer la base de données</h3>
                                <p className="text-[10px] font-bold text-rose-500 tracking-widest uppercase">Écrasement du fichier de production</p>
                            </div>
                        </div>

                        <div className="bg-rose-50 rounded-2xl p-6 mb-8 border border-rose-200">
                            <p className="text-sm font-bold text-rose-800 leading-relaxed mb-4">
                                ⚠️ Attention : L'importation d'un fichier `.sqlite` remplacera instantanément l'intégralité des données présentes sur le serveur.
                                Cette opération forcera le redémarrage du système.
                            </p>
                            <div className="flex flex-col gap-4">
                                <input 
                                    type="file" 
                                    accept=".db,.sqlite,.sqlite3"
                                    onChange={(e) => setFileToRestore(e.target.files?.[0] || null)}
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-white file:text-rose-600 hover:file:bg-rose-100 hover:file:cursor-pointer transition-all border-dashed border-2 border-rose-200 rounded-2xl p-4 bg-white/50"
                                />
                                {fileToRestore && (
                                    <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-rose-100 shadow-sm">
                                        <span className="text-sm font-black text-slate-700 truncate">{fileToRestore.name}</span>
                                        <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                            {(fileToRestore.size / 1024 / 1024).toFixed(2)} MB
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleRestore}
                            disabled={isRestoring || !fileToRestore}
                            className="flex items-center gap-3 px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-rose-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isRestoring ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                            {isRestoring ? "Reboot du Serveur en cours..." : "Lancer la Restauration Totale"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
