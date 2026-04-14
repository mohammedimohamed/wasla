'use client';

import { useState } from 'react';
import { Save, UploadCloud, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
    profile: any;
    onChange: (updated: any) => void;
}

export default function TabCompany({ profile, onChange }: Props) {
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/company-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile)
            });
            if (!res.ok) throw new Error('Erreur de sauvegarde');
            toast.success('Profil entreprise sauvegardé !');
        } catch {
            toast.error('Erreur lors de la sauvegarde.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-12 pb-10">
            {/* ── SECTION 1: IDENTITÉ VISUELLE ── */}
            <section className="space-y-6">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Identité Visuelle</h2>
                    <p className="text-sm text-slate-500">Ces éléments pilotent le design de la landing page Agent.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                    {/* Logo Upload */}
                    <label className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative overflow-hidden group">
                        <input 
                            type="file" 
                            accept="image/png, image/jpeg" 
                            className="hidden" 
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                
                                const formData = new FormData();
                                formData.append('file', file);
                                
                                const loadingToast = toast.loading('Upload en cours...');
                                try {
                                    const res = await fetch('/api/admin/company-logo', { method: 'POST', body: formData });
                                    if (!res.ok) throw new Error();
                                    const data = await res.json();
                                    onChange({ company_logo_url: data.url });
                                    toast.success('Logo mis à jour', { id: loadingToast });
                                } catch {
                                    toast.error('Erreur lors de l\'upload', { id: loadingToast });
                                }
                            }}
                        />
                        {profile.company_logo_url ? (
                            <>
                                <img src={profile.company_logo_url} alt="Logo" className="w-full h-full absolute inset-0 object-contain p-4 bg-white" />
                                <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white">
                                    <UploadCloud className="w-8 h-8" />
                                </div>
                            </>
                        ) : (
                            <>
                                <UploadCloud className="w-8 h-8 text-slate-400 mb-3 group-hover:scale-110 transition-transform" />
                                <p className="text-sm font-bold text-slate-600">Logo de l'entreprise</p>
                                <p className="text-xs text-slate-400 mt-1">Cliquez ou glissez une image (PNG/JPG)</p>
                            </>
                        )}
                    </label>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Couleur Principale (Accent)</label>
                            <div className="flex gap-3">
                                <input 
                                    type="color" 
                                    value={profile.accent_color || '#4f46e5'}
                                    onChange={e => onChange({ accent_color: e.target.value })}
                                    className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                                />
                                <input 
                                    type="text" 
                                    value={profile.accent_color || '#4f46e5'}
                                    onChange={e => onChange({ accent_color: e.target.value })}
                                    className="flex-1 rounded-xl border border-slate-300 p-3 font-mono text-sm"
                                    placeholder="#4f46e5"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nom de l'entreprise</label>
                            <input 
                                type="text"
                                value={profile.company_name || ''}
                                onChange={e => onChange({ company_name: e.target.value })}
                                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Wasla Solutions"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <hr className="border-slate-100" />

            {/* ── SECTION 2: COORDONNÉES ── */}
            <section className="space-y-6">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Coordonnées Officielles</h2>
                    <p className="text-sm text-slate-500">Ces contacts seront listés sous le profil de chaque Agent.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input label="Site Web" value={profile.company_website} onChange={v => onChange({ company_website: v })} placeholder="www.wasla.dz" />
                    <Input label="Email Central" value={profile.company_email} onChange={v => onChange({ company_email: v })} placeholder="contact@wasla.dz" />
                    <Input label="Téléphone Siège" value={profile.company_phone} onChange={v => onChange({ company_phone: v })} placeholder="+213 555 000 000" />
                    <Input label="WhatsApp Officiel" value={profile.whatsapp_number} onChange={v => onChange({ whatsapp_number: v })} placeholder="+213 666 000 000" />
                </div>
                
                <div className="max-w-2xl">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Adresse du Siège</label>
                    <textarea 
                        value={profile.company_address || ''}
                        onChange={e => onChange({ company_address: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        rows={3}
                        placeholder="123 Rue de la Technologie, Alger"
                    />
                </div>
            </section>

            <hr className="border-slate-100" />

             {/* ── SECTION 3: RESEAUX SOCIAUX ── */}
             <section className="space-y-6">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Réseaux Sociaux</h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input label="LinkedIn" value={profile.linkedin_url} onChange={v => onChange({ linkedin_url: v })} placeholder="https://linkedin.com/company/..." />
                    <Input label="Instagram" value={profile.instagram_url} onChange={v => onChange({ instagram_url: v })} placeholder="https://instagram.com/..." />
                    <Input label="Facebook" value={profile.facebook_url} onChange={v => onChange({ facebook_url: v })} placeholder="https://facebook.com/..." />
                    <Input label="Twitter / X" value={profile.twitter_url} onChange={v => onChange({ twitter_url: v })} placeholder="https://twitter.com/..." />
                </div>
            </section>

            <div className="sticky bottom-4 w-full flex justify-end mt-12 bg-white/80 p-4 rounded-xl backdrop-blur border border-slate-100 shadow-xl">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-70"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Enregistrer les Paramètres
                </button>
            </div>
        </div>
    );
}

function Input({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string }) {
    return (
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{label}</label>
            <input 
                type="text"
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder={placeholder}
            />
        </div>
    );
}
