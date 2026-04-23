import { Plus, X, BarChart3, Link2, Type, Heading1, List, PieChart, Maximize, AppWindow } from "lucide-react";

export const WIDGET_TYPES = [
    { type: 'kpi', label: 'Metric KPI', desc: 'Affiche un chiffre clé en direct', icon: BarChart3, defaultColSpan: 1 },
    { type: 'module-link', label: 'Accès Module', desc: 'Lien direct vers un module système', icon: AppWindow, defaultColSpan: 1 },
    { type: 'quicklink', label: 'Lien Personnalisé', desc: 'Raccourci vers une URL externe', icon: Link2, defaultColSpan: 1 },
    { type: 'text', label: 'Bloc de Texte', desc: 'Note, annonce ou consigne', icon: Type, defaultColSpan: 2 },
    { type: 'heading', label: 'Titre de Section', desc: 'Séparateur pour organiser visuellement', icon: Heading1, defaultColSpan: 4 },
    { type: 'recent-leads', label: 'Derniers Prospects', desc: 'Tableau des dernières captures', icon: List, defaultColSpan: 2 },
    { type: 'source-chart', label: 'Graphique Sources', desc: 'Répartition Kiosk vs Force de Vente', icon: PieChart, defaultColSpan: 2 },
    { type: 'spacer', label: 'Espace Vide', desc: 'Ajuster l\'alignement de la grille', icon: Maximize, defaultColSpan: 1 },
];

export default function WidgetPicker({ 
    isVisible, 
    onClose, 
    onAdd,
    onSave,
    isSaving,
    isDirty
}: { 
    isVisible: boolean, 
    onClose: () => void, 
    onAdd: (type: string, colSpan: number) => void,
    onSave: () => void,
    isSaving: boolean,
    isDirty: boolean
}) {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl border-l border-slate-100 z-40 flex flex-col pt-20 animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Catalogue</h3>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">Ajouter un widget</p>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {WIDGET_TYPES.map((wt) => (
                    <button
                        key={wt.type}
                        onClick={() => onAdd(wt.type, wt.defaultColSpan)}
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-400 hover:shadow-md transition-all text-left flex items-start gap-3 group"
                    >
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
                            <wt.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-800">{wt.label}</h4>
                            <p className="text-xs text-slate-500 mt-1">{wt.desc}</p>
                        </div>
                        <Plus className="w-4 h-4 ml-auto text-slate-300 group-hover:text-indigo-500 flex-shrink-0" />
                    </button>
                ))}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
                <button 
                    onClick={onSave}
                    disabled={isSaving}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isSaving ? 'Sauvegarde...' : '💾 Sauvegarder le layout'}
                </button>
            </div>
        </div>
    );
}
