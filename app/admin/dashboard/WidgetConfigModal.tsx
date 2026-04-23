import { X } from "lucide-react";
import { QUICKLINK_ICONS } from "./widgets/QuickLinkWidget";
import { useState, useEffect } from "react";

export default function WidgetConfigModal({
    widget,
    isVisible,
    onClose,
    onSave
}: {
    widget: any,
    isVisible: boolean,
    onClose: () => void,
    onSave: (config: any) => void
}) {
    const [config, setConfig] = useState<any>({});

    useEffect(() => {
        if (widget) {
            setConfig(widget.config || {});
        }
    }, [widget]);

    if (!isVisible || !widget) return null;

    const handleSave = () => {
        onSave(config);
    };

    const updateConfig = (key: string, value: any) => {
        setConfig((prev: any) => ({ ...prev, [key]: value }));
    };

    const MODULE_OPTIONS = [
        { url: '/admin/golden-records', label: 'Golden Records (Premium Leads)' },
        { url: '/admin/badges/editor', label: 'Badge Engine' },
        { url: '/admin/settings', label: 'Configuration Stand & Identité' },
        { url: '/admin/settings/form-builder', label: 'Form Builder' },
        { url: '/admin/mediashow', label: 'Mediashow' },
        { url: '/admin/maintenance', label: 'Maintenance Base de données' },
        { url: '/admin/intelligence', label: 'Intelligence (Anti-Fraude)' },
        { url: '/admin/sync', label: 'Sync Cloud' },
        { url: '/admin/rewards', label: 'Catalogue Récompenses' },
        { url: '/admin/vault', label: 'Vault (Sécurité)' },
        { url: '/admin/teams', label: 'Gestion des Équipes' },
        { url: '/admin/users', label: 'Gestion des Utilisateurs' },
        { url: '/admin/modules', label: 'Module Manager' },
        { url: '/admin/qr', label: 'Visuel QR Kiosk' },
        { url: '/admin/analytics', label: 'Analytics Avancés' },
        { url: '/admin/leads/list', label: 'Liste des Prospects' }
    ];

    const renderFields = () => {
        switch (widget.type) {
            case 'kpi':
                return (
                    <>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Métrique</label>
                            <select value={config.metric || 'totalLeads'} onChange={e => updateConfig('metric', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm">
                                <option value="totalLeads">Total Leads</option>
                                <option value="leadsToday">Leads Aujourd'hui</option>
                                <option value="syncedLeads">Leads Synchronisés</option>
                                <option value="kioskLeads">Leads Kiosk</option>
                                <option value="commercialLeads">Leads Force de Vente</option>
                                <option value="rewardsGiven">Récompenses Distribuées</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Titre Override (Optionnel)</label>
                            <input type="text" value={config.title || ''} onChange={e => updateConfig('title', e.target.value)} placeholder="Titre par défaut de la métrique" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Couleur</label>
                            <select value={config.color || 'blue'} onChange={e => updateConfig('color', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm">
                                <option value="blue">Bleu</option>
                                <option value="emerald">Emeraude</option>
                                <option value="indigo">Indigo</option>
                                <option value="amber">Ambre</option>
                                <option value="rose">Rose</option>
                                <option value="orange">Orange</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Icône</label>
                            <select value={config.icon || 'BarChart3'} onChange={e => updateConfig('icon', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm">
                                <option value="Users">Utilisateurs</option>
                                <option value="Calendar">Calendrier</option>
                                <option value="RefreshCw">Rafraîchir (Sync)</option>
                                <option value="BarChart3">Graphique</option>
                                <option value="Gift">Cadeau</option>
                                <option value="ShieldCheck">Bouclier / Validation</option>
                            </select>
                        </div>
                    </>
                );
            case 'quicklink':
                return (
                    <>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">URL</label>
                            <input type="text" value={config.url || ''} onChange={e => updateConfig('url', e.target.value)} placeholder="/admin/leads/list" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Titre</label>
                            <input type="text" value={config.title || ''} onChange={e => updateConfig('title', e.target.value)} placeholder="Titre du lien" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description</label>
                            <input type="text" value={config.description || ''} onChange={e => updateConfig('description', e.target.value)} placeholder="Sous-titre..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Icône</label>
                            <select value={config.icon || 'Link2'} onChange={e => updateConfig('icon', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm">
                                {Object.keys(QUICKLINK_ICONS).map(iconName => (
                                    <option key={iconName} value={iconName}>{iconName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Style</label>
                            <select value={config.color || 'slate'} onChange={e => updateConfig('color', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm">
                                <option value="slate">Clair (Défaut)</option>
                                <option value="blue">Accent Bleu</option>
                                <option value="indigo">Accent Indigo</option>
                                <option value="amber">Accent Ambre</option>
                                <option value="emerald">Accent Emeraude</option>
                                <option value="rose">Accent Rose</option>
                                <option value="violet">Accent Violet</option>
                                <option value="dark">Foncé (Contraste)</option>
                            </select>
                        </div>
                    </>
                );
            case 'module-link':
                return (
                    <>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Module WASLA</label>
                            <select value={config.url || ''} onChange={e => updateConfig('url', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm">
                                <option value="" disabled>Sélectionnez un module...</option>
                                {MODULE_OPTIONS.map(mod => (
                                    <option key={mod.url} value={mod.url}>{mod.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Titre personnalisé (Optionnel)</label>
                            <input type="text" value={config.title || ''} onChange={e => updateConfig('title', e.target.value)} placeholder="Titre affiché" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description</label>
                            <input type="text" value={config.description || ''} onChange={e => updateConfig('description', e.target.value)} placeholder="Sous-titre..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Icône</label>
                            <select value={config.icon || 'LayoutGrid'} onChange={e => updateConfig('icon', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm">
                                {Object.keys(QUICKLINK_ICONS).map(iconName => (
                                    <option key={iconName} value={iconName}>{iconName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Style / Thème</label>
                            <select value={config.color || 'slate'} onChange={e => updateConfig('color', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm">
                                <option value="slate">Clair (Défaut)</option>
                                <option value="blue">Accent Bleu</option>
                                <option value="indigo">Accent Indigo</option>
                                <option value="amber">Accent Ambre</option>
                                <option value="emerald">Accent Emeraude</option>
                                <option value="rose">Accent Rose</option>
                                <option value="violet">Accent Violet</option>
                                <option value="dark">Foncé (Contraste)</option>
                            </select>
                        </div>
                    </>
                );
            case 'text':
                return (
                    <>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Titre</label>
                            <input type="text" value={config.title || ''} onChange={e => updateConfig('title', e.target.value)} placeholder="Titre du bloc text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Texte (Corps)</label>
                            <textarea rows={4} value={config.body || ''} onChange={e => updateConfig('body', e.target.value)} placeholder="Votre texte ici..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Variante Graphique</label>
                            <select value={config.variant || 'neutral'} onChange={e => updateConfig('variant', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm">
                                <option value="neutral">Neutre (Gris clair)</option>
                                <option value="info">Information (Bleu)</option>
                                <option value="warning">Attention (Ambre)</option>
                                <option value="success">Succès (Vert)</option>
                            </select>
                        </div>
                    </>
                );
            case 'heading':
                return (
                    <>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Titre de la Section</label>
                            <input type="text" value={config.title || ''} onChange={e => updateConfig('title', e.target.value)} placeholder="Ex: Métriques Principales" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-bold" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sous-titre (Optionnel)</label>
                            <input type="text" value={config.subtitle || ''} onChange={e => updateConfig('subtitle', e.target.value)} placeholder="Ex: Données en temps réel" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Style Visuel</label>
                            <select value={config.style || 'minimal'} onChange={e => updateConfig('style', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm">
                                <option value="minimal">Minimal (Ligne avec texte)</option>
                                <option value="block">Bloc Foncé (Plus de poids)</option>
                            </select>
                        </div>
                    </>
                );
            case 'recent-leads':
                return (
                    <>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Titre (Optionnel)</label>
                            <input type="text" value={config.title || ''} onChange={e => updateConfig('title', e.target.value)} placeholder="Derniers Prospects Capturés" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre de lignes affichées</label>
                            <select value={config.limit || 5} onChange={e => updateConfig('limit', parseInt(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm">
                                <option value={5}>5 lignes</option>
                                <option value={10}>10 lignes</option>
                                <option value={15}>15 lignes</option>
                            </select>
                        </div>
                    </>
                );
            case 'source-chart':
                return (
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Titre (Optionnel)</label>
                        <input type="text" value={config.title || ''} onChange={e => updateConfig('title', e.target.value)} placeholder="Répartition par source" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                    </div>
                );
            case 'spacer':
                return (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-sm font-medium text-slate-400 border-2 border-dashed border-slate-200">
                        Ce widget n'a aucune configuration. Il sert uniquement à créer de l'espace vide.
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Configuration Widget</h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto bg-white">
                    {renderFields()}
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-200 transition-colors">
                        Annuler
                    </button>
                    <button onClick={handleSave} className="px-6 py-3 rounded-xl font-bold text-sm bg-slate-900 text-white hover:bg-indigo-600 transition-colors">
                        Appliquer
                    </button>
                </div>
            </div>
        </div>
    );
}
