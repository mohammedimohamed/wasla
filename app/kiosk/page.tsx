"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { MoveRight, MoveLeft, Loader2, CheckCircle2, AlertCircle, Monitor } from "lucide-react";
import toast from "react-hot-toast";
import { saveLeadOffline, markLeadSynced, markLeadFailed } from "@/lib/offlineQueue";
import { useFormConfig, FormPage, FormField } from "@/src/hooks/useFormConfig";
import IdleTracker from "@/src/components/IdleTracker";
import MediashowOverlay from "./MediashowOverlay";
import { useTranslation } from "@/src/context/LanguageContext";

type FormValues = Record<string, any>;

// ── Field Renderer — shared by kiosk multi-page stepper ──────────────────────
function FieldRenderer({
    field,
    register,
    control,
    errors,
    primaryColor,
    watch,
}: {
    field: FormField;
    register: any;
    control: any;
    errors: any;
    primaryColor: string;
    watch: any;
}) {
    if (!register) return null;
    const isFull = field.colSpan === 2 || field.type === 'textarea';
    const hasError = !!errors[field.name];
    const baseInput = `w-full bg-slate-50 border ${hasError ? 'border-red-400 focus:ring-red-50' : 'border-slate-200 focus:ring-slate-100'} px-5 py-4 min-h-[56px] rounded-[20px] text-base font-medium focus:border-slate-400 focus:ring-4 outline-none transition-all placeholder:text-slate-300 shadow-sm`;

    return (
        <div className={isFull ? "col-span-1 md:col-span-2" : "col-span-1"}>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 pl-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>

            {(field.type === 'text' || field.type === 'email' || field.type === 'tel') && (
                <input
                    type={field.type}
                    placeholder={field.placeholder}
                    {...register(field.name, { required: field.required })}
                    className={baseInput}
                />
            )}

            {field.type === 'textarea' && (
                <textarea
                    placeholder={field.placeholder}
                    {...register(field.name, { required: field.required })}
                    className={`${baseInput} min-h-[120px] resize-none`}
                />
            )}

            {field.type === 'select' && (
                <Controller
                    name={field.name}
                    control={control}
                    rules={{ required: field.required }}
                    render={({ field: { onChange, value } }) => (
                        <div className="flex flex-wrap gap-2">
                            {field.options?.map(opt => (
                                <button
                                    type="button"
                                    key={opt.value}
                                    onClick={() => onChange(opt.value)}
                                    className={`px-5 py-3 rounded-[16px] text-sm font-black uppercase tracking-wider transition-all border ${value === opt.value ? 'shadow-md scale-105' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                    style={value === opt.value ? { backgroundColor: primaryColor, color: 'white', borderColor: primaryColor } : {}}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                />
            )}

            {(field.type === 'multiselect' || field.type === 'chip-group') && (
                <Controller
                    name={field.name}
                    control={control}
                    defaultValue={[]}
                    rules={{ required: field.required, validate: field.minItems ? (v: string[]) => (v || []).length >= (field.minItems ?? 1) || 'Sélection requise' : undefined }}
                    render={({ field: { onChange, value } }) => {
                        const toggle = (val: string) => {
                            const current = value || [];
                            if (current.includes(val)) onChange(current.filter((item: string) => item !== val));
                            else onChange([...current, val]);
                        };
                        return (
                            <div className="flex flex-wrap gap-2">
                                {field.options?.map(opt => {
                                    const isSelected = (value || []).includes(opt.value);
                                    return (
                                        <button
                                            type="button"
                                            key={opt.value}
                                            onClick={() => toggle(opt.value)}
                                            className={`px-5 py-3 rounded-[16px] text-sm font-black uppercase tracking-wider transition-all border flex items-center gap-2 ${isSelected ? 'shadow-md scale-105' : 'bg-white border-slate-200 text-slate-500'}`}
                                            style={isSelected ? { backgroundColor: primaryColor, color: 'white', borderColor: primaryColor } : {}}
                                        >
                                            {opt.icon && <span>{opt.icon}</span>}
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    }}
                />
            )}

            {hasError && (
                <p className="text-red-500 text-xs mt-2 pl-2 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {(errors[field.name]?.message as string) || 'Champ requis'}
                </p>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// KIOSK PAGE — Multi-page stepper driven by DB form schema
// ─────────────────────────────────────────────────────────────────────────────
export default function KioskPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [settings, setSettings] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [isSignageMode, setIsSignageMode] = useState(false);
    const [mediashowAssets, setMediashowAssets] = useState<any[]>([]);

    const { config, isLoading: schemaLoading } = useFormConfig();
    const form = useForm<FormValues>();
    const { register, handleSubmit, control, watch, trigger, reset, formState: { errors } } = form;

    // 🛡️ EFFECTIVE RESET ENGINE
    // This centralizes privacy wipes and prevents "register is undefined" race conditions
    useEffect(() => {
        if (isSignageMode && typeof reset === 'function') {
            reset();
            setCurrentPage(0);
        }
    }, [isSignageMode, reset]);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                if (data.success) {
                    setSettings(data.settings);
                    document.documentElement.style.setProperty('--primary-color', data.settings.primary_color);

                    // If mediashow is enabled, fetch assets from PUBLIC API
                    if (data.settings.mediashow_enabled) {
                        const assetsRes = await fetch('/api/mediashow');
                        const assetsData = await assetsRes.json();
                        if (assetsData.success) {
                            setMediashowAssets(assetsData.assets);

                            // 🚀 PRE-FETCH ASSETS FOR OFFLINE READINESS
                            // We do this silently to populate Service Worker Cache
                            if (navigator.onLine) {
                                assetsData.assets.forEach((asset: any) => {
                                    const link = document.createElement('link');
                                    link.rel = asset.type === 'video' ? 'preload' : 'prefetch';
                                    link.as = asset.type;
                                    link.href = asset.url;
                                    document.head.appendChild(link);
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                toast.error("Impossible de charger la configuration.");
            }
        };
        loadSettings();
    }, []);

    const resetForm = () => {
        setIsSignageMode(false);
    };

    const handleMarketingMode = () => {
        setIsSignageMode(true);
    };

    const onSubmit = async (data: FormValues) => {
        if (!data.consent_given) {
            toast.error("Veuillez accepter les conditions d'utilisation.");
            return;
        }

        setIsSubmitting(true);

        const searchParams = new URLSearchParams(window.location.search);
        const rawLocation = searchParams.get('location') || '';
        const location = rawLocation.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50);
        const payload = { ...data, device_id: location || 'Generic_QR' };

        // ─── STEP 1: WRITE TO IndexedDB IMMEDIATELY — never blocks the user ───
        // This is the source of truth. Even if the device dies right after,
        // the data is safe and the SyncManager will recover it on next launch.
        const localRecord = await saveLeadOffline(payload, 'kiosk');

        // ─── STEP 2: NAVIGATE IMMEDIATELY — user experience is never blocked ──
        // The success screen appears while the server request fires in background.
        sessionStorage.removeItem('kiosk_reward');
        const successPath = location
            ? `/kiosk/success?location=${encodeURIComponent(location)}`
            : '/kiosk/success';

        // ─── STEP 3: BACKGROUND SERVER REQUEST (fire-and-forget) ──────────────
        // We DON'T await this. We start it and let it settle.
        (async () => {
            // If the device is offline, skip — SyncManager handles this via the online event
            if (!navigator.onLine) return;

            try {
                const res = await fetch('/api/kiosk/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // Embed the client_uuid so the server uses it as the idempotency key
                    body: JSON.stringify({ ...payload, client_uuid: localRecord.client_uuid }),
                });

                if (res.status === 409) {
                    // Duplicate — server already has this lead (different session).
                    // Mark local as synced so SyncManager doesn't retry it.
                    await markLeadSynced(localRecord.client_uuid);
                    return;
                }

                if (res.ok) {
                    const result = await res.json();
                    // Mark local record as synced — zero-data-loss achieved
                    await markLeadSynced(localRecord.client_uuid);
                    // Cache reward for the success screen (if the page is still loading)
                    if (result.reward) {
                        sessionStorage.setItem('kiosk_reward', JSON.stringify(result.reward));
                    }
                } else {
                    // 5xx: server error — leave as 'pending' so SyncManager retries
                    await markLeadFailed(localRecord.client_uuid, `HTTP ${res.status}`);
                }
            } catch (networkErr) {
                // Network cut mid-request — record stays 'pending' in IndexedDB.
                // SyncManager will pick it up on the next 'online' event or poll.
                console.warn('[Kiosk] Background sync failed — SyncManager will retry:', networkErr);
            }
        })();

        // Navigate — this happens synchronously after firing the background task
        router.push(successPath);
    };

    const handleNext = async () => {
        if (!config) return;
        const page = config.pages[currentPage];
        // Collect all field names on this page to validate only them
        const fieldNames = page.sections.flatMap(s => s.fields.map(f => f.name));
        const valid = await trigger(fieldNames as any);
        if (valid) setCurrentPage(p => p + 1);
    };

    if (!settings || schemaLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-slate-300" />
            </div>
        );
    }

    if (!config || !config.pages || config.pages.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <p className="text-slate-400 font-bold">Formulaire non configuré.</p>
            </div>
        );
    }

    const primaryColor = settings.primary_color;
    const totalPages = config.pages.length;
    const activePage: FormPage = config.pages[currentPage];
    const isLastPage = currentPage === totalPages - 1;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans max-w-[1600px] mx-auto shadow-2xl overflow-hidden">

            {/* 📺 MEDIASHOW OVERLAY ENGINE */}
            {!!settings.mediashow_enabled && (
                <MediashowOverlay
                    assets={mediashowAssets || []}
                    isVisible={isSignageMode}
                    onDismiss={resetForm}
                />
            )}

            {/* ── LEFT: WELCOME PANEL ─────────────────────────────────────────── */}
            <div
                className="md:w-5/12 lg:w-4/12 flex flex-col items-center justify-center text-center p-10 md:p-16 lg:p-20 relative overflow-hidden shrink-0"
                style={{ backgroundColor: primaryColor }}
            >
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-black opacity-10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 w-full flex flex-col items-center">
                    {settings.logo_url ? (
                        <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-full flex items-center justify-center shadow-2xl mb-8 md:mb-12 p-4">
                            <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    ) : (
                        <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-inner">
                            <span className="text-5xl font-black text-white">{settings.event_name?.charAt(0)}</span>
                        </div>
                    )}
                    <h2 className="text-[10px] md:text-sm font-black text-white/60 tracking-widest uppercase mb-4">
                        {settings.event_name}
                    </h2>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                        {settings.kiosk_welcome_text}
                    </h1>

                    {/* Page Progress Dots */}
                    {totalPages > 1 && (
                        <div className="flex gap-2 mt-10">
                            {config.pages.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`rounded-full transition-all duration-300 ${idx === currentPage ? 'w-8 h-2 bg-white' : idx < currentPage ? 'w-2 h-2 bg-white/80' : 'w-2 h-2 bg-white/30'}`}
                                />
                            ))}
                        </div>
                    )}
                    {totalPages > 1 && (
                        <p className="text-white/50 text-xs font-bold mt-3 uppercase tracking-widest">
                            Étape {currentPage + 1} / {totalPages} — {activePage.title}
                        </p>
                    )}
                </div>
            </div>

            {/* ── RIGHT: DYNAMIC FORM ─────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto bg-white p-6 md:p-12 lg:p-20 relative">
                <div className="max-w-3xl mx-auto w-full">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 pb-24">

                        {/* Render sections for the current page only */}
                        {activePage.sections.map((section, sIdx) => (
                            <div key={section.id || sIdx} className="space-y-6">
                                <div className="border-b border-slate-100 pb-4">
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{section.title}</h3>
                                    {section.description && <p className="text-sm text-slate-500 font-medium mt-1">{section.description}</p>}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                    {section.fields.map(field => (
                                        <FieldRenderer
                                            key={field.name}
                                            field={field}
                                            register={register}
                                            control={control}
                                            errors={errors}
                                            primaryColor={primaryColor}
                                            watch={watch}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* ── CONSENT + SUBMIT (last page only) ─────────────── */}
                        {isLastPage && (
                            <>
                                <div className="pt-8 border-t border-slate-100 flex items-start gap-4">
                                    <div className="pt-1">
                                        <Controller
                                            name="consent_given"
                                            control={control}
                                            defaultValue={false}
                                            rules={{ required: true }}
                                            render={({ field: { onChange, value } }) => (
                                                <button
                                                    type="button"
                                                    onClick={() => onChange(!value)}
                                                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors ${value ? 'border-emerald-500 bg-emerald-500 text-white shadow-md' : 'border-slate-300 bg-white'}`}
                                                >
                                                    {value && <CheckCircle2 className="w-4 h-4" />}
                                                </button>
                                            )}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-700 leading-snug">
                                            J'accepte que mes données soient recueillies et utilisées dans le cadre de cet événement, conformément à la Loi 18-07.
                                        </p>
                                        {errors.consent_given && <p className="text-red-500 text-xs mt-1 font-bold">Votre consentement est obligatoire.</p>}
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    {totalPages > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage(p => p - 1)}
                                            className="flex-1 border-2 border-slate-200 text-slate-600 py-6 rounded-[24px] text-lg font-black uppercase tracking-widest transition-all hover:border-slate-400 flex items-center justify-center gap-3"
                                        >
                                            <MoveLeft className="w-6 h-6" /> Retour
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 text-white py-6 rounded-[24px] text-lg font-black uppercase tracking-widest transition-all shadow-xl hover:scale-[1.02] flex items-center justify-center gap-3 disabled:opacity-70 disabled:scale-100"
                                        style={{ backgroundColor: primaryColor, boxShadow: `0 20px 25px -5px ${primaryColor}40` }}
                                    >
                                        {isSubmitting ? (
                                            <><Loader2 className="w-6 h-6 animate-spin" /> Traitement en cours...</>
                                        ) : (
                                            <>S'inscrire et Valider <MoveRight className="w-6 h-6" /></>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}

                        {/* ── NEXT BUTTON (not last page) ────────────────────── */}
                        {!isLastPage && (
                            <div className="pt-4 flex gap-4">
                                {currentPage > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(p => p - 1)}
                                        className="flex-1 border-2 border-slate-200 text-slate-600 py-6 rounded-[24px] text-lg font-black uppercase tracking-widest hover:border-slate-400 flex items-center justify-center gap-3 transition-all"
                                    >
                                        <MoveLeft className="w-6 h-6" /> Retour
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="flex-1 text-white py-6 rounded-[24px] text-lg font-black uppercase tracking-widest transition-all shadow-xl hover:scale-[1.02] flex items-center justify-center gap-3"
                                    style={{ backgroundColor: primaryColor, boxShadow: `0 20px 25px -5px ${primaryColor}40` }}
                                >
                                    Suivant <MoveRight className="w-6 h-6" />
                                </button>
                            </div>
                        )}
                    </form>

                    {/* 🔘 MARKETING MODE TRIGGER (Subtle Footer) */}
                    {!!settings.mediashow_enabled && (
                        <div className="absolute bottom-6 right-6">
                            <button
                                type="button"
                                onClick={handleMarketingMode}
                                className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all group"
                            >
                                <Monitor className="w-5 h-5 group-hover:text-rose-400" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
