"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    Save,
    User,
    Building,
    Phone,
    Mail,
    MapPin,
    Briefcase,
    Check
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";

const leadSchema = z.object({
    societe: z.string().optional(),
    contact: z.string().min(2, "Le nom du contact est obligatoire"),
    telephone: z.string().optional(),
    email: z.string().email("Format d'email invalide").optional().or(z.literal("")),
    ville: z.string().optional(),
    fonction: z.string().optional(),
    type_client: z.string({ required_error: "Sélectionnez un type de client" }),
    produits: z.array(z.string()).min(1, "Sélectionnez au moins un produit"),
    projet: z.string().optional(),
    quantite: z.string().optional(),
    delai: z.string().optional(),
    budget: z.string().optional(),
    actions: z.array(z.string()).optional(),
    note: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadSchema>;

const CLIENT_TYPES = [
    "Promoteur", "Hôtel", "Architecte", "Particulier", "Revendeur", "Installateur/Plombier", "Autre"
];

const PRODUCTS = [
    { id: "baignoire", label: "Baignoire", icon: "🛁" },
    { id: "baignoire_tablier", label: "Baignoire avec tablier", icon: "🛁" },
    { id: "jacuzzi", label: "Jacuzzi", icon: "💦" },
];

const ACTIONS = [
    "Envoyer devis", "Envoyer catalogue", "RDV", "Rappel téléphonique"
];

export default function NewLeadPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<LeadFormValues>({
        resolver: zodResolver(leadSchema),
        defaultValues: {
            produits: [],
            actions: [],
        }
    });

    const selectedType = watch("type_client");
    const selectedProducts = watch("produits");
    const selectedActions = watch("actions");

    const toggleProduct = (productId: string) => {
        const current = selectedProducts || [];
        if (current.includes(productId)) {
            setValue("produits", current.filter(id => id !== productId));
        } else {
            setValue("produits", [...current, productId]);
        }
    };

    const toggleAction = (action: string) => {
        const current = selectedActions || [];
        if (current.includes(action)) {
            setValue("actions", current.filter(a => a !== action));
        } else {
            setValue("actions", [...current, action]);
        }
    };

    const onSubmit = async (data: LeadFormValues) => {
        setIsSubmitting(true);
        try {
            // API call placeholder
            console.log("Submitting lead:", data);

            const response = await fetch("/api/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    source: "commercial",
                    id: crypto.randomUUID(),
                    created_at: new Date().toISOString(),
                    commercial: localStorage.getItem("sales_name"),
                    consent_given: 1,
                }),
            });

            if (response.ok) {
                toast.success(navigator.onLine ? "✅ Lead enregistré" : "⏳ Sauvegardé localement");
                router.push("/dashboard");
            } else {
                throw new Error("Erreur lors de l'enregistrement");
            }
        } catch (error) {
            toast.error("Erreur d'enregistrement");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col pt-4">
            <header className="px-4 mb-6 flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold">Nouvelle fiche prospect</h1>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="px-4 pb-28 space-y-8 no-scrollbar overflow-y-auto">
                {/* Section 1: Coordonnées */}
                <section className="space-y-4">
                    <h2 className="font-semibold text-gray-500 uppercase text-xs tracking-wider">Session 1 — Coordonnées</h2>
                    <div className="grid gap-4">
                        <div className="relative">
                            <Building className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
                            <input {...register("societe")} placeholder="Société" className="input-field pl-12" />
                        </div>
                        <div className="relative">
                            <User className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
                            <input {...register("contact")} placeholder="Contact ⭐" className={`input-field pl-12 ${errors.contact ? 'border-error' : ''}`} />
                            {errors.contact && <p className="text-error text-xs mt-1">{errors.contact.message}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <Phone className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
                                <input {...register("telephone")} type="tel" placeholder="Téléphone" className="input-field pl-12" />
                            </div>
                            <div className="relative">
                                <Mail className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
                                <input {...register("email")} type="email" placeholder="Email" className="input-field pl-12" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <MapPin className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
                                <input {...register("ville")} placeholder="Ville" className="input-field pl-12" />
                            </div>
                            <div className="relative">
                                <Briefcase className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
                                <input {...register("fonction")} placeholder="Fonction" className="input-field pl-12" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 2: Type de Client */}
                <section className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-semibold text-gray-500 uppercase text-xs tracking-wider">Section 2 — Type de Client ⭐</h2>
                        {errors.type_client && <span className="text-error text-[10px] font-bold">OBLIGATOIRE</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {CLIENT_TYPES.map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setValue("type_client", type)}
                                className={`chip ${selectedType === type ? 'chip-active' : ''}`}
                            >
                                {type}
                                {selectedType === type && <Check className="ml-2 w-4 h-4" />}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Section 3: Produits d'intérêt */}
                <section className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-semibold text-gray-500 uppercase text-xs tracking-wider">Section 3 — Produits d'intérêt ⭐</h2>
                        {errors.produits && <span className="text-error text-[10px] font-bold">MIN 1</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {PRODUCTS.map(product => (
                            <button
                                key={product.id}
                                type="button"
                                onClick={() => toggleProduct(product.id)}
                                className={`card-product ${selectedProducts?.includes(product.id) ? 'card-product-active' : ''}`}
                            >
                                <span className="text-2xl">{product.icon}</span>
                                <span className="text-[10px] font-bold leading-tight">{product.label}</span>
                                {selectedProducts?.includes(product.id) && (
                                    <div className="absolute top-1 right-1 bg-primary text-white rounded-full p-0.5">
                                        <Check className="w-3 h-3" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Section 4: Détails Projet */}
                <section className="space-y-4">
                    <h2 className="font-semibold text-gray-500 uppercase text-xs tracking-wider">Section 4 — Détails Projet</h2>
                    <div className="space-y-4">
                        <textarea {...register("projet")} placeholder="Description du projet..." className="input-field min-h-[100px] py-3 h-auto" />
                        <div className="grid grid-cols-2 gap-4">
                            <input {...register("quantite")} placeholder="Quantité estimée" className="input-field" />
                            <input {...register("delai")} placeholder="Délai" className="input-field" />
                        </div>
                        <input {...register("budget")} placeholder="Budget" className="input-field" />
                    </div>
                </section>

                {/* Section 5: Actions à Suivre */}
                <section className="space-y-4">
                    <h2 className="font-semibold text-gray-500 uppercase text-xs tracking-wider">Section 5 — Actions à Suivre</h2>
                    <div className="grid grid-cols-2 gap-2">
                        {ACTIONS.map(action => (
                            <button
                                key={action}
                                type="button"
                                onClick={() => toggleAction(action)}
                                className={`chip text-[11px] h-12 ${selectedActions?.includes(action) ? 'chip-active' : ''}`}
                            >
                                {action}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Section 6: Notes */}
                <section className="space-y-4">
                    <h2 className="font-semibold text-gray-500 uppercase text-xs tracking-wider">Section 6 — Notes</h2>
                    <textarea {...register("note")} placeholder="Remarques libres..." className="input-field min-h-[120px] py-3 h-auto" />
                </section>

                {/* Footer Actions */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t flex gap-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary w-full shadow-lg shadow-blue-100 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Enregistrer
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
