"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    Save,
    Gift,
    Mail,
    FileText,
    Tag,
    Check
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";

const rewardSchema = z.object({
    type_client: z.string({ required_error: "Sélectionnez une cible" }),
    reward_type: z.enum(["catalogue_pdf", "promo_code", "guide_technique", "cadeau_physique"], {
        required_error: "Sélectionnez un type de récompense"
    }),
    title: z.string().min(3, "Le titre est obligatoire (min 3 car.)"),
    description: z.string().optional(),
    value: z.string().min(1, "La valeur est obligatoire (URL, Code, etc.)"),
    produit_filter: z.array(z.string()).optional(),
    active: z.boolean().default(true),
});

type RewardFormValues = z.infer<typeof rewardSchema>;

const CLIENT_TYPES = [
    "ALL", "Promoteur", "Hôtel", "Architecte", "Particulier", "Revendeur", "Installateur/Plombier", "Autre"
];

const REWARD_TYPES = [
    { id: "catalogue_pdf", label: "Catalogue PDF", icon: <Mail />, desc: "Envoyé par email" },
    { id: "promo_code", label: "Code Promo", icon: <Tag />, desc: "Affiché à l'écran" },
    { id: "guide_technique", label: "Guide Tech", icon: <FileText />, desc: "Lien PDF ciblé" },
    { id: "cadeau_physique", label: "Cadeau", icon: <Gift />, desc: "Bon à présenter" },
];

const PRODUCTS = [
    { id: "baignoire", label: "Baignoire" },
    { id: "baignoire_tablier", label: "Baignoire avec tablier" },
    { id: "jacuzzi", label: "Jacuzzi" },
];

export default function NewRewardPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RewardFormValues>({
        resolver: zodResolver(rewardSchema),
        defaultValues: {
            active: true,
            produit_filter: [],
        }
    });

    const selectedTarget = watch("type_client");
    const selectedRewardType = watch("reward_type");
    const selectedProducts = watch("produit_filter");
    const isActive = watch("active");

    const onSubmit = async (data: RewardFormValues) => {
        setIsSubmitting(true);
        try {
            const response = await fetch("/api/rewards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                toast.success("Récompense créée avec succès");
                router.push("/admin/rewards");
            } else {
                throw new Error();
            }
        } catch (error) {
            toast.error("Erreur de création");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col pt-4 bg-slate-50">
            <header className="px-6 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-black text-slate-900">Nouvelle récompense</h1>
                </div>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="px-6 pb-32 space-y-8 overflow-y-auto no-scrollbar">
                {/* Section 1: Cible */}
                <section className="space-y-4">
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">1. Profil Cible ⭐</h2>
                    <div className="flex flex-wrap gap-2">
                        {CLIENT_TYPES.map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setValue("type_client", type)}
                                className={`chip text-[11px] font-bold ${selectedTarget === type ? 'chip-active' : 'bg-white'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                    {errors.type_client && <p className="text-error text-xs font-bold">{errors.type_client.message}</p>}
                </section>

                {/* Section 2: Type de récompense */}
                <section className="space-y-4">
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">2. Type de récompense ⭐</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {REWARD_TYPES.map(type => (
                            <button
                                key={type.id}
                                type="button"
                                onClick={() => setValue("reward_type", type.id as any)}
                                className={`p-4 rounded-2xl border-2 flex flex-col items-start gap-1 transition-all ${selectedRewardType === type.id ? 'border-primary bg-blue-50/50' : 'bg-white border-gray-100'}`}
                            >
                                <div className={`${selectedRewardType === type.id ? 'text-primary' : 'text-gray-400'}`}>
                                    {type.icon}
                                </div>
                                <span className="font-bold text-sm text-slate-900 mt-1">{type.label}</span>
                                <span className="text-[10px] text-gray-400 font-medium">{type.desc}</span>
                            </button>
                        ))}
                    </div>
                    {errors.reward_type && <p className="text-error text-xs font-bold">{errors.reward_type.message}</p>}
                </section>

                {/* Section 3: Contenu */}
                <section className="space-y-4">
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">3. Contenu de la récompense</h2>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Titre affiché ⭐</label>
                            <input {...register("title")} placeholder="Ex: Catalogue Wasla 2026" className="input-field h-14 font-semibold" />
                            {errors.title && <p className="text-error text-xs font-bold">{errors.title.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Description (optionnelle)</label>
                            <textarea {...register("description")} placeholder="Courte description pour le prospect..." className="input-field min-h-[80px] py-3" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Valeur ⭐ (URL PDF ou Code)</label>
                            <input {...register("value")} placeholder="https://... ou BATI2026" className="input-field h-14 font-bold text-primary" />
                            {errors.value && <p className="text-error text-xs font-bold">{errors.value.message}</p>}
                        </div>
                    </div>
                </section>

                {/* Section 4: Filtre Produits */}
                <section className="space-y-4">
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">4. Filtre Produits (Optionnel)</h2>
                    <div className="flex flex-wrap gap-2">
                        {PRODUCTS.map(product => (
                            <button
                                key={product.id}
                                type="button"
                                onClick={() => {
                                    const cur = selectedProducts || [];
                                    setValue("produit_filter", cur.includes(product.id) ? cur.filter(p => p !== product.id) : [...cur, product.id]);
                                }}
                                className={`chip text-[11px] font-bold ${selectedProducts?.includes(product.id) ? 'chip-active' : 'bg-white'}`}
                            >
                                {product.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-[10px] text-gray-400 italic">Si aucun produit n'est sélectionné, la récompense s'applique à tous les produits.</p>
                </section>

                {/* Section 5: Statut */}
                <section className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                    <div>
                        <p className="font-bold text-slate-900">Activer la récompense</p>
                        <p className="text-xs text-gray-500">Sera distribuée si les critères correspondent</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setValue("active", !isActive)}
                        className={`w-14 h-8 rounded-full transition-all relative ${isActive ? 'bg-success' : 'bg-gray-200'}`}
                    >
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${isActive ? 'right-1' : 'left-1'}`} />
                    </button>
                </section>

                {/* Footer Actions */}
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t flex gap-4 z-20">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary w-full shadow-lg shadow-blue-100 disabled:opacity-50 h-16 text-lg font-black uppercase tracking-widest"
                    >
                        {isSubmitting ? (
                            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Créer la récompense
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
