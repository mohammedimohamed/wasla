'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, Settings2, Loader2, Link as LinkIcon, Type, Phone, Mail, AlignLeft } from 'lucide-react';
import { CustomField } from '../EditorClient';
import toast from 'react-hot-toast';

interface Props {
    fields: CustomField[];
    onChange: (fields: CustomField[]) => void;
}

export default function TabFormBuilder({ fields, onChange }: Props) {
    const [isAdding, setIsAdding] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newField, setNewField] = useState<Partial<CustomField>>({ field_type: 'text', is_required: false });

    // Icons for field types
    const TypeIcon = ({ type, cls }: { type: string, cls: string }) => {
        if (type === 'url') return <LinkIcon className={cls} />;
        if (type === 'phone') return <Phone className={cls} />;
        if (type === 'email') return <Mail className={cls} />;
        if (type === 'textarea') return <AlignLeft className={cls} />;
        return <Type className={cls} />;
    };

    const handleCreate = async () => {
        if (!newField.label || !newField.field_key) return toast.error('Veuillez remplir le label et la clé technique.');
        
        setSaving(true);
        try {
            const res = await fetch('/api/admin/custom-fields', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    label: newField.label,
                    field_key: newField.field_key,
                    field_type: newField.field_type,
                    placeholder: newField.placeholder || null,
                    is_required: newField.is_required || false,
                    sort_order: fields.length
                })
            });
            if (!res.ok) throw new Error('Action failed');
            const data = await res.json();
            
            onChange([...fields, { ...newField, id: data.id, sort_order: fields.length } as CustomField]);
            setIsAdding(false);
            setNewField({ field_type: 'text', is_required: false });
            toast.success('Champ créé avec succès !');
        } catch {
            toast.error('Erreur lors de la création.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Attention : Cela supprimera aussi les données saisies par les agents pour ce champ. Confirmer ?')) return;
        
        try {
            await fetch(`/api/admin/custom-fields/${id}`, { method: 'DELETE' });
            onChange(fields.filter(f => f.id !== id));
            toast.success('Champ supprimé.');
        } catch {
            toast.error('Erreur réseau.');
        }
    };

    return (
        <div className="space-y-8 pb-10 max-w-2xl">
            <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <Settings2 className="text-blue-500 w-6 h-6" />
                    Builder de Profil Agent
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Créez des champs qui apparaîtront dans le profil personnel de chaque agent. Idéal pour les matricules, liens de prise de rendez-vous, ou départements.
                </p>
            </div>

            {/* List of active fields */}
            <div className="space-y-3">
                {fields.length === 0 && !isAdding && (
                    <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                        <p className="text-slate-500 font-bold text-sm">Aucun champ personnalisé défini.</p>
                    </div>
                )}
                
                {fields.map((field) => (
                    <div key={field.id} className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm group">
                        <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
                            <GripVertical className="w-5 h-5" />
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                            <TypeIcon type={field.field_type} cls="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                {field.label}
                                {field.is_required && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black uppercase">Requis</span>}
                            </h4>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">Key: {field.field_key}</p>
                        </div>
                        <button onClick={() => handleDelete(field.id)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Add New Field Form */}
            {isAdding ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-4">Nouveau Champ</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Nom (Label UI)</label>
                            <input 
                                type="text"
                                value={newField.label || ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    setNewField({ ...newField, label: val, field_key: val.toLowerCase().replace(/[^a-z0-9]/g, '_') });
                                }}
                                className="w-full rounded-xl border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="ex: Lien Calendly"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Clé API interne</label>
                            <input 
                                type="text"
                                value={newField.field_key || ''}
                                onChange={e => setNewField({ ...newField, field_key: e.target.value })}
                                className="w-full rounded-xl border border-slate-300 p-2 text-sm bg-slate-100 font-mono text-slate-500 outline-none"
                                placeholder="lien_calendly"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Type de donnée</label>
                            <select 
                                value={newField.field_type || 'text'}
                                onChange={e => setNewField({ ...newField, field_type: e.target.value })}
                                className="w-full rounded-xl border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            >
                                <option value="text">Texte Court</option>
                                <option value="url">Lien Web (URL)</option>
                                <option value="phone">Téléphone</option>
                                <option value="email">Email</option>
                                <option value="textarea">Zone de Texte Libre</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 mt-6">
                            <input 
                                type="checkbox" 
                                id="req"
                                checked={newField.is_required || false}
                                onChange={e => setNewField({ ...newField, is_required: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300"
                            />
                            <label htmlFor="req" className="text-sm font-bold text-slate-700 cursor-pointer">Champ Obligatoire</label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200">
                        <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800">
                            Annuler
                        </button>
                        <button onClick={handleCreate} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Créer
                        </button>
                    </div>
                </div>
            ) : (
                <button 
                    onClick={() => setIsAdding(true)}
                    className="w-full py-4 border-2 border-dashed border-blue-200 text-blue-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                    <Plus className="w-5 h-5" /> Ajouter un Champ Personnalisé
                </button>
            )}
        </div>
    );
}
