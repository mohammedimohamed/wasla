'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Plus, Trash2, GripVertical, Save, Loader2, ChevronDown,
    ChevronRight, Type, Hash, Mail, Phone, AlignLeft, List, CheckSquare, Tag,
    Eye, EyeOff, Star, RefreshCw, LayoutTemplate, AlertCircle, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { FormConfig, FormPage, FormSection, FormField, FormFieldOption, FormFieldType } from '@/src/hooks/useFormConfig';

// ─────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────────────────

const FIELD_TYPE_ICONS: Record<FormFieldType, typeof Type> = {
    text: Type, tel: Phone, email: Mail, textarea: AlignLeft,
    select: List, multiselect: CheckSquare, 'chip-group': Tag,
};

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
    text: 'Texte', tel: 'Téléphone', email: 'Email', textarea: 'Zone de texte',
    select: 'Sélection unique', multiselect: 'Multi-sélection', 'chip-group': 'Chips',
};

const ALL_FIELD_TYPES: FormFieldType[] = ['text', 'tel', 'email', 'textarea', 'select', 'multiselect', 'chip-group'];

function uid() {
    return Math.random().toString(36).slice(2, 9);
}

function newField(): FormField {
    return { name: `field_${uid()}`, label: 'Nouveau champ', type: 'text', required: false, colSpan: 1, showInTable: false };
}

function newSection(): FormSection {
    return { id: `sec_${uid()}`, title: 'Nouvelle section', description: '', fields: [newField()] };
}

function newPage(): FormPage {
    return { id: `page_${uid()}`, title: 'Nouvelle page', sections: [newSection()] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Field Editor Panel
// ─────────────────────────────────────────────────────────────────────────────

function FieldEditor({
    field,
    onChange,
    onDelete,
}: {
    field: FormField;
    onChange: (updated: FormField) => void;
    onDelete: () => void;
}) {
    const [optionInput, setOptionInput] = useState('');
    const hasOptions = ['select', 'multiselect', 'chip-group'].includes(field.type);
    const IconComp = FIELD_TYPE_ICONS[field.type] || Type;

    const set = (key: keyof FormField, value: any) => onChange({ ...field, [key]: value });

    const addOption = () => {
        if (!optionInput.trim()) return;
        const opt: FormFieldOption = { value: optionInput.trim().toLowerCase().replace(/\s+/g, '_'), label: optionInput.trim() };
        set('options', [...(field.options || []), opt]);
        setOptionInput('');
    };

    return (
        <div className="space-y-4 p-6 bg-white dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm transition-colors duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600/10 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <IconComp className="w-4 h-4" />
                    </div>
                    <span className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wide">{field.label}</span>
                </div>
                <button onClick={onDelete} className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Label */}
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Label</label>
                    <input value={field.label} onChange={e => set('label', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-all text-slate-900 dark:text-white" />
                </div>

                {/* Metadata Key */}
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Clé Metadata</label>
                    <input value={field.name} onChange={e => set('name', e.target.value.replace(/\s+/g, '_').toLowerCase())}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-all text-indigo-600 dark:text-indigo-400" />
                </div>

                {/* Placeholder */}
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Placeholder</label>
                    <input value={field.placeholder || ''} onChange={e => set('placeholder', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-all text-slate-900 dark:text-white" />
                </div>

                {/* Field Type */}
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Type de champ</label>
                    <select value={field.type} onChange={e => set('type', e.target.value as FormFieldType)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-all text-slate-900 dark:text-white">
                        {ALL_FIELD_TYPES.map(t => (
                            <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
                        ))}
                    </select>
                </div>
                
                {/* Weight/Score */}
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Poids (Score)</label>
                    <input type="number" min="0" max="100" value={field.weight || 0} onChange={e => set('weight', Number(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-all text-emerald-600 dark:text-emerald-400 font-bold" />
                </div>
            </div>

            {/* Toggles row */}
            <div className="flex flex-wrap gap-3 pt-1">
                {([ 
                    { key: 'required', icon: Star, label: 'Requis' },
                    { key: 'showInTable', icon: Eye, label: 'Colonne tableau' },
                    { key: 'isSensitive', icon: AlertCircle, label: '🔒 Champ Sensible' },
                ] as const).map(({ key, icon: Icon, label }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => set(key, !field[key])}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all ${field[key] ? 'bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500 text-white' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'}`}
                    >
                        <Icon className="w-3 h-3" />
                        {label}
                    </button>
                ))}

                {/* ColSpan */}
                <select value={field.colSpan ?? 1} onChange={e => set('colSpan', Number(e.target.value) as 1 | 2)}
                    className="text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 text-slate-600 dark:text-slate-300 transition-all">
                    <option value={1}>Demi-largeur</option>
                    <option value={2}>Pleine largeur</option>
                </select>
            </div>

            {field.isSensitive && (
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest mt-2 border border-amber-200 dark:border-amber-500/20 transition-colors">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    Le chiffrement empêche la recherche sur ce champ.
                </div>
            )}

            {/* Options editor — only for select/multiselect/chip-group */}
            {hasOptions && (
                <div className="space-y-2 mt-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Options</label>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                        {(field.options || []).map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2 border dark:border-white/5">
                                <span className="flex-1 text-xs font-bold text-slate-700 dark:text-slate-300">{opt.label}</span>
                                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{opt.value}</span>
                                <button type="button" onClick={() => set('options', (field.options || []).filter((_, i) => i !== idx))}
                                    className="text-slate-400 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            value={optionInput}
                            onChange={e => setOptionInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                            placeholder="Ajouter une option..."
                            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-all text-slate-900 dark:text-white"
                        />
                        <button type="button" onClick={addOption}
                            className="px-3 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl text-xs font-black hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-all shadow-md shadow-indigo-600/20 dark:shadow-none">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FORM BUILDER PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function FormBuilderPage() {
    const router = useRouter();
    const [config, setConfig] = useState<FormConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activePageIdx, setActivePageIdx] = useState(0);
    const [activePath, setActivePath] = useState<{ sectionIdx: number; fieldIdx: number } | null>(null);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const load = async () => {
            try {
                const authRes = await fetch('/api/auth');
                if (!authRes.ok) { router.push('/admin/login'); return; }
                const authData = await authRes.json();
                if (authData.user.role !== 'ADMINISTRATOR') { router.push('/admin/login'); return; }

                const res = await fetch('/api/settings/form');
                if (res.ok) {
                    const data = await res.json();
                    setConfig(data.config);
                    // Expand all sections by default
                    const expanded: Record<string, boolean> = {};
                    data.config.pages?.forEach((p: FormPage) =>
                        p.sections.forEach(s => { expanded[s.id] = true; })
                    );
                    setExpandedSections(expanded);
                }
            } catch (e) {
                toast.error('Erreur de chargement');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [router]);

    const save = async () => {
        if (!config) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/settings/form', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config }),
            });
            if (res.ok) {
                const data = await res.json();
                setConfig(data.config);
                toast.success(`✅ Formulaire sauvegardé (v${data.version})`);
            } else {
                const err = await res.json();
                toast.error(err.error || 'Sauvegarde échouée');
            }
        } catch (e) {
            toast.error('Erreur de sauvegarde');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Mutator helpers ─────────────────────────────────────────────────────

    const updatePage = useCallback((pageIdx: number, updater: (p: FormPage) => FormPage) => {
        setConfig(cfg => {
            if (!cfg) return cfg;
            const pages = [...cfg.pages];
            pages[pageIdx] = updater(pages[pageIdx]);
            return { ...cfg, pages };
        });
    }, []);

    const updateSection = (pageIdx: number, secIdx: number, updater: (s: FormSection) => FormSection) => {
        updatePage(pageIdx, page => {
            const sections = [...page.sections];
            sections[secIdx] = updater(sections[secIdx]);
            return { ...page, sections };
        });
    };

    const updateField = (pageIdx: number, secIdx: number, fieldIdx: number, updated: FormField) => {
        updateSection(pageIdx, secIdx, section => {
            const fields = [...section.fields];
            fields[fieldIdx] = updated;
            return { ...section, fields };
        });
    };

    const deleteField = (pageIdx: number, secIdx: number, fieldIdx: number) => {
        updateSection(pageIdx, secIdx, section => {
            const fields = section.fields.filter((_, i) => i !== fieldIdx);
            return { ...section, fields };
        });
        setActivePath(null);
    };

    const addField = (pageIdx: number, secIdx: number) => {
        const field = newField();
        updateSection(pageIdx, secIdx, section => ({ ...section, fields: [...section.fields, field] }));
        const sectionLen = config?.pages[pageIdx].sections[secIdx].fields.length ?? 0;
        setActivePath({ sectionIdx: secIdx, fieldIdx: sectionLen });
    };

    const addSection = (pageIdx: number) => {
        const section = newSection();
        updatePage(pageIdx, page => ({ ...page, sections: [...page.sections, section] }));
        setExpandedSections(e => ({ ...e, [section.id]: true }));
    };

    const deleteSection = (pageIdx: number, secIdx: number) => {
        updatePage(pageIdx, page => {
            const sections = page.sections.filter((_, i) => i !== secIdx);
            return { ...page, sections };
        });
        setActivePath(null);
    };

    const addPage = () => {
        const page = newPage();
        setConfig(cfg => {
            if (!cfg) return cfg;
            return { ...cfg, pages: [...cfg.pages, page] };
        });
        setActivePageIdx((config?.pages.length ?? 0));
        setExpandedSections(e => ({ ...e, [page.sections[0].id]: true }));
    };

    const deletePage = (pageIdx: number) => {
        if ((config?.pages.length ?? 0) <= 1) { toast.error('Il faut au moins une page.'); return; }
        setConfig(cfg => {
            if (!cfg) return cfg;
            return { ...cfg, pages: cfg.pages.filter((_, i) => i !== pageIdx) };
        });
        setActivePageIdx(Math.max(0, pageIdx - 1));
    };

    if (isLoading) return (
        <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
        </div>
    );

    if (!config) return (
        <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
            <p className="text-slate-400 font-bold">Configuration introuvable.</p>
        </div>
    );

    const activePage = config.pages[activePageIdx];

    const selectedField = activePath !== null
        ? activePage?.sections[activePath.sectionIdx]?.fields[activePath.fieldIdx]
        : null;

    return (
        <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">

            {/* ── TOP BAR ──────────────────────────────────────────────────── */}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </button>
                    <div>
                        <h1 className="font-black text-slate-900 uppercase tracking-tight text-sm flex items-center gap-2">
                            <LayoutTemplate className="w-5 h-5 text-primary" />
                            Form Builder — {config.name}
                        </h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            v{config._version ?? config.version} · {config.pages.length} page(s) · {config.pages.reduce((acc, p) => acc + p.sections.reduce((a, s) => a + s.fields.length, 0), 0)} champs
                        </p>
                    </div>
                </div>
                <button
                    onClick={save}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-60 shadow-md shadow-primary/20"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Sauvegarder
                </button>
            </header>

            <div className="flex-1 flex overflow-hidden">

                {/* ── LEFT SIDEBAR: Structure Tree ─────────────────────────── */}
                <aside className="w-72 shrink-0 bg-white border-r overflow-y-auto flex flex-col">
                    {/* Page Tabs */}
                    <div className="p-4 border-b space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pages du formulaire</p>
                        {config.pages.map((page, pIdx) => (
                            <div key={page.id} className="flex items-center gap-1">
                                <button
                                    onClick={() => { setActivePageIdx(pIdx); setActivePath(null); }}
                                    className={`flex-1 text-left px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${pIdx === activePageIdx ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <Hash className="w-3 h-3 shrink-0" />
                                    {page.title}
                                </button>
                                {config.pages.length > 1 && (
                                    <button onClick={() => deletePage(pIdx)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button onClick={addPage} className="w-full border-2 border-dashed border-slate-200 text-slate-400 hover:border-primary hover:text-primary rounded-xl py-2 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1">
                            <Plus className="w-3 h-3" /> Ajouter une page
                        </button>
                    </div>

                    {/* Section & Field Tree for active page */}
                    <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sections & Champs</p>
                        {activePage?.sections.map((section, sIdx) => (
                            <div key={section.id} className="space-y-1">
                                {/* Section header */}
                                <div className="flex items-center gap-1 group">
                                    <button
                                        onClick={() => setExpandedSections(e => ({ ...e, [section.id]: !e[section.id] }))}
                                        className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-50 text-xs font-black text-slate-700 uppercase tracking-wider transition-all"
                                    >
                                        {expandedSections[section.id]
                                            ? <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                                            : <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
                                        <span className="truncate">{section.title}</span>
                                    </button>
                                    <button onClick={() => deleteSection(activePageIdx, sIdx)}
                                        className="p-1 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>

                                {/* Fields */}
                                {expandedSections[section.id] && (
                                    <div className="ml-4 space-y-0.5">
                                        {section.fields.map((f, fIdx) => {
                                            const Icon = FIELD_TYPE_ICONS[f.type] || Type;
                                            const isActive = activePath?.sectionIdx === sIdx && activePath.fieldIdx === fIdx;
                                            return (
                                                <button
                                                    key={f.name}
                                                    onClick={() => setActivePath({ sectionIdx: sIdx, fieldIdx: fIdx })}
                                                    className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                                                >
                                                    <Icon className="w-3 h-3 shrink-0" />
                                                    <span className="truncate">{f.label}</span>
                                                    {f.required && <Star className="w-2.5 h-2.5 text-amber-400 shrink-0 ml-auto" />}
                                                    {f.showInTable && <Eye className="w-2.5 h-2.5 text-blue-400 shrink-0" />}
                                                </button>
                                            );
                                        })}
                                        <button
                                            onClick={() => addField(activePageIdx, sIdx)}
                                            className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-400 hover:text-primary rounded-lg hover:bg-primary/5 transition-all"
                                        >
                                            <Plus className="w-3 h-3" /> Ajouter un champ
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}

                        <button onClick={() => addSection(activePageIdx)}
                            className="w-full border-2 border-dashed border-slate-200 text-slate-400 hover:border-primary hover:text-primary rounded-xl py-2 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 mt-2">
                            <Plus className="w-3 h-3" /> Ajouter une section
                        </button>
                    </div>
                </aside>

                {/* ── CENTER: Page/Section settings ────────────────────────── */}
                <main className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Page title editor */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-black text-slate-900 text-sm uppercase tracking-widest">Paramètres de la page</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre de la page</label>
                                <input
                                    value={activePage?.title || ''}
                                    onChange={e => updatePage(activePageIdx, p => ({ ...p, title: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-primary transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* All sections expanded */}
                    {activePage?.sections.map((section, sIdx) => (
                        <div key={section.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre de section</label>
                                        <input
                                            value={section.title}
                                            onChange={e => updateSection(activePageIdx, sIdx, s => ({ ...s, title: e.target.value }))}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-primary transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                                        <input
                                            value={section.description || ''}
                                            onChange={e => updateSection(activePageIdx, sIdx, s => ({ ...s, description: e.target.value }))}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 outline-none focus:border-primary transition-all"
                                        />
                                    </div>
                                </div>
                                <button onClick={() => deleteSection(activePageIdx, sIdx)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all mt-5">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Fields */}
                            <div className="space-y-3 mt-2">
                                {section.fields.map((field, fIdx) => (
                                    <FieldEditor
                                        key={field.name + fIdx}
                                        field={field}
                                        onChange={(updated) => updateField(activePageIdx, sIdx, fIdx, updated)}
                                        onDelete={() => deleteField(activePageIdx, sIdx, fIdx)}
                                    />
                                ))}
                                <button onClick={() => addField(activePageIdx, sIdx)}
                                    className="w-full border-2 border-dashed border-slate-200 text-slate-400 hover:border-primary hover:text-primary rounded-2xl py-3 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2">
                                    <Plus className="w-4 h-4" /> Ajouter un champ à "{section.title}"
                                </button>
                            </div>
                        </div>
                    ))}

                    <button onClick={() => addSection(activePageIdx)}
                        className="w-full border-2 border-dashed border-slate-200 text-slate-400 hover:border-primary hover:text-primary rounded-3xl py-4 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" /> Ajouter une section
                    </button>
                </main>
            </div>
        </div>
    );
}
