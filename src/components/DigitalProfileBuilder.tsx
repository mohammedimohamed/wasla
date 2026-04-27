"use client";

import { useState, useEffect } from "react";
import { 
    Globe, Layout, Smartphone, Plus, Trash2, 
    GripVertical, Palette, CheckCircle2, Loader2, 
    Search, MessageCircle, Linkedin, Facebook, 
    Instagram, Twitter, Mail, Phone, Link as LinkIcon,
    UserPlus, ExternalLink, QrCode
} from "lucide-react";
import * as Icons from "lucide-react";
import { DigitalProfileConfig } from "@/lib/schemas";
import { updateDigitalProfileAction } from "@/app/admin/users/actions";
import toast from "react-hot-toast";

interface DigitalProfileBuilderProps {
    userId: string;
    initialSlug: string;
    initialConfig: string | null;
    initialIsActive: boolean;
    userName: string;
    userPhoto?: string | null;
    userJob?: string | null;
    brandingLogo?: string | null;
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
    userName, userPhoto, userJob, brandingLogo, onSaveSuccess
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
    
    // 🔄 Sync state when props change (Safety for hydration)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setDomain(window.location.host);
        }
        setSlug(initialSlug || "");
    }, [initialSlug]);

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

    const addBlock = (type: 'social_grid' | 'action_button' | 'free_text') => {
        const newBlock: any = { id: window.crypto.randomUUID(), type };
        if (type === 'social_grid') newBlock.items = [];
        if (type === 'action_button') {
            newBlock.action = 'link';
            newBlock.label = 'Nouveau bouton';
            newBlock.value = '';
        }
        if (type === 'free_text') newBlock.content = 'Votre texte ici...';
        
        setConfig({ ...config, blocks: [...config.blocks, newBlock] });
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

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* 🛠️ Editor Section */}
            <div className="lg:col-span-7 space-y-8">
                
                {/* Status & Slug */}
                <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                                <Globe className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">Visibilité Publique</h4>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">{domain ? `${domain}/p/${slug || '...'}` : `/p/${slug || '...'}`}</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="sr-only peer" />
                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-2xl focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50 transition-all overflow-hidden">
                            <span className="pl-4 pr-0.5 text-slate-400 text-xs font-bold whitespace-nowrap select-none">
                                {domain ? `${domain}/p/` : '/p/'}
                            </span>
                            <input 
                                value={slug} 
                                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                className="w-full bg-transparent pr-4 py-3.5 text-sm font-black outline-none"
                                placeholder="identifiant-unique"
                            />
                        </div>
                        <button onClick={generateSlug} className="px-4 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                            Générer
                        </button>
                    </div>
                    {slugError && <p className="text-red-500 text-[10px] font-bold mt-2 pl-2 uppercase tracking-tight">{slugError}</p>}
                </div>

                {/* Theme Selector */}
                <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
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
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                            <Layout className="w-4 h-4 text-indigo-500" /> Structure de la page
                        </h4>
                        <div className="flex gap-2">
                            <button onClick={() => addBlock('social_grid')} className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all" title="Ajouter une grille de réseaux">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {config.blocks.map((block, idx) => (
                            <div key={idx} className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm relative group">
                                <button 
                                    onClick={() => removeBlock(idx)}
                                    className="absolute -top-2 -right-2 w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-500 hover:text-white"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 cursor-grab active:cursor-grabbing text-slate-300">
                                        <GripVertical className="w-5 h-5" />
                                    </div>
                                    
                                    <div className="flex-1 space-y-4">
                                        {block.type === 'social_grid' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Grille Réseaux Sociaux</span>
                                                    <button 
                                                        onClick={() => {
                                                            const items = [...block.items, { platform: 'LinkedIn', url: 'https://', icon: 'Linkedin' }];
                                                            updateBlock(idx, { items });
                                                        }}
                                                        className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 flex items-center gap-1"
                                                    >
                                                        <Plus className="w-3 h-3" /> Ajouter
                                                    </button>
                                                </div>
                                                <div className="space-y-3">
                                                    {block.items.map((item, i) => (
                                                        <div key={i} className="flex gap-2 items-center">
                                                            <select 
                                                                value={item.icon} 
                                                                onChange={e => {
                                                                    const items = [...block.items];
                                                                    items[i].icon = e.target.value;
                                                                    updateBlock(idx, { items });
                                                                }}
                                                                className="w-12 h-10 bg-slate-50 border border-slate-100 rounded-xl text-center flex items-center justify-center text-slate-600"
                                                            >
                                                                {COMMON_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                                                            </select>
                                                            <input 
                                                                value={item.url} 
                                                                onChange={e => {
                                                                    const items = [...block.items];
                                                                    items[i].url = e.target.value;
                                                                    updateBlock(idx, { items });
                                                                }}
                                                                placeholder="https://..."
                                                                className="flex-1 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl text-xs font-bold outline-none focus:border-indigo-300"
                                                            />
                                                            <button 
                                                                onClick={() => {
                                                                    const items = [...block.items];
                                                                    items.splice(i, 1);
                                                                    updateBlock(idx, { items });
                                                                }}
                                                                className="text-red-300 hover:text-red-500"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
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
                                                        className="w-full bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl text-sm font-bold outline-none focus:border-indigo-300"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Type d'action</label>
                                                    <select 
                                                        value={block.action} 
                                                        onChange={e => updateBlock(idx, { action: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl text-xs font-black outline-none appearance-none"
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
                                                        className="w-full bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl text-sm font-bold outline-none focus:border-indigo-300 disabled:opacity-50"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {block.type === 'free_text' && (
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Contenu texte</label>
                                                <textarea 
                                                    value={block.content} 
                                                    onChange={e => updateBlock(idx, { content: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-sm font-medium outline-none focus:border-indigo-300 h-24 no-scrollbar"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                        <button onClick={() => addBlock('action_button')} className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 rounded-2xl transition-all font-black text-[10px] uppercase">
                            <Plus className="w-4 h-4" /> Bouton Action
                        </button>
                        <button onClick={() => addBlock('free_text')} className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 rounded-2xl transition-all font-black text-[10px] uppercase">
                            <Plus className="w-4 h-4" /> Bloc Texte
                        </button>
                    </div>
                </div>

                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="w-full bg-slate-900 text-white py-5 rounded-[28px] font-black uppercase tracking-widest text-sm shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
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

                <div className={`w-[320px] h-[640px] rounded-[50px] border-[8px] border-slate-900 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col transition-colors duration-500 ${config.theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
                    <div className="flex-1 overflow-y-auto no-scrollbar p-6">
                        {/* Mock Header */}
                        <div className="flex justify-center mb-8">
                            {brandingLogo ? (
                                <img src={brandingLogo} alt="Logo" className="h-8 object-contain" />
                            ) : (
                                <div className="h-8 w-20 bg-slate-200 rounded animate-pulse" />
                            )}
                        </div>

                        {/* Mock Profile */}
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className={`w-24 h-24 rounded-[32px] overflow-hidden mb-3 border-4 ${config.theme === 'dark' ? 'border-slate-800' : 'border-white'} shadow-xl`}>
                                {userPhoto ? (
                                    <img src={userPhoto} alt={userName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white text-3xl font-black">
                                        {userName.charAt(0)}
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
                                                        <span className="text-[7px] font-black uppercase tracking-wider opacity-40 truncate w-full text-center">{item.platform}</span>
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
        </div>
    );
}
