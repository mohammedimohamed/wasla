"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    Settings,
    PaintBucket,
    Type,
    Image as ImageIcon,
    Loader2,
    CheckCircle2,
    MonitorSmartphone,
    Globe
} from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const settingsSchema = z.object({
    event_name: z.string().min(2, "Nom obligatoire"),
    primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Format de couleur invalide (ex: #4f46e5)"),
    kiosk_welcome_text: z.string().min(2, "Texte d'accueil obligatoire"),
    logo_url: z.string().url("URL invalide").optional().or(z.literal('')),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function AdminSettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            event_name: 'Batimatec 2026',
            primary_color: '#4f46e5',
            kiosk_welcome_text: 'Bienvenue sur notre stand',
            logo_url: ''
        }
    });

    const currentColor = watch('primary_color');
    const currentEventName = watch('event_name');
    const currentWelcomeText = watch('kiosk_welcome_text');

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings');
            if (!res.ok) throw new Error("Erreur de récupération");
            const data = await res.json();

            reset({
                event_name: data.settings.event_name,
                primary_color: data.settings.primary_color,
                kiosk_welcome_text: data.settings.kiosk_welcome_text,
                logo_url: data.settings.logo_url || ''
            });
        } catch (error) {
            toast.error("Format de configuration inaccessible.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const onSubmit = async (data: SettingsFormValues) => {
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Erreur lors de la sauvegarde");

            toast.success("Configuration Stand mise à jour !");

            // Force reload so layout refetches the global styling injects
            setTimeout(() => {
                window.location.reload();
            }, 800);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Quick palette selection for SaaS Admins
    const colorPresets = [
        '#4f46e5', // Indigo Wasla Default
        '#e11d48', // Red Rose
        '#059669', // Emerald
        '#d97706', // Amber
        '#0284c7', // Sky Blue
        '#7c3aed', // Violet
        '#111827', // Slate Dark
    ];

    return (
        <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
            {/* ── HEADER ─────────────────────────────────────────────────────── */}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/admin/dashboard")}
                        className="p-2 -ml-2 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <ChevronLeft className="w-6 h-6 text-slate-700" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Identité Branding</h1>
                        <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">Configuration Globale SaaS</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
                {loading ? (
                    <div className="flex items-center justify-center p-40">
                        <Loader2 className="w-10 h-10 animate-spin text-slate-300" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* ── LEFT CONFIGURATION PANEL ── */}
                        <div className="lg:col-span-7 space-y-6">
                            <form id="settings-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                                {/* Block: Identité Événement */}
                                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                            <Globe className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Informations Générales</h2>
                                            <p className="text-xs font-medium text-slate-400">Nom et visuel du salon ou de l'événement.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">
                                                Nom de l'Événement <span className="text-red-500">*</span>
                                            </label>
                                            <input {...register('event_name')} placeholder="Ex: Salon Batimatec 2026" className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl text-sm font-black text-slate-900 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all placeholder:text-slate-300" />
                                            {errors.event_name && <p className="text-red-500 text-xs mt-2 font-bold pl-2">{errors.event_name.message}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">
                                                Texte d'Accueil Kiosk (Titre principal) <span className="text-red-500">*</span>
                                            </label>
                                            <input {...register('kiosk_welcome_text')} placeholder="Ex: Bienvenue sur le stand Wasla" className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl text-sm font-medium focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all placeholder:text-slate-300" />
                                            {errors.kiosk_welcome_text && <p className="text-red-500 text-xs mt-2 font-bold pl-2">{errors.kiosk_welcome_text.message}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">
                                                Logo URL (Optionnel)
                                            </label>
                                            <div className="flex bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-50 transition-all">
                                                <div className="pl-4 flex items-center justify-center text-slate-400">
                                                    <ImageIcon className="w-5 h-5" />
                                                </div>
                                                <input {...register('logo_url')} placeholder="https://mon-domaine.com/logo.png" className="w-full bg-transparent px-4 py-4 text-sm font-medium outline-none placeholder:text-slate-300" />
                                            </div>
                                            {errors.logo_url && <p className="text-red-500 text-xs mt-2 font-bold pl-2">{errors.logo_url.message}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Block: Couleurs Principales */}
                                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center">
                                            <PaintBucket className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Identité Visuelle</h2>
                                            <p className="text-xs font-medium text-slate-400">Injection dynamique de charte graphique CSS.</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-2">
                                            Couleur Principale (Theme Color) <span className="text-red-500">*</span>
                                        </label>

                                        <div className="flex items-center gap-4 mb-4">
                                            {/* Native HTML5 Color Picker wrapped gracefully */}
                                            <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-sm shrink-0 border border-slate-200">
                                                <input
                                                    type="color"
                                                    {...register('primary_color')}
                                                    className="absolute inset-0 w-20 h-20 -top-2 -left-2 cursor-pointer"
                                                />
                                            </div>

                                            <input
                                                {...register('primary_color')}
                                                className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl text-lg font-mono font-black tracking-widest text-slate-900 focus:border-indigo-400 outline-none transition-all uppercase"
                                            />
                                        </div>
                                        {errors.primary_color && <p className="text-red-500 text-xs mt-1 font-bold pl-2">{errors.primary_color.message}</p>}

                                        {/* Presets */}
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {colorPresets.map(color => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={() => reset({ ...watch(), primary_color: color })}
                                                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${currentColor === color ? 'border-indigo-400 scale-110 shadow-md' : 'border-transparent'}`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </form>

                            {/* Floating Save Action */}
                            <div className="pt-4">
                                <button
                                    form="settings-form"
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-slate-900 hover:bg-black text-white rounded-[24px] shadow-xl mt-2 py-5 text-sm font-black uppercase tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Déploiement Configuration...</>
                                    ) : (
                                        <><CheckCircle2 className="w-5 h-5" /> Enregistrer & Publier</>
                                    )}
                                </button>
                                <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">Toutes modifications en direct sur le Kiosk</p>
                            </div>
                        </div>

                        {/* ── RIGHT PREVIEW PANEL ── */}
                        <div className="lg:col-span-5 relative">
                            <div className="sticky top-24">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <MonitorSmartphone className="w-4 h-4 text-indigo-400" />
                                    Aperçu en Direct: Application Client
                                </h3>

                                {/* Simulated iPad Frame container */}
                                <div className="bg-slate-900 p-3 rounded-[40px] shadow-2xl overflow-hidden aspect-[3/4] flex flex-col items-center">
                                    <div className="w-full h-full bg-slate-50 rounded-[32px] overflow-hidden flex flex-col relative">

                                        {/* Background Decor */}
                                        <div className="absolute top-0 inset-x-0 h-40 opacity-20" style={{ backgroundImage: `linear-gradient(to bottom, ${currentColor}, transparent)` }} />

                                        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center z-10 relative mt-10">
                                            <div className="w-16 h-16 rounded-3xl shadow-lg mb-6 flex items-center justify-center overflow-hidden bg-white" style={{ borderBottom: `4px solid ${currentColor}` }}>
                                                {watch('logo_url') ? (
                                                    <img src={watch('logo_url')} alt="Logo" className="w-full h-full object-contain p-2" onError={(e) => { (e.target as any).src = '' }} />
                                                ) : (
                                                    <span className="font-black text-xl text-slate-300">W</span>
                                                )}
                                            </div>

                                            <h4 className="text-[10px] font-black uppercase tracking-widest mb-1 pointer-events-none" style={{ color: currentColor }}>
                                                {currentEventName || 'Nom de l\'Evenement'}
                                            </h4>

                                            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-8">
                                                {currentWelcomeText || 'Texte Principal'}
                                            </h1>

                                            {/* Dummy Form */}
                                            <div className="w-full max-w-[80%] space-y-3 pointer-events-none opacity-50">
                                                <div className="h-10 bg-white border border-slate-200 rounded-xl w-full" />
                                                <div className="h-10 bg-white border border-slate-200 rounded-xl w-full" />
                                                <div className="h-10 text-white rounded-xl w-full mt-4 flex items-center justify-center text-xs font-black uppercase tracking-wide" style={{ backgroundColor: currentColor }}>
                                                    S'inscrire
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
