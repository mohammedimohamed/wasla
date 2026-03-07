"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Save, Check } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import {
    leadFormSchema,
    getAllFields,
    getArrayFieldNames,
    type FormField,
} from "@/src/config/formSchema";

// ─────────────────────────────────────────────────────────────────────────────
// 🏗️ DYNAMIC ZOD SCHEMA — mirrored from new/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
const buildZodSchema = () => {
    const shape: Record<string, z.ZodTypeAny> = {};
    getAllFields(leadFormSchema).forEach(field => {
        if (field.type === 'multiselect' || field.type === 'chip-group') {
            const arr = z.array(z.string());
            shape[field.name] = field.required
                ? arr.min(field.minItems ?? 1, `Sélectionnez au moins ${field.minItems ?? 1} option(s)`)
                : arr.optional().default([]);
        } else if (field.type === 'email') {
            const emailSchema = z.string().email("Format d'email invalide");
            shape[field.name] = field.required
                ? emailSchema
                : emailSchema.optional().or(z.literal(""));
        } else {
            const strSchema = z.string();
            shape[field.name] = field.required
                ? strSchema.min(2, `${field.label} est obligatoire`)
                : strSchema.optional();
        }
    });
    return z.object(shape);
};

const dynamicSchema = buildZodSchema();
type LeadFormValues = z.infer<typeof dynamicSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 🔧 DYNAMIC ICON COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function FieldIcon({ name }: { name?: string }) {
    if (!name) return null;
    const IconComponent = (LucideIcons as any)[name];
    if (!IconComponent) return null;
    return <IconComponent className="absolute left-4 top-4 text-gray-400 w-5 h-5" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// 🧱 DYNAMIC FIELD RENDERER (same as new/page.tsx)
// ─────────────────────────────────────────────────────────────────────────────
function DynamicField({ field, register, watch, setValue, errors }: {
    field: FormField; register: any; watch: any; setValue: any; errors: any;
}) {
    const currentValue = watch(field.name);
    const hasError = !!errors[field.name];

    const toggleChip = (val: string) => {
        const current: string[] = currentValue || [];
        if (current.includes(val)) {
            setValue(field.name, current.filter(v => v !== val), { shouldValidate: true });
        } else {
            setValue(field.name, [...current, val], { shouldValidate: true });
        }
    };

    switch (field.type) {
        case 'text': case 'tel': case 'email':
            return (
                <div className={`relative ${field.colSpan === 2 ? 'col-span-2' : 'col-span-1'}`}>
                    {field.icon && <FieldIcon name={field.icon} />}
                    <input {...register(field.name)} type={field.type}
                        placeholder={field.placeholder || field.label}
                        className={`input-field ${field.icon ? 'pl-12' : ''} ${hasError ? 'border-red-400' : ''}`}
                    />
                    {hasError && <p className="text-red-500 text-xs mt-1">{errors[field.name]?.message}</p>}
                </div>
            );
        case 'textarea':
            return (
                <div className={`${field.colSpan === 2 ? 'col-span-2' : 'col-span-1'}`}>
                    <textarea {...register(field.name)} placeholder={field.placeholder || field.label}
                        className={`input-field min-h-[100px] py-3 h-auto ${hasError ? 'border-red-400' : ''}`}
                    />
                    {hasError && <p className="text-red-500 text-xs mt-1">{errors[field.name]?.message}</p>}
                </div>
            );
        case 'select':
            return (
                <div className="col-span-2 flex flex-wrap gap-2">
                    {field.options?.map(opt => (
                        <button key={opt.value} type="button"
                            onClick={() => setValue(field.name, opt.value, { shouldValidate: true })}
                            className={`chip ${currentValue === opt.value ? 'chip-active' : ''}`}
                        >
                            {opt.label}
                            {currentValue === opt.value && <Check className="ml-2 w-4 h-4" />}
                        </button>
                    ))}
                    {hasError && <p className="text-red-500 text-xs w-full mt-1">{errors[field.name]?.message}</p>}
                </div>
            );
        case 'multiselect':
            return (
                <div className="col-span-2 grid grid-cols-3 gap-3">
                    {field.options?.map(opt => {
                        const selected = (currentValue || []).includes(opt.value);
                        return (
                            <button key={opt.value} type="button" onClick={() => toggleChip(opt.value)}
                                className={`card-product relative ${selected ? 'card-product-active' : ''}`}
                            >
                                {opt.icon && <span className="text-2xl">{opt.icon}</span>}
                                <span className="text-[10px] font-bold leading-tight text-center">{opt.label}</span>
                                {selected && (
                                    <div className="absolute top-1 right-1 bg-primary text-white rounded-full p-0.5">
                                        <Check className="w-3 h-3" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                    {hasError && <p className="text-red-500 text-xs col-span-3 mt-1">{errors[field.name]?.message}</p>}
                </div>
            );
        case 'chip-group':
            return (
                <div className="col-span-2 grid grid-cols-2 gap-2">
                    {field.options?.map(opt => (
                        <button key={opt.value} type="button" onClick={() => toggleChip(opt.value)}
                            className={`chip text-[11px] h-12 ${(currentValue || []).includes(opt.value) ? 'chip-active' : ''}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            );
        default:
            return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 📄 PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function EditLeadPage() {
    const router = useRouter();
    const { id } = useParams();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [leadSource, setLeadSource] = useState("");
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);

    const arrayFields = getArrayFieldNames(leadFormSchema);
    const defaultValues: Record<string, any> = {};
    arrayFields.forEach(name => { defaultValues[name] = []; });

    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<LeadFormValues>({
        resolver: zodResolver(dynamicSchema),
        defaultValues,
    });

    useEffect(() => {
        const init = async () => {
            // 1. Fetch session
            const authRes = await fetch('/api/auth');
            if (authRes.ok) {
                const authData = await authRes.json();
                setUserRole(authData.user?.role || null);
                setUserName(authData.user?.name || null);
            }
            // 2. Fetch lead
            try {
                const res = await fetch(`/api/leads/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    const lead = data.lead;
                    setLeadSource(lead.source || "");

                    // Build reset object: for each schema field, map lead property
                    const resetData: Record<string, any> = {};
                    getAllFields(leadFormSchema).forEach(field => {
                        const raw = lead[field.name];
                        if (field.type === 'multiselect' || field.type === 'chip-group') {
                            resetData[field.name] = Array.isArray(raw) ? raw : [];
                        } else {
                            resetData[field.name] = raw ?? "";
                        }
                    });
                    reset(resetData);
                }
            } catch (err) {
                toast.error("Erreur de chargement");
            } finally {
                setInitialLoading(false);
            }
        };
        init();
    }, [id]);

    const onSubmit = async (data: LeadFormValues) => {
        setIsSubmitting(true);
        try {
            const isQualified = (leadSource === "kiosk" || leadSource === "qrcode");
            const response = await fetch(`/api/leads/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    qualified_by: isQualified ? (userName || "Manager") : null,
                }),
            });
            if (response.ok) {
                toast.success("Mise à jour réussie ✅");
                router.push(`/leads/${id}`);
            } else {
                throw new Error("Erreur de mise à jour");
            }
        } catch (error) {
            toast.error("Erreur de sauvegarde");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (initialLoading) return (
        <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="flex-1 flex flex-col pt-4">
            <header className="px-4 mb-6 flex items-center gap-4">
                <button onClick={() => router.push(`/leads/${id}`)} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-xl font-bold">Modifier le lead</h1>
                    <p className="text-xs text-gray-400">{leadFormSchema.name}</p>
                </div>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="px-4 pb-28 space-y-8 no-scrollbar overflow-y-auto">
                {leadFormSchema.sections.map((section, sIdx) => (
                    <section key={sIdx} className="space-y-4">
                        <div>
                            <h2 className="font-semibold text-gray-500 uppercase text-xs tracking-wider">
                                {section.title}
                            </h2>
                            {section.description && (
                                <p className="text-xs text-gray-400 mt-0.5">{section.description}</p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {section.fields.map(field => (
                                <DynamicField
                                    key={field.name}
                                    field={field}
                                    register={register}
                                    watch={watch}
                                    setValue={setValue}
                                    errors={errors}
                                />
                            ))}
                        </div>
                    </section>
                ))}

                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t flex gap-4">
                    <button type="submit" disabled={isSubmitting}
                        className="btn-primary w-full shadow-lg shadow-blue-100 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Mettre à jour
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
