'use client';

import { useState, useEffect } from 'react';
import { DownloadCloud, Image as ImageIcon, FileText, CheckCircle2, Loader2, Users } from 'lucide-react';
// import { toPng } from 'html-to-image';
// import JSZip from 'jszip';
// import jsPDF from 'jspdf';

interface Props {
    companyProfile: any;
}

export default function TabExportStudio({ companyProfile }: Props) {
    const [agents, setAgents] = useState<any[]>([]);
    const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
    const [format, setFormat] = useState<'png' | 'pdf'>('png');
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState(0);

    // Fetch Agents on Mount
    useEffect(() => {
        fetch('/api/users')
            .then(res => res.json())
            .then(data => {
                if (data.users) {
                    // Filter out admins if necessary, or keep everyone
                    const staff = data.users.filter((u:any) => u.active);
                    setAgents(staff);
                    setSelectedAgents(new Set(staff.map((u:any) => u.id))); 
                }
            });
    }, []);

    const handleToggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) setSelectedAgents(new Set(agents.map(a => a.id)));
        else setSelectedAgents(new Set());
    };

    const handleToggleOne = (id: string) => {
        const next = new Set(selectedAgents);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedAgents(next);
    };

    const handleExport = async () => {
        if (selectedAgents.size === 0) return;
        setIsExporting(true);
        setProgress(0);

        // ─────────────────────────────────────────────────────────────
        // LOGIQUE D'EXPORT HD : PNG / PDF 
        // ─────────────────────────────────────────────────────────────
        // Cette section prépare le flux asynchrone pour traiter le rendu dom:
        // 1. Instancier jsZip
        // 2. Boucler sur les agents sélectionnés
        // 3. Rendre un composant Badge invisible hors-écran (ou pointer vers la ref du preview)
        // 4. Appeler htmlToImage.toPng(node, { pixelRatio: 3 }) => 300 dpi
        // 5. Si format === 'pdf': pack dans jsPDF(85.6, 53.98)
        // 6. Ajouter au zip.
        // 7. Générer et télécharger le blob ZIP.
        // ─────────────────────────────────────────────────────────────

        const total = selectedAgents.size;
        let count = 0;

        // Simulation pour l'instant (Validation UI)
        return new Promise<void>(resolve => {
            const interval = setInterval(() => {
                count++;
                setProgress(Math.round((count / total) * 100));
                if (count >= total) {
                    clearInterval(interval);
                    setTimeout(() => {
                        setIsExporting(false);
                        resolve();
                    }, 500);
                }
            }, 300); // 300ms mock generation time per badge
        });
    };

    return (
        <div className="space-y-8 pb-10 max-w-2xl">
            <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <DownloadCloud className="text-blue-500 w-6 h-6" />
                    Studio d'Export HD
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Générez les fichiers Haute Définition (300dpi) de vos badges PVC pour impression. 
                </p>
            </div>

            {/* Format Selection */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => setFormat('png')}
                    className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden ${format === 'png' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                    {format === 'png' && <CheckCircle2 className="absolute top-4 right-4 text-blue-500 w-5 h-5" />}
                    <ImageIcon className={`w-8 h-8 mb-3 ${format==='png' ? 'text-blue-500': 'text-slate-400'}`} />
                    <h3 className={`font-black uppercase tracking-widest text-xs ${format==='png'?'text-blue-900':'text-slate-700'}`}>Archive ZIP (Images PNG)</h3>
                    <p className={`text-xs mt-1 ${format==='png'?'text-blue-600':'text-slate-500'}`}>Images sans perte idéales pour envoyer à l'imprimeur (Recto/Verso).</p>
                </button>

                <button
                    onClick={() => setFormat('pdf')}
                    className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden ${format === 'pdf' ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                    {format === 'pdf' && <CheckCircle2 className="absolute top-4 right-4 text-red-500 w-5 h-5" />}
                    <FileText className={`w-8 h-8 mb-3 ${format==='pdf' ? 'text-red-500': 'text-slate-400'}`} />
                    <h3 className={`font-black uppercase tracking-widest text-xs ${format==='pdf'?'text-red-900':'text-slate-700'}`}>Documents PDF Prêts à l'Emploi</h3>
                    <p className={`text-xs mt-1 ${format==='pdf'?'text-red-600':'text-slate-500'}`}>Un fichier PDF par agent aux dimensions exactes (Marge perdue incluse).</p>
                </button>
            </div>

            {/* Selection Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            checked={selectedAgents.size > 0 && selectedAgents.size === agents.length}
                            onChange={handleToggleAll}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600"
                        />
                        <span className="text-sm font-bold text-slate-700">Sélectionner Tous ({agents.length})</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <Users className="w-4 h-4" /> {selectedAgents.size} Agents Sélectionnés
                    </div>
                </div>
                
                <div className="max-h-[300px] overflow-y-auto p-2">
                    {agents.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 font-bold text-sm">Chargement des agents...</div>
                    ) : (
                        <div className="space-y-1">
                            {agents.map(agent => (
                                <label key={agent.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedAgents.has(agent.id)}
                                        onChange={() => handleToggleOne(agent.id)}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600"
                                    />
                                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                        {agent.photo_url ? <img src={agent.photo_url} className="w-full h-full object-cover" /> : null}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-800">{agent.name}</p>
                                        <p className="text-xs text-slate-400">{agent.job_title || 'Aucun poste'}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-200 flex flex-col items-end">
                <button
                    onClick={handleExport}
                    disabled={isExporting || selectedAgents.size === 0}
                    className="flex justify-center items-center gap-3 w-full max-w-sm bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-xl active:scale-95 disabled:opacity-50 overflow-hidden relative"
                >
                    {isExporting ? (
                        <>
                            <div className="absolute left-0 top-0 bottom-0 bg-blue-600/30 transition-all duration-300" style={{ width: `${progress}%` }} />
                            <Loader2 className="w-4 h-4 animate-spin relative z-10" />
                            <span className="relative z-10">Génération... {progress}%</span>
                        </>
                    ) : (
                        <>
                            <DownloadCloud className="w-5 h-5" />
                            Générer {selectedAgents.size} Badges
                        </>
                    )}
                </button>
                <p className="text-xs text-slate-400 mt-3 max-w-sm text-center">
                    Note: La génération utilise le moteur local de votre navigateur. Le temps dépend de la puissance de votre machine.
                </p>
            </div>
        </div>
    );
}
