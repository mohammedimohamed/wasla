"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    PaintBucket,
    Image as ImageIcon,
    Loader2,
    CheckCircle2,
    MonitorSmartphone,
    Globe,
    Monitor,
    ChevronRight,
    ShieldCheck,
    ShieldOff,
    Lock,
    Upload,
    Download,
} from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// ─── Zod Schema ──────────────────────────────────────────────────────────────
const settingsSchema = z.object({
    event_name: z.string().min(2, "Nom obligatoire"),
    primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Format de couleur invalide (ex: #4f46e5)"),
    kiosk_welcome_text: z.string().min(2, "Texte d'accueil obligatoire"),
    logo_url: z.string().optional().or(z.literal('')),
    mediashow_enabled: z.boolean().optional(),
    idle_timeout: z.number().int().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

// ─── The Vault Sub-Component ─────────────────────────────────────────────────
function VaultPanel({
    encryptionEnabled,
    isTogglingEncryption,
    isMigrating,
    isRestoring,
    onToggle,
    onMigrate,
    onRestore,
}: {
    encryptionEnabled: boolean;
    isTogglingEncryption: boolean;
    isMigrating: boolean;
    isRestoring: boolean;
    onToggle: () => void;
    onMigrate: () => void;
    onRestore: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[32px] p-8 shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        encryptionEnabled
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/20 text-rose-400"
                    }`}
                >
                    {encryptionEnabled ? (
                        <ShieldCheck className="w-6 h-6" />
                    ) : (
                        <ShieldOff className="w-6 h-6" />
                    )}
                </div>
                <div className="flex-1">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">
                        The Vault
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        AES-256-GCM Data Encryption
                    </p>
                </div>
                <span
                    className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${
                        encryptionEnabled
                            ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40"
                            : "bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40"
                    }`}
                >
                    {encryptionEnabled ? "CHIFFREMENT ON" : "CHIFFREMENT OFF"}
                </span>
            </div>

            {/* Toggle Row */}
            <div className="bg-white/5 rounded-2xl p-5 flex items-center justify-between mb-4 border border-white/10">
                <div className="flex-1 pr-6">
                    <p className="text-sm font-black text-white mb-0.5">
                        Chiffrement des Données (AES-256)
                    </p>
                    <p className="text-[10px] text-slate-400">
                        {encryptionEnabled
                            ? "Email & téléphone chiffrés au repos dans la base de données."
                            : "Leads sauvegardés en texte clair — mode débogage uniquement."}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onToggle}
                    disabled={isTogglingEncryption}
                    aria-label="Toggle encryption"
                    className={`relative flex-shrink-0 w-14 h-7 rounded-full transition-all duration-300 ${
                        encryptionEnabled ? "bg-emerald-500" : "bg-slate-600"
                    } disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white/30`}
                >
                    {isTogglingEncryption ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white absolute inset-0 m-auto" />
                    ) : (
                        <span
                            className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                                encryptionEnabled ? "left-7" : "left-0.5"
                            }`}
                        />
                    )}
                </button>
            </div>

            {/* Migrate */}
            <button
                type="button"
                onClick={onMigrate}
                disabled={isMigrating || !encryptionEnabled}
                className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl py-4 text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 mb-4 border border-white/10"
            >
                {isMigrating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Lock className="w-4 h-4" />
                )}
                Chiffrer les données existantes
            </button>

            {/* Backup + Restore */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <a
                    href="/api/backup"
                    download
                    className="bg-white/10 hover:bg-white/20 text-white rounded-2xl py-4 text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-white/10"
                >
                    <Download className="w-4 h-4" />
                    Backup
                </a>
                <label
                    className={`bg-white/10 hover:bg-white/20 text-white rounded-2xl py-4 text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-white/10 cursor-pointer ${
                        isRestoring ? "opacity-50 pointer-events-none" : ""
                    }`}
                >
                    {isRestoring ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Upload className="w-4 h-4" />
                    )}
                    Restore
                    <input
                        type="file"
                        accept=".json,.sqlite,.db"
                        className="sr-only"
                        onChange={onRestore}
                    />
                </label>
            </div>

            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center">
                🛡️ Key Guard actif — la clé de chiffrement est vérifiée avant toute restauration
            </p>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminSettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Vault state
    const [encryptionEnabled, setEncryptionEnabled] = useState(true);
    const [isTogglingEncryption, setIsTogglingEncryption] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    const form = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            event_name: "Batimatec 2026",
            primary_color: "#4f46e5",
            kiosk_welcome_text: "Bienvenue sur notre stand",
            logo_url: "",
            mediashow_enabled: false,
            idle_timeout: 60,
        },
    });

    const { register, handleSubmit, reset, watch, formState: { errors } } = form;
    const currentColor = watch("primary_color");
    const currentEventName = watch("event_name");
    const currentWelcomeText = watch("kiosk_welcome_text");

    // ── Data fetching ────────────────────────────────────────────────────────
    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/settings");
            if (!res.ok) throw new Error("Erreur de récupération");
            const data = await res.json();
            reset({
                event_name: data.settings.event_name,
                primary_color: data.settings.primary_color,
                kiosk_welcome_text: data.settings.kiosk_welcome_text,
                logo_url: data.settings.logo_url || "",
                mediashow_enabled: !!data.settings.mediashow_enabled,
                idle_timeout: data.settings.idle_timeout,
            });
            // Read the encryption toggle from DB
            setEncryptionEnabled(data.settings.encryption_enabled !== 0);
        } catch {
            toast.error("Format de configuration inaccessible.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSettings(); }, []);

    // ── Branding submit ──────────────────────────────────────────────────────
    const onSubmit = async (data: SettingsFormValues) => {
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Erreur lors de la sauvegarde");
            toast.success("Configuration Stand mise à jour !");
            setTimeout(() => window.location.reload(), 800);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Vault handlers ───────────────────────────────────────────────────────
    const handleToggleEncryption = async () => {
        const next = !encryptionEnabled;
        if (!confirm(`Voulez-vous vraiment ${next ? "activer" : "désactiver"} le chiffrement AES-256 ?`)) return;
        setIsTogglingEncryption(true);
        try {
            const res = await fetch("/api/admin/vault", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "TOGGLE", enabled: next }),
            });
            if (!res.ok) throw new Error();
            setEncryptionEnabled(next);
            toast.success(`Chiffrement ${next ? "activé ✅" : "désactivé 🔓"}`);
        } catch {
            toast.error("Erreur lors du changement de mode.");
        } finally {
            setIsTogglingEncryption(false);
        }
    };

    const handleMigrate = async () => {
        if (!confirm("Chiffrer MAINTENANT tous les leads existants en clair ? Action irréversible sans la clé.")) return;
        setIsMigrating(true);
        try {
            const res = await fetch("/api/admin/vault", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "MIGRATE" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success(`Migration terminée : ${data.migrated} chiffré(s), ${data.skipped} ignoré(s).`);
        } catch (e: any) {
            toast.error(e.message || "Erreur migration");
        } finally {
            setIsMigrating(false);
        }
    };

    const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!confirm(`Restaurer la base depuis "${file.name}" ? Les données actuelles seront remplacées.`)) {
            e.target.value = "";
            return;
        }
        setIsRestoring(true);
        try {
            const fd = new FormData();
            fd.append("backup", file);
            const res = await fetch("/api/restore", { method: "POST", body: fd });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Restauration échouée");
                return;
            }
            toast.success("Base restaurée avec succès ✅");
        } catch {
            toast.error("Erreur réseau lors de la restauration.");
        } finally {
            setIsRestoring(false);
            e.target.value = "";
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingLogo(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload/file", {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                reset({ ...form.getValues(), logo_url: data.url });
                toast.success("Logo mis à jour !");
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast.error("Erreur d'upload : " + error.message);
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const colorPresets = ["#4f46e5", "#e11d48", "#059669", "#d97706", "#0284c7", "#7c3aed", "#111827"];

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 selection:bg-indigo-500/30 font-sans transition-colors duration-300">
            <main className="p-6 lg:p-8 max-w-7xl mx-auto w-full">
                <div className="space-y-1 mb-10">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Identity & <span className="text-indigo-600 dark:text-indigo-400">Security</span></h2>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-widest uppercase">Global SaaS Configuration & Vault Settings</p>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center p-40">
                        <Loader2 className="w-10 h-10 animate-spin text-slate-300 dark:text-slate-700" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* ── LEFT COLUMN ── */}
                        <div className="lg:col-span-12 xl:col-span-7 space-y-6">

                            {/* Branding Form */}
                            <form id="settings-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                                {/* General Info */}
                                <div className="bg-white dark:bg-white/5 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm p-8 transition-colors">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
                                            <Globe className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
                                                Informations Générales
                                            </h2>
                                            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                                                Nom et visuel du salon ou de l&apos;événement.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 pl-2">
                                                Nom de l&apos;Événement <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                {...register("event_name")}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 px-5 py-4 rounded-2xl text-sm font-black text-slate-900 dark:text-white focus:border-indigo-400 dark:focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                            />
                                            {errors.event_name && (
                                                <p className="text-red-500 text-xs mt-2 font-bold pl-2">{errors.event_name.message}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 pl-2">
                                                Texte d&apos;Accueil Kiosk <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                {...register("kiosk_welcome_text")}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 px-5 py-4 rounded-2xl text-sm font-medium text-slate-900 dark:text-white focus:border-indigo-400 dark:focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                            />
                                            {errors.kiosk_welcome_text && (
                                                <p className="text-red-500 text-xs mt-2 font-bold pl-2">{errors.kiosk_welcome_text.message}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 pl-2">
                                                Logo de l'Événement
                                            </label>
                                            <div className="flex items-center gap-6 p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl group/logo relative overflow-hidden transition-colors">
                                                <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-2xl shadow-inner border border-slate-100 dark:border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                                    {watch("logo_url") ? (
                                                        <img src={watch("logo_url")} alt="Preview" className="w-full h-full object-contain p-2" />
                                                    ) : (
                                                        <ImageIcon className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Format conseillé</span>
                                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">PNG, SVG (Max 2MB)</span>
                                                    </div>
                                                    <div className="relative">
                                                        <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm">
                                                            {isUploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                                            {watch("logo_url") ? "Remplacer le Logo" : "Sélectionner un Logo"}
                                                            <input type="file" className="sr-only" accept="image/*" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                                                        </label>
                                                    </div>
                                                </div>
                                                <input type="hidden" {...register("logo_url")} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Visual Identity */}
                                <div className="bg-white dark:bg-white/5 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm p-8 transition-colors">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-2xl flex items-center justify-center">
                                            <PaintBucket className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
                                                Identité Visuelle
                                            </h2>
                                            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                                                Injection dynamique de charte graphique CSS.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-sm shrink-0 border border-slate-200 dark:border-white/10">
                                            <input
                                                type="color"
                                                {...register("primary_color")}
                                                className="absolute inset-0 w-20 h-20 -top-2 -left-2 cursor-pointer"
                                            />
                                        </div>
                                        <input
                                            {...register("primary_color")}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 px-5 py-4 rounded-2xl text-lg font-mono font-black tracking-widest text-slate-900 dark:text-white outline-none transition-all uppercase"
                                        />
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {colorPresets.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => reset({ ...form.getValues(), primary_color: color })}
                                                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                                                    currentColor === color ? "border-slate-900 dark:border-white scale-110 shadow-md" : "border-transparent"
                                                }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Mediashow Link */}
                                <div
                                    onClick={() => router.push("/admin/settings/mediashow")}
                                    className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-950 dark:to-slate-900 rounded-[32px] p-8 text-white shadow-xl flex items-center justify-between cursor-pointer group border border-white/5 dark:border-white/10 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/10 dark:bg-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Monitor className="w-6 h-6 text-rose-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-widest">
                                                Mediashow (Attract Mode)
                                            </h3>
                                            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                                                Configurez l&apos;écran de veille publicitaire offline.
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-6 h-6 text-slate-500 group-hover:text-white transition-colors" />
                                </div>
                            </form>

                            {/* Save Button */}
                            <div>
                                <button
                                    form="settings-form"
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-500 text-white rounded-[24px] shadow-xl py-5 text-sm font-black uppercase tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Déploiement...</>
                                    ) : (
                                        <><CheckCircle2 className="w-5 h-5" /> Enregistrer &amp; Publier</>
                                    )}
                                </button>
                                <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest mt-4 italic">
                                    Injection en direct sur tous les kiosques
                                </p>
                            </div>

                            {/* ── THE VAULT PANEL ─────────────────────────────────── */}
                            <VaultPanel
                                encryptionEnabled={encryptionEnabled}
                                isTogglingEncryption={isTogglingEncryption}
                                isMigrating={isMigrating}
                                isRestoring={isRestoring}
                                onToggle={handleToggleEncryption}
                                onMigrate={handleMigrate}
                                onRestore={handleRestore}
                            />

                        </div>

                        {/* ── RIGHT COLUMN: Live Preview ── */}
                        <div className="hidden xl:block xl:col-span-5 relative">
                            <div className="sticky top-24">
                                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <MonitorSmartphone className="w-4 h-4 text-indigo-400 dark:text-indigo-500" /> Aperçu Client
                                </h3>
                                <div className="bg-slate-900 dark:bg-black p-3 rounded-[40px] shadow-2xl aspect-[3/4] flex flex-col items-center border dark:border-white/5 transition-colors">
                                    <div className="w-full h-full bg-slate-50 dark:bg-slate-900 rounded-[32px] overflow-hidden flex flex-col relative transition-colors">
                                        <div
                                            className="absolute top-0 inset-x-0 h-40 opacity-20"
                                            style={{ backgroundImage: `linear-gradient(to bottom, ${currentColor}, transparent)` }}
                                        />
                                        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center z-10 relative mt-10">
                                            <div
                                                className="w-16 h-16 rounded-3xl shadow-lg mb-6 flex items-center justify-center overflow-hidden bg-white dark:bg-slate-950"
                                                style={{ borderBottom: `4px solid ${currentColor}` }}
                                            >
                                                {watch("logo_url") ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={watch("logo_url")} className="w-full h-full object-contain p-2" alt="logo" />
                                                ) : (
                                                    <span className="font-black text-xl text-slate-300 dark:text-slate-700">W</span>
                                                )}
                                            </div>
                                            <h4
                                                className="text-[10px] font-black uppercase tracking-widest mb-1"
                                                style={{ color: currentColor }}
                                            >
                                                {currentEventName}
                                            </h4>
                                            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-8">
                                                {currentWelcomeText}
                                            </h1>
                                            <div className="w-full max-w-[80%] space-y-3 opacity-50">
                                                <div className="h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl" />
                                                <div
                                                    className="h-10 text-white rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest"
                                                    style={{ backgroundColor: currentColor }}
                                                >
                                                    Continuer
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </main>
        </div>
    );
}
