"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { leadFormSchema } from "@/src/config/formSchema";
import { useForm, Controller } from "react-hook-form";
import { MoveRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { saveLeadOffline } from "@/lib/offlineQueue";

type FormValues = Record<string, any>;

export default function KioskPage() {
    const router = useRouter();
    const [settings, setSettings] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormValues>();

    // Fetch dynamic Branding from Admin Settings
    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setSettings(data.settings);
                    // Adjust dynamic CSS vars globally just for safety or local scope
                    document.documentElement.style.setProperty('--primary-color', data.settings.primary_color);
                }
            })
            .catch(() => {
                toast.error("Impossible de charger la configuration.");
            });
    }, []);

    const onSubmit = async (data: FormValues) => {
        if (!data.consent_given) {
            toast.error("Veuillez accepter les conditions d'utilisation.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Extrait l'emplacement du kiosk si présent dans l'URL
            const searchParams = new URLSearchParams(window.location.search);
            const location = searchParams.get('location');

            // Ajoute l'id de l'appareil
            const payload = { ...data, device_id: location || null };

            let isOfflineFallback = false;

            if (!navigator.onLine) {
                isOfflineFallback = true;
            } else {
                try {
                    const res = await fetch('/api/kiosk/submit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });

                    if (!res.ok) throw new Error("Server Error");

                    const result = await res.json();

                    // Store reward locally so the success page can render it immediately
                    if (result.reward) {
                        sessionStorage.setItem('kiosk_reward', JSON.stringify(result.reward));
                    } else {
                        sessionStorage.removeItem('kiosk_reward');
                    }
                } catch (err: any) {
                    isOfflineFallback = true;
                }
            }

            if (isOfflineFallback) {
                saveLeadOffline(payload, 'kiosk');
                toast.success("Hors ligne: Lead sauvegardé localement 📶❌", { duration: 5000 });
                sessionStorage.removeItem('kiosk_reward'); // No instant DB rewards when offline
            }

            // Route to success screen with tracker
            if (location) {
                router.push(`/kiosk/success?location=${encodeURIComponent(location)}`);
            } else {
                router.push('/kiosk/success');
            }
        } catch (error: any) {
            toast.error("Une erreur est survenue, veuillez réessayer.");
            setIsSubmitting(false);
        }
    };

    if (!settings) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-slate-300" />
            </div>
        );
    }

    const primaryColor = settings.primary_color;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans max-w-[1600px] mx-auto shadow-2xl">

            {/* ── LEFT: WELCOME (Sticky on Desktop) ───────────────────────────────── */}
            <div className="md:w-5/12 lg:w-4/12 flex flex-col items-center justify-center text-center p-10 md:p-16 lg:p-20 relative overflow-hidden shrink-0"
                style={{ backgroundColor: primaryColor }}
            >
                {/* Visual Decoration */}
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
                </div>
            </div>

            {/* ── RIGHT: DYNAMIC FORM ─────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto bg-white p-6 md:p-12 lg:p-20 relative">
                <div className="max-w-3xl mx-auto w-full">

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 pb-24">

                        {leadFormSchema.sections.map((section, sIdx) => (
                            <div key={sIdx} className="space-y-6">
                                <div className="border-b border-slate-100 pb-4">
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{section.title.split('—').pop()?.trim() || section.title}</h3>
                                    {section.description && <p className="text-sm text-slate-500 font-medium mt-1">{section.description}</p>}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                    {section.fields.map(field => {
                                        const isFull = field.colSpan === 2 || field.type === 'textarea';
                                        return (
                                            <div key={field.name} className={isFull ? "col-span-1 md:col-span-2" : "col-span-1"}>
                                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 pl-1">
                                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                                </label>

                                                {/* Text, Email, Tel */}
                                                {(field.type === 'text' || field.type === 'email' || field.type === 'tel') && (
                                                    <input
                                                        type={field.type}
                                                        placeholder={field.placeholder}
                                                        {...register(field.name, { required: field.required })}
                                                        className={`w-full bg-slate-50 border ${errors[field.name] ? 'border-red-400 focus:ring-red-50' : 'border-slate-200 focus:ring-slate-100'} px-5 py-4.5 min-h-[56px] rounded-[20px] text-base font-medium focus:border-slate-400 focus:ring-4 outline-none transition-all placeholder:text-slate-300 shadow-sm`}
                                                    />
                                                )}

                                                {/* Textarea */}
                                                {field.type === 'textarea' && (
                                                    <textarea
                                                        placeholder={field.placeholder}
                                                        {...register(field.name, { required: field.required })}
                                                        className={`w-full bg-slate-50 border ${errors[field.name] ? 'border-red-400 focus:ring-red-50' : 'border-slate-200 focus:ring-slate-100'} px-5 py-4 rounded-[20px] text-base font-medium focus:border-slate-400 focus:ring-4 outline-none transition-all placeholder:text-slate-300 min-h-[120px] resize-none shadow-sm`}
                                                    />
                                                )}

                                                {/* Select (Chips) */}
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

                                                {/* Multiselect / Chip Group */}
                                                {(field.type === 'multiselect' || field.type === 'chip-group') && (
                                                    <Controller
                                                        name={field.name}
                                                        control={control}
                                                        defaultValue={[]}
                                                        rules={{ required: field.required }}
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
                                                                                className={`px-5 py-3 rounded-[16px] text-sm font-black uppercase tracking-wider transition-all border flex items-center gap-2 ${isSelected ? 'shadow-md scale-105' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
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

                                                {errors[field.name] && <p className="text-red-500 text-xs mt-2 pl-2 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Requis</p>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* ── CONSENT (LAW 18-07) ────────────────────────────── */}
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
                                <label className="text-sm font-bold text-slate-700 leading-snug cursor-pointer" onClick={() => {
                                    const current = watch('consent_given');
                                    control._formValues.consent_given = !current;
                                }}>
                                    J'accepte que mes données soient recueillies et utilisées dans le cadre de cet événement, conformément à la Loi 18-07 relative à la protection des personnes physiques dans le traitement des données à caractère personnel.
                                </label>
                                {errors.consent_given && <p className="text-red-500 text-xs mt-1 font-bold">Votre consentement est obligatoire.</p>}
                            </div>
                        </div>

                        {/* ── SUBMIT BUTTON ───────────────────────────────────── */}
                        <div className="pt-10">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full text-white py-6 rounded-[24px] text-lg font-black uppercase tracking-widest transition-all shadow-xl hover:scale-[1.02] flex items-center justify-center gap-3 disabled:opacity-70 disabled:scale-100"
                                style={{ backgroundColor: primaryColor, boxShadow: `0 20px 25px -5px ${primaryColor}40` }}
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="w-6 h-6 animate-spin" /> Traitement en cours...</>
                                ) : (
                                    <>S'inscrire et Valider <MoveRight className="w-6 h-6" /></>
                                )}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}
