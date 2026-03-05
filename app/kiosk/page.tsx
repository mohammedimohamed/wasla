"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowRight,
    Lock,
    Settings,
    X,
    Sparkles,
    Gift
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import ConsentModal from "@/components/ConsentModal";

const kioskSchema = z.object({
    contact: z.string().min(2, "Votre nom est obligatoire"),
    telephone: z.string().min(9, "Téléphone invalide (min 9 chiffres)"),
    email: z.string().email("Veuillez entrer un email valide pour recevoir vos cadeaux"),
    ville: z.string().optional(),
    type_client: z.string({ required_error: "Veuillez sélectionner votre profil" }),
    produits: z.array(z.string()).min(1, "Veuillez sélectionner au moins un intérêt"),
    honeypot: z.string().max(0).optional(), // Anti-bot
});

type KioskFormValues = z.infer<typeof kioskSchema>;

const CLIENT_TYPES = [
    "Promoteur", "Hôtel", "Architecte", "Particulier", "Revendeur", "Installateur / Plombier", "Autre"
];

const PRODUCTS = [
    { id: "baignoire", label: "Baignoire", icon: "🛁" },
    { id: "baignoire_tablier", label: "Baignoire avec tablier", icon: "🛁" },
    { id: "jacuzzi", label: "Jacuzzi", icon: "💦" },
];

export default function KioskPage() {
    const router = useRouter();
    const [step, setStep] = useState<"welcome" | "form">("welcome");
    const [showExitModal, setShowExitModal] = useState(false);
    const [exitPin, setExitPin] = useState("");
    const [isConsentOpen, setIsConsentOpen] = useState(false);
    const [formData, setFormData] = useState<KioskFormValues | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Inactivity Timer (90s)
    const resetTimer = useCallback(() => {
        if (step === "form") {
            window.scrollTo({ top: 0, behavior: "smooth" });
            setStep("welcome");
            toast.error("Session réinitialisée après inactivité", { icon: "⏳" });
        }
    }, [step]);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (step === "form") {
            timeout = setTimeout(resetTimer, 90000);
        }
        return () => clearTimeout(timeout);
    }, [step, resetTimer]);

    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<KioskFormValues>({
        resolver: zodResolver(kioskSchema),
        defaultValues: { produits: [] }
    });

    const selectedType = watch("type_client");
    const selectedProducts = watch("produits");

    const startForm = () => setStep("form");

    const preSubmit = (data: KioskFormValues) => {
        setFormData(data);
        setIsConsentOpen(true);
    };

    const handleFinalSubmit = async (consentAt: string) => {
        if (!formData) return;
        setIsSubmitting(true);
        setIsConsentOpen(false);

        try {
            const response = await fetch("/api/kiosk/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    consent_given: 1,
                    consent_at: consentAt,
                    consent_source: "kiosk",
                    source: "kiosk",
                    id: crypto.randomUUID(),
                    created_at: new Date().toISOString(),
                }),
            });

            const result = await response.json();

            if (response.ok) {
                localStorage.setItem("last_reward", JSON.stringify(result.reward));
                router.push("/kiosk/success");
            } else {
                toast.error(result.message || "Erreur de soumission");
            }
        } catch (error) {
            toast.error("Erreur réseau");
        } finally {
            setIsSubmitting(false);
        }
    };

    const verifyExitPin = () => {
        if (exitPin === (process.env.NEXT_PUBLIC_APP_PIN || "1234")) {
            router.push("/dashboard");
        } else {
            toast.error("PIN incorrect");
            setExitPin("");
        }
    };

    if (step === "welcome") {
        return (
            <div className="flex-1 flex flex-col bg-slate-900 text-white overflow-hidden relative">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] aspect-square bg-primary/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-5%] left-[-5%] w-[40%] aspect-square bg-blue-600/10 rounded-full blur-[80px]" />

                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-12 relative z-10">
                    <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/20 animate-bounce transition-all duration-1000">
                        <Sparkles className="w-12 h-12 text-white" />
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl font-black tracking-tight leading-tight">
                            Recevez notre <span className="text-primary italic">catalogue exclusif</span>
                        </h1>
                        <p className="text-xl text-slate-400 font-medium px-4">
                            + Un code promo exceptionnel offert immédiatement après votre inscription !
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
                        <button
                            onClick={startForm}
                            className="group bg-white text-slate-900 py-8 rounded-[32px] font-black text-2xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4"
                        >
                            Je participe
                            <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform text-primary" />
                        </button>
                        <div className="flex items-center justify-center gap-6 mt-4">
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                                    <Gift className="w-6 h-6 text-blue-400" />
                                </div>
                                <span className="text-[10px] font-bold uppercase text-slate-500">Cadeaux</span>
                            </div>
                            <div className="w-px h-8 bg-slate-800" />
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold">
                                    %
                                </div>
                                <span className="text-[10px] font-bold uppercase text-slate-500">Promos</span>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setShowExitModal(true)}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-600 flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-20 hover:opacity-100 transition-opacity"
                >
                    <Lock className="w-3 h-3" />
                    Accès équipe
                </button>

                {showExitModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
                        <div className="bg-white text-slate-900 p-8 rounded-3xl w-full max-w-xs space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold">Confirmation PIN</h3>
                                <button onClick={() => { setShowExitModal(false); setExitPin(""); }}>
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <input
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                value={exitPin}
                                onChange={(e) => setExitPin(e.target.value)}
                                placeholder="****"
                                className="w-full text-center text-4xl font-black py-4 bg-slate-100 rounded-2xl border-none outline-none focus:ring-4 focus:ring-primary/20"
                            />
                            <button
                                onClick={verifyExitPin}
                                className="w-full bg-primary text-white py-4 rounded-2xl font-bold"
                            >
                                Déverrouiller
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-white">
            <header className="p-6 flex items-center justify-between border-b sticky top-0 bg-white/80 backdrop-blur-md z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold">W</div>
                    <h2 className="font-bold text-slate-900">Inscription Expo</h2>
                </div>
                <button onClick={() => setStep("welcome")} className="p-2 hover:bg-slate-100 rounded-full">
                    <X className="w-6 h-6 text-slate-400" />
                </button>
            </header>

            <form onSubmit={handleSubmit(preSubmit)} className="flex-1 overflow-y-auto p-6 space-y-12 no-scrollbar pb-32">
                <input type="text" {...register("honeypot")} className="hidden" tabIndex={-1} />

                <section className="space-y-6">
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black text-slate-900">1. Vos coordonnées</h3>
                        <p className="text-sm text-slate-500 font-medium">Pour vous envoyer vos récompenses par email.</p>
                    </div>

                    <div className="space-y-4">
                        <input {...register("contact")} placeholder="Prénom & Nom ⭐" className="input-field h-16 text-lg font-semibold border-2" />
                        {errors.contact && <p className="text-error text-xs font-bold">{errors.contact.message}</p>}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <input {...register("telephone")} type="tel" placeholder="Téléphone ⭐" className="input-field h-16 text-lg font-semibold border-2" />
                            <input {...register("email")} type="email" placeholder="Email ⭐" className="input-field h-16 text-lg font-semibold border-2" />
                        </div>
                        <div className="flex gap-4">
                            {errors.telephone && <p className="text-error text-xs font-bold flex-1">{errors.telephone.message}</p>}
                            {errors.email && <p className="text-error text-xs font-bold flex-1">{errors.email.message}</p>}
                        </div>

                        <input {...register("ville")} placeholder="Votre ville" className="input-field h-16 text-lg font-semibold border-2" />
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black text-slate-900">2. Votre profil</h3>
                        <p className="text-sm text-slate-500 font-medium">Sélectionnez qui vous êtes.</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {CLIENT_TYPES.map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setValue("type_client", type)}
                                className={`chip min-h-[60px] px-6 text-base font-bold rounded-2xl border-2 ${selectedType === type ? 'chip-active scale-[1.02] shadow-lg shadow-blue-200' : 'bg-white text-slate-600 border-slate-100'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                    {errors.type_client && <p className="text-error text-xs font-bold">{errors.type_client.message}</p>}
                </section>

                <section className="space-y-6">
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black text-slate-900">3. Vos intérêts</h3>
                        <p className="text-sm text-slate-500 font-medium">Ce qui vous intéresse chez nous.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {PRODUCTS.map(product => (
                            <button
                                key={product.id}
                                type="button"
                                onClick={() => {
                                    const cur = selectedProducts || [];
                                    setValue("produits", cur.includes(product.id) ? cur.filter(id => id !== product.id) : [...cur, product.id]);
                                }}
                                className={`relative h-28 rounded-3xl border-2 flex flex-col items-center justify-center gap-2 transition-all p-4 ${selectedProducts?.includes(product.id) ? 'border-primary bg-blue-50/50 scale-[1.02] shadow-md' : 'border-slate-100 bg-slate-50'}`}
                            >
                                <span className="text-4xl">{product.icon}</span>
                                <span className="text-sm font-black text-slate-900">{product.label}</span>
                                {selectedProducts?.includes(product.id) && (
                                    <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white">
                                        <ArrowRight className="w-4 h-4 rotate-[-45deg]" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                    {errors.produits && <p className="text-error text-xs font-bold">{errors.produits.message}</p>}
                </section>
            </form>

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-md border-t-2 z-30">
                <button
                    onClick={handleSubmit(preSubmit)}
                    disabled={isSubmitting}
                    className="w-full bg-slate-900 text-white py-10 rounded-[32px] font-black text-2xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            Recevoir ma récompense
                            <ArrowRight className="w-8 h-8" />
                        </>
                    )}
                </button>
            </div>

            <ConsentModal
                isOpen={isConsentOpen}
                onAccept={handleFinalSubmit}
                onReject={() => setIsConsentOpen(false)}
            />
        </div>
    );
}
