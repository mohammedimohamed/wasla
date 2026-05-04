"use client";

import { useState, useEffect } from "react";
import { 
    Globe, Layout, Smartphone, Plus, Trash2, 
    GripVertical, Palette, CheckCircle2, Loader2, 
    Search, MessageCircle, Linkedin, Facebook, 
    Instagram, Twitter, Mail, Phone, Link as LinkIcon,
    UserPlus, ExternalLink, QrCode, Copy, MapPin, Map as MapIcon
} from "lucide-react";
import * as Icons from "lucide-react";
import { DigitalProfileConfig } from "@/lib/schemas";
import { updateDigitalProfileAction, saveNfcTemplateAction, listNfcTemplatesAction } from "@/app/admin/users/actions";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface DigitalProfileBuilderProps {
    userId: string;
    initialSlug: string;
    initialConfig: string | null;
    initialIsActive: boolean;
    userName: string;
    userPhoto?: string | null;
    userJob?: string | null;
    brandingLogo?: string | null;
    isEnterpriseDefault?: boolean;
    onSaveSuccess?: (freshData: {
        profile_config: string | null;
        profile_slug: string;
        profile_is_active: number;
        updated_at: string;
    }) => void;
}

const COMMON_ICONS = [
    "MessageCircle", "Linkedin", "Facebook", "Instagram", "Twitter", 
    "Mail", "Phone", "Link", "UserPlus", "Globe", "Github", "Youtube"
];

export function DigitalProfileBuilder({ 
    userId, initialSlug, initialConfig, initialIsActive, 
    userName, userPhoto, userJob, brandingLogo, isEnterpriseDefault, onSaveSuccess
}: DigitalProfileBuilderProps) {
    
    const [slug, setSlug] = useState(initialSlug || "");
    const [isActive, setIsActive] = useState(initialIsActive);
    const [config, setConfig] = useState<DigitalProfileConfig>(() => {
        if (!initialConfig) return { theme: 'light', blocks: [] };
        try {
            const parsed = JSON.parse(initialConfig);
            if (parsed.blocks && Array.isArray(parsed.blocks)) {
                parsed.blocks = parsed.blocks.map((b: any) => ({
                    ...b,
                    id: b.id || (typeof window !== 'undefined' ? window.crypto.randomUUID() : 'temp-id')
                }));
            }
            return parsed;
        } catch {
            return { theme: 'light', blocks: [] };
        }
    });
    const [isSaving, setIsSaving] = useState(false);
    const [slugError, setSlugError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'settings' | 'blocks'>('settings');
    const [domain, setDomain] = useState<string>('');
    const [templates, setTemplates] = useState<any[]>([]);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateName, setTemplateName] = useState("");
    const [isDefaultTemplate, setIsDefaultTemplate] = useState(false);
    
    // 🔄 Sync state when props change (Safety for hydration)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setDomain(window.location.host);
        }
        setSlug(initialSlug || "");
        loadTemplates();
    }, [initialSlug]);

    const loadTemplates = async () => {
        const res = await listNfcTemplatesAction();
        if (res.success) setTemplates(res.templates);
    };

    const handleSaveTemplate = async () => {
        if (!templateName.trim()) {
            toast.error("Nom du modèle requis");
            return;
        }
        const res = await saveNfcTemplateAction(templateName, config, isDefaultTemplate);
        if (res.success) {
            toast.success("Modèle enregistré !");
            setShowTemplateModal(false);
            loadTemplates();
        } else {
            toast.error(res.error);
        }
    };

    const applyTemplate = (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (template) {
            try {
                const parsedConfig = JSON.parse(template.config);
                setConfig(parsedConfig);
                toast.success(`Modèle "${template.name}" appliqué`);
            } catch (e) {
                toast.error("Erreur lors de l'application du modèle");
            }
        }
    };

    const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload/file", {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                updateBlock(index, { fileUrl: data.url });
                toast.success("Fichier téléchargé !");
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast.error("Erreur d'upload : " + error.message);
        }
    };
    
    const onDragEnd = (result: any) => {
        if (!result.destination) return;
        
        const items = Array.from(config.blocks);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        
        setConfig({ ...config, blocks: items });
    };

    const handleSave = async () => {
        if (!slug.trim()) {
            toast.error("Le slug est obligatoire");
            return;
        }
        setIsSaving(true);
        setSlugError(null);
        try {
            const res = await updateDigitalProfileAction(userId, slug, isActive, config);
            if (res.error) {
                if (res.error.includes("déjà utilisé")) {
                    setSlugError(res.error);
                }
                if (res.details) {
                    console.error("Validation Errors:", res.details);
                    toast.error(`Validation échouée : vérifiez vos URLs et labels.`);
                } else {
                    toast.error(res.error);
                }
                return;
            }
            toast.success("Profil mis à jour !");
            // Pass the server-returned data so parent can update state synchronously
            if (onSaveSuccess) onSaveSuccess({
                profile_config: res.profile_config ?? null,
                profile_slug: res.profile_slug ?? slug,
                profile_is_active: res.profile_is_active ?? (isActive ? 1 : 0),
                updated_at: res.updatedAt ?? new Date().toISOString(),
            });
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const getIconForService = (service: string) => {
        const s = service.toLowerCase();
        if (s.includes('whatsapp')) return Icons.MessageCircle;
        if (s.includes('facebook')) return Icons.Facebook;
        if (s.includes('linkedin')) return Icons.Linkedin;
        if (s.includes('twitter') || s.includes(' x ')) return Icons.Twitter;
        if (s.includes('instagram')) return Icons.Instagram;
        if (s.includes('website') || s.includes('site')) return Icons.Globe;
        if (s.includes('youtube')) return Icons.Youtube;
        if (s.includes('github')) return Icons.Github;
        return Icons.Link;
    };

    const addBlock = (type: 'social_grid' | 'action_button' | 'free_text' | 'rich_text' | 'file' | 'media' | 'separator' | 'localization' | 'multiple_locations' | 'announcement_toaster') => {
        const newBlock: any = { id: window.crypto.randomUUID(), type, isVisible: true, visibleUntil: null };
        if (type === 'social_grid') newBlock.items = [];
        if (type === 'action_button') {
            newBlock.action = 'link';
            newBlock.label = 'Nouveau bouton';
            newBlock.value = '';
        }
        if (type === 'free_text') newBlock.content = 'Votre texte ici...';
        if (type === 'rich_text') newBlock.content = '### Titre\n**Gras**, *Italique*, et listes :\n- Élément 1\n- Élément 2';
        if (type === 'file') {
            newBlock.label = 'Télécharger le catalogue';
            newBlock.fileUrl = '';
            newBlock.buttonColor = '#059669'; // Default emerald
            newBlock.buttonShape = 'rounded';
            newBlock.iconType = 'document';
        }
        if (type === 'media') {
            newBlock.items = [];
        }
        if (type === 'separator') {
            newBlock.style = 'solid';
        }
        if (type === 'localization') {
            newBlock.provider = 'google_maps';
            newBlock.display_type = 'map';
            newBlock.location_data = '';
            newBlock.button_label = 'Itinéraire';
            newBlock.show_navigation_button = false;
        }
        if (type === 'multiple_locations') {
            newBlock.provider = 'google_maps';
            newBlock.layout = 'tabs';
            newBlock.items = [{ id: window.crypto.randomUUID(), label: 'Showroom Principal', location_data: '', city: 'Alger' }];
        }
        if (type === 'announcement_toaster') {
            newBlock.message = 'Nouvelle annonce importante !';
            newBlock.position = 'bottom';
            newBlock.style = 'info';
            newBlock.icon = 'Zap';
        }
        
        setConfig({ ...config, blocks: [...config.blocks, newBlock] });
    };

    const handleMediaUpload = async (blockIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload/file", {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                const block = config.blocks[blockIndex] as any;
                const newItems = [...(block.items || []), { 
                    url: data.url, 
                    type: file.type.startsWith('video') ? 'video' : 'image' 
                }];
                updateBlock(blockIndex, { items: newItems });
                toast.success("Média ajouté !");
            }
        } catch (error) {
            toast.error("Erreur d'upload");
        } finally {
            e.target.value = '';
        }
    };

    const removeBlock = (index: number) => {
        const newBlocks = [...config.blocks];
        newBlocks.splice(index, 1);
        setConfig({ ...config, blocks: newBlocks });
    };

    const updateBlock = (index: number, updates: any) => {
        const newBlocks = [...config.blocks];
        newBlocks[index] = { ...newBlocks[index], ...updates };
        setConfig({ ...config, blocks: newBlocks });
    };

    const generateSlug = () => {
        const newSlug = userName.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        setSlug(newSlug);
    };

    const copyLink = () => {
        if (!slug) return;
        const protocol = window.location.protocol;
        const url = `${protocol}//${domain}/p/${slug}`;
        navigator.clipboard.writeText(url);
        toast.success("Lien copié dans le presse-papiers !");
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* 🛠️ Editor Section */}
            <div className="lg:col-span-7 space-y-8">
                
                {/* Status & Slug */}
                <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 transition-colors">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">Titre du Profil (Poste)</label>
                             <input 
                                value={config.job_title || ''}
                                onChange={(e) => setConfig({ ...config, job_title: e.target.value })}
                                placeholder={userJob || "Expert Solutions"}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 px-4 py-3.5 rounded-2xl text-sm font-bold focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-500/10 outline-none transition-all dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                                <Globe className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Visibilité Publique</h4>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">{domain ? `${domain}/p/${slug || '...'}` : `/p/${slug || '...'}`}</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="sr-only peer" />
                            <div className="w-14 h-7 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">Lien du profil (Slug)</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    <Icons.Globe className="w-4 h-4" />
                                </div>
                                 <input 
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                    disabled={isEnterpriseDefault}
                                    placeholder="nom-prenom"
                                    className={`w-full bg-white dark:bg-slate-950 border ${slugError ? 'border-red-300 ring-4 ring-red-50' : 'border-slate-200 dark:border-white/10'} pl-11 pr-4 py-3.5 rounded-2xl text-sm font-bold focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-500/10 outline-none transition-all dark:text-white ${isEnterpriseDefault ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900' : ''}`}
                                />
                                {isEnterpriseDefault && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500">
                                        <Icons.ShieldCheck className="w-4 h-4" />
                                    </div>
                                )}
                            </div>
                            {isEnterpriseDefault && <p className="text-[9px] font-black text-indigo-500 uppercase mt-2 ml-2 tracking-widest">Le lien Corporate est verrouillé.</p>}
                            {slugError && <p className="text-red-500 text-[10px] font-bold mt-1 ml-2">{slugError}</p>}
                        </div>
                         <button onClick={generateSlug} disabled={isEnterpriseDefault} className="px-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50">
                            Générer
                        </button>
                        <button onClick={copyLink} title="Copier le lien" className="px-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-500/20 rounded-2xl transition-all flex items-center justify-center">
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                    {slugError && <p className="text-red-500 text-[10px] font-bold mt-2 pl-2 uppercase tracking-tight">{slugError}</p>}
                </div>

                 {/* Templates Manager */}
                <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 transition-colors">
                    <div className="flex items-center justify-between mb-6">
                         <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                            <Icons.Copy className="w-4 h-4 text-indigo-500" /> Modèles NFC
                        </h4>
                        <button 
                            onClick={() => setShowTemplateModal(true)}
                            className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
                        >
                            <Icons.Save className="w-3 h-3" /> Enregistrer comme modèle
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <select 
                            onChange={(e) => applyTemplate(e.target.value)}
                            className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 px-4 py-3 rounded-2xl text-xs font-black outline-none appearance-none cursor-pointer dark:text-white"
                            defaultValue=""
                        >
                            <option value="" disabled className="dark:text-slate-500">Charger un modèle...</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id} className="dark:text-white">{t.name} {t.is_default ? '(Défaut)' : ''}</option>
                            ))}
                        </select>
                    </div>
                </div>

                 {/* Theme Selector */}
                <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 transition-colors">
                     <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <Palette className="w-4 h-4 text-indigo-500" /> Thème Visuel
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setConfig({...config, theme: 'light'})}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${config.theme === 'light' ? 'border-indigo-500 bg-white shadow-lg' : 'border-slate-200 bg-transparent opacity-60'}`}
                        >
                            <div className="w-full h-12 bg-slate-100 rounded-lg" />
                            <span className="text-[10px] font-black uppercase">Clair</span>
                        </button>
                        <button 
                            onClick={() => setConfig({...config, theme: 'dark'})}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${config.theme === 'dark' ? 'border-indigo-500 bg-slate-900 shadow-lg text-white' : 'border-slate-200 bg-transparent opacity-60'}`}
                        >
                            <div className="w-full h-12 bg-slate-800 rounded-lg" />
                            <span className="text-[10px] font-black uppercase">Sombre</span>
                        </button>
                    </div>
                </div>

                {/* Blocks Editor */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                         <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                            <Layout className="w-4 h-4 text-indigo-500" /> Structure de la page
                        </h4>
                        <div className="flex gap-2">
                            {/* Deleted small button to move to big button below */}
                        </div>
                    </div>

                    {/* 🚀 PROMINENT SOCIAL GRID TRIGGER */}
                     <button 
                        onClick={() => addBlock('social_grid')}
                        className="w-full group relative overflow-hidden bg-white dark:bg-white/5 border-2 border-indigo-100 dark:border-white/10 hover:border-indigo-500 dark:hover:border-indigo-400 p-6 rounded-[32px] transition-all duration-300 shadow-sm hover:shadow-xl flex items-center justify-between"
                    >
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-indigo-100">
                                <MessageCircle className="w-7 h-7" />
                            </div>
                             <div className="text-left">
                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Configurer ma grille de liens sociaux</p>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">LinkedIn, Twitter, Facebook...</p>
                            </div>
                        </div>
                        <Plus className="w-6 h-6 text-slate-300 group-hover:text-indigo-600 group-hover:rotate-90 transition-all" />
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="profile-blocks">
                            {(provided) => (
                                <div 
                                    {...provided.droppableProps} 
                    ref={provided.innerRef} 
                                    className="space-y-4"
                                >
                                    {config.blocks.map((block, idx) => (
                                        <Draggable key={block.id} draggableId={block.id} index={idx}>
                                            {(provided) => (
                                                <div 
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`bg-white dark:bg-slate-900/40 border-2 rounded-[28px] p-6 shadow-sm relative group transition-all duration-300 ${
                                                        block.isGlobal 
                                                            ? 'border-amber-400/50 dark:border-amber-500/30 bg-amber-50/10 dark:bg-amber-900/5' 
                                                            : 'border-slate-200 dark:border-white/5'
                                                    } ${block.isVisible === false ? 'opacity-40 grayscale blur-[0.5px] scale-[0.99]' : ''}`}
                                                >
                                                    {block.isGlobal && (
                                                        <div className="absolute -top-3 left-8 bg-amber-500 text-white text-[8px] font-black px-3 py-1 rounded-full shadow-lg border border-amber-400 uppercase tracking-widest z-10">
                                                            🌍 Bloc Global Corporate
                                                        </div>
                                                    )}
                                                    <div className="absolute -top-2 -right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                        <button 
                                                            onClick={() => updateBlock(idx, { isVisible: block.isVisible === false })}
                                                            title={block.isVisible === false ? "Afficher le bloc" : "Masquer le bloc"}
                                                            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all ${block.isVisible === false ? 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600'}`}
                                                        >
                                                            {block.isVisible === false ? <Icons.EyeOff className="w-4 h-4" /> : <Icons.Eye className="w-4 h-4" />}
                                                        </button>
                                                        <button 
                                                            onClick={() => removeBlock(idx)}
                                                            title="Supprimer le bloc"
                                                            className="w-8 h-8 bg-white dark:bg-slate-800 text-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-500 hover:text-white transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    
                                                    <div className="flex items-start gap-4">
                                                        <div 
                                                            {...provided.dragHandleProps}
                                                            className="mt-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-indigo-600 transition-colors"
                                                        >
                                                            <GripVertical className="w-5 h-5" />
                                                        </div>
                                                        
                                                        <div className="flex-1 space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${block.isVisible === false ? 'bg-slate-200 text-slate-500' : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'}`}>
                                                                        {block.type.replace('_', ' ')}
                                                                    </div>
                                                                    {block.visibleUntil && (
                                                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full border border-amber-500/20">
                                                                            <Icons.Clock className="w-3 h-3" />
                                                                            <span className="text-[8px] font-black uppercase tracking-tighter">Planifié</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-col items-end gap-2">
                                                                    <div className="flex flex-col items-end gap-1">
                                                                        <div className="flex items-center gap-1.5 group/info">
                                                                            <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Afficher jusqu'au :</span>
                                                                            <div className="relative">
                                                                                <Icons.Info className="w-3 h-3 text-slate-300 dark:text-slate-600 cursor-help" />
                                                                                <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-950 text-white text-[9px] font-black rounded-xl opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none shadow-2xl z-30 text-center uppercase tracking-tighter border border-white/10">
                                                                                    Le bloc sera automatiquement masqué du profil public après cette date.
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-950/50 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-500/20 transition-all">
                                                                            <Icons.Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                                                            <input 
                                                                                type="datetime-local" 
                                                                                value={block.visibleUntil ? new Date(block.visibleUntil).toISOString().slice(0, 16) : ''}
                                                                                onChange={e => updateBlock(idx, { visibleUntil: e.target.value ? new Date(e.target.value).toISOString() : null })}
                                                                                className="bg-transparent text-[10px] font-black text-slate-700 dark:text-slate-300 outline-none focus:text-indigo-600 transition-colors"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {isEnterpriseDefault && (
                                                                        <label className="flex items-center gap-3 cursor-pointer group/global p-2 bg-amber-500/10 dark:bg-amber-500/5 rounded-xl border border-amber-500/20 hover:border-amber-500/40 transition-all">
                                                                            <div className="relative">
                                                                                <input 
                                                                                    type="checkbox" 
                                                                                    checked={block.isGlobal} 
                                                                                    onChange={e => updateBlock(idx, { isGlobal: e.target.checked })}
                                                                                    className="sr-only peer" 
                                                                                />
                                                                                <div className="w-8 h-4 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:bg-amber-500 transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 shadow-inner"></div>
                                                                            </div>
                                                                            <span className="text-[8px] font-black uppercase text-amber-600 dark:text-amber-500 tracking-widest">Rendre Global</span>
                                                                        </label>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                        {block.type === 'social_grid' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Grille Réseaux Sociaux</span>
                                                    <button 
                                                        onClick={() => {
                                                            const items = [...block.items, { label: 'Facebook', url: 'https://', icon: 'Facebook' }];
                                                            updateBlock(idx, { items });
                                                        }}
                                                        className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 flex items-center gap-1"
                                                    >
                                                        <Plus className="w-3 h-3" /> Ajouter
                                                    </button>
                                                </div>
                                                <div className="space-y-2">
                                                    {block.items.map((item, i) => (
                                                        <div key={i} className="grid grid-cols-[40px_1fr_1fr_28px] gap-2 items-center">
                                                            {/* Col 1 — Icône */}
                                                            <select 
                                                                value={item.icon} 
                                                                onChange={e => {
                                                                    const items = [...block.items];
                                                                    items[i].icon = e.target.value;
                                                                    updateBlock(idx, { items });
                                                                }}
                                                                className="h-9 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-center text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-[10px]"
                                                                style={{ colorScheme: 'dark' }}
                                                            >
                                                                {COMMON_ICONS.map(ic => <option key={ic} value={ic} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{ic}</option>)}
                                                            </select>
                                                            {/* Col 2 — Label affiché */}
                                                            <input 
                                                                value={(item as any).label ?? (item as any).platform ?? ''} 
                                                                onChange={e => {
                                                                    const items = [...block.items];
                                                                    items[i].label = e.target.value;
                                                                    updateBlock(idx, { items });
                                                                }}
                                                                placeholder="Nom à afficher"
                                                                className="h-9 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 px-2 py-1 rounded-xl text-xs font-bold outline-none focus:border-indigo-300 dark:focus:border-indigo-500 dark:text-white"
                                                            />
                                                            {/* Col 3 — URL */}
                                                            <input 
                                                                value={item.url} 
                                                                onChange={e => {
                                                                    const items = [...block.items];
                                                                    items[i].url = e.target.value;
                                                                    updateBlock(idx, { items });
                                                                }}
                                                                placeholder="https://..."
                                                                className="h-9 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 px-2 py-1 rounded-xl text-xs font-bold outline-none focus:border-indigo-300 dark:focus:border-indigo-500 dark:text-white"
                                                            />
                                                            {/* Col 4 — Supprimer */}
                                                            <button 
                                                                onClick={() => {
                                                                    const items = [...block.items];
                                                                    items.splice(i, 1);
                                                                    updateBlock(idx, { items });
                                                                }}
                                                                className="text-red-300 hover:text-red-500 flex items-center justify-center"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {block.type === 'action_button' && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="col-span-2">
                                                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Label du bouton</label>
                                                     <input 
                                                        value={block.label} 
                                                        onChange={e => updateBlock(idx, { label: e.target.value })}
                                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 px-4 py-2.5 rounded-xl text-sm font-bold outline-none focus:border-indigo-300 dark:focus:border-indigo-500 dark:text-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Type d'action</label>
                                                     <select 
                                                        value={block.action} 
                                                        onChange={e => updateBlock(idx, { action: e.target.value })}
                                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 px-4 py-2.5 rounded-xl text-xs font-black outline-none appearance-none dark:text-white"
                                                    >
                                                        <option value="link">Lien externe</option>
                                                        <option value="call">Appel (tel:)</option>
                                                        <option value="save_vcard">Enregistrer Contact</option>
                                                        <option value="email">Email</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Valeur (URL, Numéro...)</label>
                                                     <input 
                                                        value={block.value} 
                                                        onChange={e => updateBlock(idx, { value: e.target.value })}
                                                        disabled={block.action === 'save_vcard'}
                                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 px-4 py-2.5 rounded-xl text-sm font-bold outline-none focus:border-indigo-300 dark:focus:border-indigo-500 dark:text-white disabled:opacity-50"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {block.type === 'free_text' && (
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Contenu texte (Simple)</label>
                                                 <textarea 
                                                    value={block.content} 
                                                    onChange={e => updateBlock(idx, { content: e.target.value })}
                                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 px-4 py-3 rounded-xl text-sm font-medium outline-none focus:border-indigo-300 dark:focus:border-indigo-500 dark:text-white h-24 no-scrollbar"
                                                />
                                            </div>
                                        )}

                                        {block.type === 'rich_text' && (
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-[9px] font-black uppercase text-slate-400 block">Texte Enrichi (Markdown)</label>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => updateBlock(idx, { content: block.content + ' **Gras**' })} className="text-[10px] font-black p-1 hover:text-indigo-600">B</button>
                                                        <button onClick={() => updateBlock(idx, { content: block.content + ' *Italique*' })} className="text-[10px] italic p-1 hover:text-indigo-600">I</button>
                                                        <button onClick={() => updateBlock(idx, { content: block.content + '\n- ' })} className="text-[10px] p-1 hover:text-indigo-600">List</button>
                                                    </div>
                                                </div>
                                                 <textarea 
                                                    value={block.content} 
                                                    onChange={e => updateBlock(idx, { content: e.target.value })}
                                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 px-4 py-3 rounded-xl text-sm font-medium outline-none focus:border-indigo-300 dark:focus:border-indigo-500 dark:text-white h-32 no-scrollbar font-mono"
                                                    placeholder="Utilisez le Markdown pour formater..."
                                                />
                                            </div>
                                        )}

                                        {block.type === 'file' && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="col-span-2">
                                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Label du bouton</label>
                                                        <input 
                                                            value={block.label} 
                                                            onChange={e => updateBlock(idx, { label: e.target.value })}
                                                            className="w-full bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl text-sm font-bold outline-none focus:border-indigo-300"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Couleur du bouton</label>
                                                        <div className="flex gap-2">
                                                            <input 
                                                                type="color" 
                                                                value={block.buttonColor || '#059669'} 
                                                                onChange={e => updateBlock(idx, { buttonColor: e.target.value })}
                                                                className="w-10 h-10 rounded-lg cursor-pointer overflow-hidden border-none p-0"
                                                            />
                                                            <input 
                                                                value={block.buttonColor || '#059669'} 
                                                                onChange={e => updateBlock(idx, { buttonColor: e.target.value })}
                                                                className="flex-1 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl text-xs font-mono font-bold"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Forme du bouton</label>
                                                        <div className="flex gap-1">
                                                            {['square', 'rounded', 'pill'].map(shape => (
                                                                <button 
                                                                    key={shape}
                                                                    onClick={() => updateBlock(idx, { buttonShape: shape })}
                                                                    className={`flex-1 py-2 text-[8px] font-black uppercase border rounded-lg transition-all ${block.buttonShape === shape ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-400'}`}
                                                                >
                                                                    {shape === 'square' ? 'Carré' : shape === 'rounded' ? 'Arrondi' : 'Pill'}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Icône</label>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {['document', 'catalogue', 'image', 'video'].map(type => {
                                                                const Icon = type === 'document' ? Icons.FileText : type === 'catalogue' ? Icons.BookOpen : type === 'image' ? Icons.Image : Icons.PlayCircle;
                                                                return (
                                                                    <button 
                                                                        key={type}
                                                                        onClick={() => updateBlock(idx, { iconType: type })}
                                                                        className={`py-3 flex flex-col items-center gap-1 border rounded-xl transition-all ${block.iconType === type ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white border-slate-100 text-slate-400'}`}
                                                                    >
                                                                        <Icon className="w-4 h-4" />
                                                                        <span className="text-[7px] font-black uppercase">{type}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="relative group/upload">
                                                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center group-hover/upload:border-indigo-300 transition-all">
                                                        {block.fileUrl ? (
                                                            <div className="flex items-center justify-between">
                                                                 <span className="text-[10px] font-bold text-emerald-600 truncate flex-1 pr-4">{block.fileUrl}</span>
                                                                 <button onClick={() => updateBlock(idx, { fileUrl: '' })} className="text-red-500 hover:text-red-700">
                                                                     <Trash2 className="w-4 h-4" />
                                                                 </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-2">
                                                                <Icons.FileUp className="w-6 h-6 text-slate-300" />
                                                                <span className="text-[9px] font-black uppercase text-slate-400">Cliquez pour uploader un fichier (PDF, Catologue...)</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {!block.fileUrl && (
                                                        <input 
                                                            type="file" 
                                                            onChange={(e) => handleFileUpload(idx, e)}
                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {block.type === 'media' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Slideshow / Médias</span>
                                                    <label className="cursor-pointer text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 flex items-center gap-1">
                                                        <Plus className="w-3 h-3" /> Ajouter Média
                                                        <input type="file" className="hidden" accept="image/*,video/*" onChange={(e) => handleMediaUpload(idx, e)} />
                                                    </label>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {block.items.map((item: any, i: number) => (
                                                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden group/item">
                                                            {item.type === 'video' && item.url && item.url !== 'null' ? (
                                                                <video src={item.url} className="w-full h-full object-cover" muted />
                                                            ) : item.type === 'image' && item.url && item.url !== 'null' ? (
                                                                <img src={item.url} className="w-full h-full object-cover" alt="" />
                                                            ) : (
                                                                <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                                                    <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                                                                </div>
                                                            )}
                                                            <button 
                                                                onClick={() => {
                                                                    const newItems = [...block.items];
                                                                    newItems.splice(i, 1);
                                                                    updateBlock(idx, { items: newItems });
                                                                }}
                                                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {block.type === 'separator' && (
                                            <div className="space-y-4">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Séparateur / Espace</span>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {['solid', 'dotted', 'spacer'].map((style) => (
                                                        <button 
                                                            key={style}
                                                            onClick={() => updateBlock(idx, { style })}
                                                            className={`py-2 px-4 rounded-xl text-[10px] font-black uppercase border transition-all ${block.style === style ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}
                                                        >
                                                            {style === 'solid' ? 'Ligne' : style === 'dotted' ? 'Pointillés' : 'Espace'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {block.type === 'localization' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Localisation / Itinéraire</span>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="col-span-2">
                                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Adresse ou Coordonnées (Lat,Lon)</label>
                                                        <input 
                                                            value={block.location_data} 
                                                            onChange={e => updateBlock(idx, { location_data: e.target.value })}
                                                            placeholder="Ex: Paris, France ou 48.8566,2.3522"
                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 px-4 py-2.5 rounded-xl text-sm font-bold outline-none focus:border-indigo-300 dark:focus:border-indigo-500 dark:text-white"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Type d'affichage</label>
                                                        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl">
                                                            <button 
                                                                onClick={() => updateBlock(idx, { display_type: 'map' })}
                                                                className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg transition-all ${block.display_type === 'map' ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
                                                            >
                                                                Carte
                                                            </button>
                                                            <button 
                                                                onClick={() => updateBlock(idx, { display_type: 'button' })}
                                                                className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg transition-all ${block.display_type === 'button' ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
                                                            >
                                                                Bouton
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Fournisseur</label>
                                                        <select 
                                                            value={block.provider} 
                                                            onChange={e => updateBlock(idx, { provider: e.target.value })}
                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 px-4 py-2.5 rounded-xl text-xs font-black outline-none appearance-none dark:text-white"
                                                        >
                                                            <option value="google_maps">Google Maps</option>
                                                            <option value="openstreetmap">OpenStreetMap</option>
                                                            <option value="bing_maps">Bing Maps</option>
                                                        </select>
                                                    </div>

                                                    {block.display_type === 'button' && (
                                                        <div className="col-span-2">
                                                            <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Texte du bouton</label>
                                                            <input 
                                                                value={block.button_label} 
                                                                onChange={e => updateBlock(idx, { button_label: e.target.value })}
                                                                placeholder="Itinéraire"
                                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 px-4 py-2.5 rounded-xl text-sm font-bold outline-none focus:border-indigo-300 dark:focus:border-indigo-500 dark:text-white"
                                                            />
                                                        </div>
                                                    )}

                                                    {block.display_type === 'map' && (
                                                        <div className="col-span-2 mt-2">
                                                            <label className="flex items-center gap-3 cursor-pointer group p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-500/20 transition-all">
                                                                <div className="relative">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={block.show_navigation_button} 
                                                                        onChange={e => updateBlock(idx, { show_navigation_button: e.target.checked })}
                                                                        className="sr-only peer" 
                                                                    />
                                                                    <div className="w-10 h-5 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:bg-indigo-600 transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5 shadow-inner"></div>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-wider">Bouton d'itinéraire</span>
                                                                    <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase">Ajouter un raccourci de navigation</span>
                                                                </div>
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {block.type === 'announcement_toaster' && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="col-span-2">
                                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Message de l'annonce</label>
                                                        <input 
                                                            value={block.message} 
                                                            onChange={e => updateBlock(idx, { message: e.target.value })}
                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 px-4 py-2.5 rounded-xl text-sm font-bold outline-none focus:border-indigo-300 dark:focus:border-indigo-500 dark:text-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Position</label>
                                                        <select 
                                                            value={block.position} 
                                                            onChange={e => updateBlock(idx, { position: e.target.value })}
                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 px-4 py-2.5 rounded-xl text-xs font-black outline-none appearance-none dark:text-white"
                                                        >
                                                            <option value="top">Haut de l'écran</option>
                                                            <option value="bottom">Bas de l'écran</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Style</label>
                                                        <select 
                                                            value={block.style} 
                                                            onChange={e => updateBlock(idx, { style: e.target.value })}
                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 px-4 py-2.5 rounded-xl text-xs font-black outline-none appearance-none dark:text-white"
                                                        >
                                                            <option value="info">Information (Indigo)</option>
                                                            <option value="warning">Attention (Ambre)</option>
                                                            <option value="urgent">Urgent (Rouge)</option>
                                                            <option value="event">Batimatec Event (Glass)</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">URL de l'image (Vignette)</label>
                                                        <input 
                                                            value={block.image_url || ''} 
                                                            onChange={e => updateBlock(idx, { image_url: e.target.value })}
                                                            placeholder="https://..."
                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 px-4 py-2.5 rounded-xl text-sm font-bold outline-none focus:border-indigo-300 dark:focus:border-indigo-500 dark:text-white"
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Icône (Fallback)</label>
                                                        <select 
                                                            value={block.icon} 
                                                            onChange={e => updateBlock(idx, { icon: e.target.value })}
                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 px-4 py-2.5 rounded-xl text-xs font-black outline-none appearance-none dark:text-white"
                                                        >
                                                            {COMMON_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {block.type === 'multiple_locations' && (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Fournisseur Global</label>
                                                        <select 
                                                            value={block.provider} 
                                                            onChange={e => updateBlock(idx, { provider: e.target.value })}
                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 px-4 py-2.5 rounded-xl text-[10px] font-black outline-none appearance-none dark:text-white"
                                                        >
                                                            <option value="google_maps">Google Maps</option>
                                                            <option value="openstreetmap">OpenStreetMap</option>
                                                            <option value="bing_maps">Bing Maps</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Style d'affichage</label>
                                                        <select 
                                                            value={block.layout} 
                                                            onChange={e => updateBlock(idx, { layout: e.target.value })}
                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 px-4 py-2.5 rounded-xl text-[10px] font-black outline-none appearance-none dark:text-white"
                                                        >
                                                            <option value="tabs">Onglets + Carte</option>
                                                            <option value="list">Liste de boutons</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Liste des sites</label>
                                                        <button 
                                                            onClick={() => {
                                                                const items = [...(block.items || []), { id: window.crypto.randomUUID(), label: 'Nouveau Site', location_data: '', city: '' }];
                                                                updateBlock(idx, { items });
                                                            }}
                                                            className="text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" /> Ajouter un lieu
                                                        </button>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {(block.items || []).map((item: any, i: number) => (
                                                            <div key={item.id} className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 p-4 rounded-2xl relative group/item">
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div className="col-span-2">
                                                                        <label className="text-[8px] font-black uppercase text-slate-400 mb-1 block">Nom du lieu (ex: Agence Oran)</label>
                                                                        <input 
                                                                            value={item.label} 
                                                                            onChange={e => {
                                                                                const items = [...block.items];
                                                                                items[i].label = e.target.value;
                                                                                updateBlock(idx, { items });
                                                                            }}
                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 px-3 py-2 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 dark:text-white"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[8px] font-black uppercase text-slate-400 mb-1 block">Ville</label>
                                                                        <input 
                                                                            value={item.city || ''} 
                                                                            onChange={e => {
                                                                                const items = [...block.items];
                                                                                items[i].city = e.target.value;
                                                                                updateBlock(idx, { items });
                                                                            }}
                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 px-3 py-2 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 dark:text-white"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[8px] font-black uppercase text-slate-400 mb-1 block">Adresse ou Coords</label>
                                                                        <input 
                                                                            value={item.location_data} 
                                                                            onChange={e => {
                                                                                const items = [...block.items];
                                                                                items[i].location_data = e.target.value;
                                                                                updateBlock(idx, { items });
                                                                            }}
                                                                            placeholder="Lat, Lng ou Adresse..."
                                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 px-3 py-2 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 dark:text-white"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <button 
                                                                    onClick={() => {
                                                                        const items = [...block.items];
                                                                        items.splice(i, 1);
                                                                        updateBlock(idx, { items });
                                                                    }}
                                                                    className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/item:opacity-100"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                    </Draggable>
                ))}
                {provided.placeholder}
            </div>
        )}
    </Droppable>
</DragDropContext>

                     <div className="grid grid-cols-2 gap-3 mt-6">
                        <button onClick={() => addBlock('action_button')} className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-2xl transition-all font-black text-[10px] uppercase">
                            <Plus className="w-4 h-4" /> Bouton Action
                        </button>
                        <button onClick={() => addBlock('social_grid')} className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-2xl transition-all font-black text-[10px] uppercase">
                            <Plus className="w-4 h-4" /> Grille Sociale
                        </button>
                        <button onClick={() => addBlock('free_text')} className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-2xl transition-all font-black text-[10px] uppercase">
                            <Plus className="w-4 h-4" /> Texte Simple
                        </button>
                        <button onClick={() => addBlock('rich_text')} className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-2xl transition-all font-black text-[10px] uppercase">
                            <Plus className="w-4 h-4" /> Texte Enrichi
                        </button>
                        <button onClick={() => addBlock('media')} className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-2xl transition-all font-black text-[10px] uppercase">
                            <Plus className="w-4 h-4" /> Média / Slideshow
                        </button>
                        <button onClick={() => addBlock('separator')} className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-2xl transition-all font-black text-[10px] uppercase">
                            <Plus className="w-4 h-4" /> Séparateur
                        </button>
                        <button onClick={() => addBlock('file')} className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-2xl transition-all font-black text-[10px] uppercase">
                            <Plus className="w-4 h-4" /> Bloc Fichier
                        </button>
                        <button onClick={() => addBlock('localization')} className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-2xl transition-all font-black text-[10px] uppercase">
                            <Plus className="w-4 h-4" /> Localisation
                        </button>
                        <button onClick={() => addBlock('multiple_locations')} className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-2xl transition-all font-black text-[10px] uppercase">
                            <Plus className="w-4 h-4" /> Multi-Sites
                        </button>
                        {isEnterpriseDefault && (
                            <button onClick={() => addBlock('announcement_toaster')} className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-amber-200 dark:border-amber-500/20 text-amber-500/70 hover:border-amber-500 hover:text-amber-500 rounded-2xl transition-all font-black text-[10px] uppercase bg-amber-50/10">
                                <Icons.Zap className="w-4 h-4" /> Global Toaster
                            </button>
                        )}
                    </div>
                </div>

                 <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-5 rounded-[28px] font-black uppercase tracking-widest text-sm shadow-xl hover:bg-slate-800 dark:hover:bg-indigo-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    Enregistrer les modifications
                </button>
            </div>

            {/* 📱 Preview Section */}
            <div className="lg:col-span-5 sticky top-10 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-6">
                    <Smartphone className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Preview</span>
                </div>

                <div className={`w-[320px] h-[640px] rounded-[50px] border-[8px] border-slate-900 dark:border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col transition-colors duration-500 ${config.theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
                    <div className="flex-1 overflow-y-auto no-scrollbar p-6">
                        {/* Mock Header */}
                        <div className="flex justify-center mb-8">
                            {brandingLogo && brandingLogo !== 'null' ? (
                                <img src={brandingLogo} alt="Logo" className="h-8 object-contain" />
                            ) : (
                                <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse flex items-center justify-center text-[8px] font-black text-slate-300 uppercase tracking-widest">Logo</div>
                            )}
                        </div>

                        {/* Mock Profile */}
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className={`w-24 h-24 rounded-[32px] overflow-hidden mb-3 border-4 ${config.theme === 'dark' ? 'border-slate-800' : 'border-white'} shadow-xl`}>
                                {userPhoto && userPhoto !== 'null' ? (
                                    <img src={userPhoto} alt={userName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white text-3xl font-black">
                                        {userName?.charAt(0) || 'U'}
                                    </div>
                                )}
                            </div>
                            <h5 className="text-xl font-black tracking-tight">{userName}</h5>
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${config.theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                {config.job_title || userJob || 'Expert Solutions'}
                            </p>
                        </div>

                        {/* Mock Blocks */}
                        <div className="space-y-3">
                            {config.blocks.map((block, idx) => {
                                if (block.type === 'social_grid') {
                                    return (
                                        <div key={idx} className="grid grid-cols-3 gap-3 py-1">
                                            {block.items.map((item, i) => {
                                                const IconComponent = (Icons as any)[item.icon] || Icons.Link;
                                                return (
                                                    <div key={i} className={`flex flex-col items-center justify-center p-3 rounded-2xl shadow-sm ${config.theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
                                                        <IconComponent className="w-4 h-4 mb-1 text-indigo-500" />
                                                        <span className="text-[7px] font-black uppercase tracking-wider opacity-40 truncate w-full text-center">{(item as any).label || (item as any).platform || item.icon}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                }
                                if (block.type === 'action_button') {
                                    return (
                                        <div key={idx} className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-center shadow-md flex items-center justify-center gap-2 ${
                                            block.action === 'save_vcard' 
                                            ? 'bg-indigo-600 text-white' 
                                            : config.theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'
                                        }`}>
                                            {block.action === 'call' && <Icons.Phone className="w-3 h-3" />}
                                            {block.action === 'save_vcard' && <Icons.UserPlus className="w-3 h-3" />}
                                            {block.label}
                                        </div>
                                    );
                                }
                                if (block.type === 'free_text') {
                                    return (
                                        <div key={idx} className={`p-4 rounded-2xl text-[9px] leading-relaxed ${config.theme === 'dark' ? 'bg-slate-900/50' : 'bg-white/50 border border-slate-100'}`}>
                                            {block.content}
                                        </div>
                                    );
                                }
                                if (block.type === 'rich_text') {
                                    return (
                                        <div key={idx} className={`p-4 rounded-2xl text-[9px] leading-relaxed ${config.theme === 'dark' ? 'bg-slate-900/50' : 'bg-white/50 border border-slate-100'}`}>
                                            {/* Minimal preview: replace newlines with br and simulate bold */}
                                            <div dangerouslySetInnerHTML={{ 
                                                __html: block.content
                                                    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                                                    .replace(/\*(.*?)\*/g, '<i>$1</i>')
                                                    .replace(/\n- (.*)/g, '<br/>• $1')
                                                    .replace(/\n/g, '<br/>') 
                                            }} />
                                        </div>
                                    );
                                }
                                if (block.type === 'file') {
                                    const shapeClass = block.buttonShape === 'pill' ? 'rounded-full' : block.buttonShape === 'square' ? 'rounded-none' : 'rounded-xl';
                                    const Icon = block.iconType === 'catalogue' ? Icons.BookOpen : block.iconType === 'image' ? Icons.Image : block.iconType === 'video' ? Icons.PlayCircle : Icons.Download;
                                    return (
                                        <div key={idx} 
                                            className={`w-full py-3 ${shapeClass} font-black text-[10px] uppercase tracking-widest text-center shadow-md flex items-center justify-center gap-2 text-white`}
                                            style={{ backgroundColor: block.buttonColor || '#059669' }}
                                        >
                                            <Icon className="w-3 h-3" />
                                            {block.label}
                                        </div>
                                    );
                                }
                                if (block.type === 'media') {
                                    if (!block.items || block.items.length === 0) return null;
                                    return (
                                        <div key={idx} className="rounded-2xl overflow-hidden shadow-md">
                                            {block.items.length === 1 ? (
                                                block.items[0].type === 'video' ? (
                                                    <video src={block.items[0].url} className="w-full aspect-video object-cover" muted />
                                                ) : (
                                                    <img src={block.items[0].url} className="w-full aspect-video object-cover" alt="" />
                                                )
                                            ) : (
                                                <div className="aspect-video bg-slate-100 flex items-center justify-center relative">
                                                    {block.items[0].url && block.items[0].url !== 'null' ? (
                                                        <img src={block.items[0].url} className="w-full h-full object-cover opacity-50" alt="" />
                                                    ) : (
                                                        <div className="w-full h-full bg-slate-200 animate-pulse" />
                                                    )}
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                        <span className="bg-white/90 text-slate-900 px-3 py-1 rounded-full text-[8px] font-black uppercase">Slideshow ({block.items.length})</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                                if (block.type === 'separator') {
                                    return (
                                        <div key={idx} className="py-2">
                                            {block.style === 'solid' && <div className={`h-px w-full ${config.theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />}
                                            {block.style === 'dotted' && <div className={`h-px w-full border-t border-dashed ${config.theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`} />}
                                            {block.style === 'spacer' && <div className="h-4" />}
                                        </div>
                                    );
                                }
                                if (block.type === 'localization') {
                                    const { provider, display_type, location_data, button_label } = block;
                                    
                                    // 🛠️ Smart Parsing for Preview
                                    let lat: number | null = null;
                                    let lng: number | null = null;
                                    let isCoords = false;
                                    const gMatch = location_data.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                                    const qMatch = location_data.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
                                    const rMatch = location_data.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
                                    if (gMatch) { [lat, lng] = [parseFloat(gMatch[1]), parseFloat(gMatch[2])]; isCoords = true; }
                                    else if (qMatch) { [lat, lng] = [parseFloat(qMatch[1]), parseFloat(qMatch[2])]; isCoords = true; }
                                    else if (rMatch) { [lat, lng] = [parseFloat(rMatch[1]), parseFloat(rMatch[2])]; isCoords = true; }

                                    const isOSMWithoutCoords = provider === 'openstreetmap' && !isCoords;
                                    const effectiveDisplayType = (isOSMWithoutCoords && display_type === 'map') ? 'button' : display_type;

                                    let iframeSrc = "";
                                    if (effectiveDisplayType === 'map' && location_data) {
                                        const encodedLocation = encodeURIComponent(location_data);
                                        if (provider === 'google_maps') {
                                            iframeSrc = `https://maps.google.com/maps?q=${encodedLocation}&output=embed`;
                                        } else if (provider === 'openstreetmap' && isCoords) {
                                            const offset = 0.005;
                                            const bbox = `${lng! - offset}%2C${lat! - offset}%2C${lng! + offset}%2C${lat! + offset}`;
                                            iframeSrc = `https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=${lat}%2C${lng}&bbox=${bbox}`;
                                        } else if (provider === 'bing_maps') {
                                            if (isCoords) {
                                                iframeSrc = `https://www.bing.com/maps/embed?cp=${lat}~${lng}&lvl=15&typ=d&sty=r&src=SHELL&pp=${lat}~${lng}+++++`;
                                            } else {
                                                iframeSrc = `https://www.bing.com/maps/embed?where1=${encodedLocation}&lvl=15&typ=d&sty=r&src=SHELL`;
                                            }
                                        }
                                    }

                                    return (
                                        <div key={idx} className="py-1 space-y-2">
                                            {effectiveDisplayType === 'map' && iframeSrc ? (
                                                <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-md border border-slate-100 dark:border-white/5">
                                                    <iframe width="100%" height="100%" frameBorder="0" scrolling="no" src={iframeSrc} allowFullScreen />
                                                </div>
                                            ) : (
                                                <div className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-center shadow-md flex items-center justify-center gap-2 ${config.theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}>
                                                    <MapPin className="w-3 h-3 text-indigo-500" />
                                                    {button_label || 'Itinéraire'}
                                                </div>
                                            )}
                                            {effectiveDisplayType === 'map' && block.show_navigation_button && (
                                                <div className={`w-full py-2.5 rounded-xl font-black text-[8px] uppercase tracking-widest text-center shadow-sm flex items-center justify-center gap-2 ${config.theme === 'dark' ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>
                                                    <Icons.Navigation className="w-3 h-3" />
                                                    Lancer l'itinéraire
                                                </div>
                                            )}
                                            {isOSMWithoutCoords && display_type === 'map' && (
                                                <p className="text-[7px] text-amber-500 font-bold uppercase mt-1 text-center">⚠️ OSM nécessite des coordonnées pour la carte.</p>
                                            )}
                                        </div>
                                    );
                                }

                                if (block.type === 'multiple_locations') {
                                    return (
                                        <div key={idx} className="space-y-3 py-2">
                                            {block.title && <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{block.title}</h3>}
                                            
                                            {block.layout === 'tabs' && (
                                                <div className="w-full aspect-video rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center gap-2 mb-2">
                                                    <Icons.Map className="w-6 h-6 text-indigo-500 opacity-50" />
                                                    <span className="text-[7px] font-black uppercase text-slate-400 tracking-tighter italic">Aperçu Multi-Sites ({block.items.length} points)</span>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-2">
                                                {(block.items || []).map((item: any, i: number) => (
                                                    <div key={item.id} className={`p-3 rounded-2xl border flex flex-col gap-1 transition-all ${i === 0 ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5'}`}>
                                                        <span className={`text-[9px] font-black uppercase tracking-tight leading-none ${i === 0 ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{item.label}</span>
                                                        {item.city && <span className={`text-[7px] font-bold uppercase ${i === 0 ? 'text-indigo-100' : 'text-slate-400'}`}>{item.city}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })}
                        </div>
                    </div>

                    {/* Mock Sticky Footer */}
                    <div className={`p-4 flex gap-2 border-t ${config.theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-100'}`}>
                        <div className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-black text-[8px] uppercase text-center shadow-lg flex items-center justify-center gap-1">
                            <Phone className="w-3 h-3" /> Appeler
                        </div>
                        <div className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black text-[8px] uppercase text-center shadow-lg flex items-center justify-center gap-1">
                            <UserPlus className="w-3 h-3" /> Enregistrer
                        </div>
                    </div>
                </div>
            </div>

            {/* ── MODAL: SAVE TEMPLATE ────────────────────────────────────────────── */}
             {showTemplateModal && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-md shadow-2xl p-8 relative border dark:border-white/5 transition-colors">
                        <button onClick={() => setShowTemplateModal(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center">
                            <Icons.XCircle className="w-7 h-7" />
                        </button>

                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                <Icons.Save className="w-5 h-5" />
                            </div>
                             <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">Nouveau Modèle</h2>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">Automation Engine</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">Nom du modèle</label>
                                 <input 
                                    value={templateName} 
                                    onChange={e => setTemplateName(e.target.value)}
                                    placeholder="Ex: Template Commercial 2026"
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 px-4 py-3.5 rounded-2xl text-sm font-bold focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-500/10 outline-none transition-all dark:text-white"
                                />
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer group p-2">
                                <div className="relative">
                                    <input 
                                        type="checkbox" 
                                        checked={isDefaultTemplate}
                                         onChange={e => setIsDefaultTemplate(e.target.checked)}
                                        className="sr-only peer" 
                                    />
                                    <div className="w-12 h-6 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:bg-indigo-600 transition-all after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-6 shadow-inner"></div>
                                </div>
                                 <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-wider">Modèle par défaut</span>
                                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Appliqué aux nouveaux agents</span>
                                </div>
                            </label>

                             <button 
                                onClick={handleSaveTemplate}
                                className="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white rounded-[24px] py-5 text-sm font-black uppercase tracking-widest transition-all shadow-xl dark:shadow-none"
                            >
                                Enregistrer le modèle
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
