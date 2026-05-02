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
        <div className="flex-1 selection:bg-indigo-500/30 font-sans transition-colors duration-300">
            <main className="p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-10">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">System <span className="text-rose-600 dark:text-rose-500">Maintenance</span></h2>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-widest uppercase">Database Backup & Recovery Center</p>
                </div>
                {/* Download Section */}
                <div className="bg-white dark:bg-white/5 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden relative transition-colors duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-500/10 rounded-full -mr-16 -mt-16 opacity-50 transition-colors" />
                    
                    <div className="p-8 relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shadow-sm">
                                <Download className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg">Exporter la base de données</h3>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase">Télécharger un snapshot SQLite .db</p>
                            </div>
                        </div>

                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 leading-relaxed max-w-2xl">
                            Téléchargez la base de données de production incluant tous les leads, récompenses, et configurations. 
                            Recommandé en fin de journée pour conservation hors ligne.
                        </p>

                        <button
                            onClick={handleBackup}
                            disabled={isBackingUp}
                            className="flex items-center gap-3 px-8 py-4 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-none transition-all disabled:opacity-50"
                        >
                            {isBackingUp ? <Loader2 className="w-5 h-5 animate-spin" /> : <HardDrive className="w-5 h-5" />}
                            {isBackingUp ? "Création du Backup..." : "Télécharger la Base de données"}
                        </button>
                    </div>
                </div>

                {/* Upload Section */}
                <div className="bg-white dark:bg-white/5 rounded-[32px] border border-rose-100 dark:border-rose-500/20 shadow-sm overflow-hidden relative transition-colors duration-300">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-rose-50 dark:bg-rose-500/10 rounded-full -mr-20 -mt-20 opacity-50 pointer-events-none transition-colors" />
                    
                    <div className="p-8 relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center shadow-sm">
                                <ShieldAlert className="w-6 h-6" />
                            </div>
                            <div>
                                 <h3 className="font-black text-rose-900 dark:text-rose-400 uppercase tracking-tight text-lg">Restaurer la base de données</h3>
                                <p className="text-[10px] font-bold text-rose-500 dark:text-rose-400/60 tracking-widest uppercase">Écrasement du fichier de production</p>
                            </div>
                        </div>

                        <div className="bg-rose-50 dark:bg-rose-500/10 rounded-2xl p-6 mb-8 border border-rose-200 dark:border-rose-500/30 transition-colors">
                            <p className="text-sm font-bold text-rose-800 dark:text-rose-400 leading-relaxed mb-4">
                                ⚠️ Attention : L'importation d'un fichier `.sqlite` remplacera instantanément l'intégralité des données présentes sur le serveur.
                                Cette opération forcera le redémarrage du système.
                            </p>
                            <div className="flex flex-col gap-4">
                                <input 
                                    type="file" 
                                    accept=".db,.sqlite,.sqlite3"
                                    onChange={(e) => setFileToRestore(e.target.files?.[0] || null)}
                                    className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-white dark:file:bg-slate-800 file:text-rose-600 dark:file:text-rose-400 hover:file:bg-rose-100 dark:hover:file:bg-slate-700 hover:file:cursor-pointer transition-all border-dashed border-2 border-rose-200 dark:border-rose-500/30 rounded-2xl p-4 bg-white/50 dark:bg-white/5"
                                />
                                {fileToRestore && (
                                    <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-rose-100 dark:border-rose-500/30 shadow-sm">
                                        <span className="text-sm font-black text-slate-700 dark:text-slate-200 truncate">{fileToRestore.name}</span>
                                        <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded">
                                            {(fileToRestore.size / 1024 / 1024).toFixed(2)} MB
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleRestore}
                            disabled={isRestoring || !fileToRestore}
                            className="flex items-center gap-3 px-8 py-4 bg-rose-600 dark:bg-rose-500 hover:bg-rose-700 dark:hover:bg-rose-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-rose-200 dark:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isRestoring ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                            {isRestoring ? "Reboot du Serveur en cours..." : "Lancer la Restauration Totale"}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
