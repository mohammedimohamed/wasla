'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from '@/src/context/LanguageContext';
import { useFormConfig, FormField, FormConfig } from '@/src/hooks/useFormConfig';

type FormValues = Record<string, any>;

interface LeadFormProps {
    source: 'kiosk' | 'commercial';
    onSubmitSuccess?: () => void;
    leadId?: string;
    defaultValues?: Record<string, any>;
}

function FieldWidget({ field, register, control, errors }: {
    field: FormField;
    register: any;
    control: any;
    errors: any;
}) {
    if (!register) return null;
    const hasError = !!errors[field.name];
    const baseInput = `w-full bg-slate-50 border-2 ${hasError ? 'border-red-300' : 'border-slate-100'} px-4 py-3.5 rounded-2xl font-medium text-slate-900 outline-none focus:border-primary focus:bg-white transition-all placeholder:text-slate-300`;

    return (
        <div className={`flex flex-col gap-1.5 ${field.colSpan === 2 ? 'col-span-2' : 'col-span-1'}`}>
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
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
                    rows={3}
                    className={`${baseInput} resize-none`}
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
                                    key={opt.value}
                                    type="button"
                                    onClick={() => onChange(opt.value)}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all ${value === opt.value ? 'bg-primary border-primary text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
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
                    rules={{
                        required: field.required,
                        validate: field.minItems
                            ? (v: string[]) => (v || []).length >= (field.minItems ?? 1) || 'Sélectionnez au moins un élément'
                            : undefined,
                    }}
                    render={({ field: { onChange, value } }) => {
                        const toggle = (val: string) => {
                            const curr = value || [];
                            onChange(curr.includes(val) ? curr.filter((x: string) => x !== val) : [...curr, val]);
                        };
                        return (
                            <div className="flex flex-wrap gap-2">
                                {field.options?.map(opt => {
                                    const active = (value || []).includes(opt.value);
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => toggle(opt.value)}
                                            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center gap-1.5 ${active ? 'bg-primary border-primary text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
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
                <span className="text-red-500 text-xs font-bold flex items-center gap-1 pl-1">
                    <AlertCircle className="w-3 h-3" />
                    {(errors[field.name]?.message as string) || 'Champ requis'}
                </span>
            )}
        </div>
    );
}

export const LeadForm: React.FC<LeadFormProps> = ({ source, onSubmitSuccess, leadId, defaultValues }) => {
    const { t } = useTranslation();
    const { config, isLoading } = useFormConfig();

    const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
        defaultValues
    });

    const onFormSubmit = async (data: FormValues) => {
        try {
            const url = leadId ? `/api/leads/${leadId}` : '/api/leads';
            const method = leadId ? 'PUT' : 'POST';
            const bodyObj = leadId
                ? data
                : {
                    // ✅ FIX: Spread form fields directly at the top level.
                    // The API destructures { source, deviceId, ...customFields } from this body,
                    // so customFields will be the flat form data — no double-nesting.
                    ...data,
                    source,
                    deviceId: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
                };

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyObj),
            });
            if (!response.ok) throw new Error(t('common.error'));
            toast.success(t('common.success'));
            if (!leadId) reset(); // don't wipe out edit form on save
            onSubmitSuccess?.();
        } catch (error) {
            toast.error(t('common.error'));
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-16">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            </div>
        );
    }

    if (!config) {
        return <p className="text-center text-slate-400 text-sm font-medium py-8">Formulaire non configuré.</p>;
    }

    return (
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-10">
            {/* Render all sections from all pages — Commercial form is single-scroll */}
            {config.pages.flatMap(page => page.sections).map((section, sIdx) => (
                <div key={section.id || sIdx} className="space-y-5">
                    <div className="border-b border-slate-100 pb-3">
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">{section.title}</h4>
                        {section.description && <p className="text-xs text-slate-400 mt-0.5">{section.description}</p>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {section.fields.map(field => (
                            <FieldWidget
                                key={field.name}
                                field={field}
                                register={register}
                                control={control}
                                errors={errors}
                            />
                        ))}
                    </div>
                </div>
            ))}

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-70"
            >
                {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
                ) : (
                    <><Save className="w-4 h-4" /> {t('common.save')}</>
                )}
            </button>
        </form>
    );
};
