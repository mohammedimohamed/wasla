'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Loader2, Save, AlertCircle, WifiOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from '@/src/context/LanguageContext';
import { useFormConfig, FormField, FormConfig } from '@/src/hooks/useFormConfig';
import { saveLeadOffline, markLeadSynced, markLeadFailed } from '@/lib/offlineQueue';

type FormValues = Record<string, any>;

interface LeadFormProps {
    source: 'kiosk' | 'commercial';
    onSubmitSuccess?: () => void;
    leadId?: string;
    defaultValues?: Record<string, any>;
    /** Agent's session userId — stamped into offline metadata for attribution */
    agentId?: string;
    /** Optional free-text location context ("Stand B3", "Hall 5") */
    locationContext?: string;
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

export const LeadForm: React.FC<LeadFormProps> = ({
    source,
    onSubmitSuccess,
    leadId,
    defaultValues,
    agentId,
    locationContext,
}) => {
    const { t } = useTranslation();
    const { config, isLoading } = useFormConfig();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savedOffline, setSavedOffline] = useState(false);

    const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
        defaultValues,
    });

    const onFormSubmit = async (data: FormValues) => {
        // ── EDIT PATH (leadId present) — stays online-only (admin panel only) ──
        if (leadId) {
            setIsSubmitting(true);
            try {
                const res = await fetch(`/api/leads/${leadId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                if (res.status === 409) {
                    const err = await res.json();
                    toast.error(err.message || t('intelligence.duplicateContact'));
                    return;
                }
                if (!res.ok) throw new Error();
                toast.success(t('common.success'));
                onSubmitSuccess?.();
            } catch {
                toast.error(t('common.error'));
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        // ── CREATE PATH — Offline-first for ALL sources (kiosk + commercial agent) ──
        setIsSubmitting(true);
        setSavedOffline(false);

        const bodyObj = {
            ...data,
            source,
            deviceId: typeof window !== 'undefined' ? (window.navigator.userAgent.slice(0, 100)) : 'unknown',
            // Agent attribution context (both embedded in metadata for offline records)
            ...(agentId ? { agent_id: agentId } : {}),
            ...(locationContext ? { location_context: locationContext } : {}),
        };

        // STEP 1: Save to IndexedDB immediately — this is the source of truth
        const localRecord = await saveLeadOffline(bodyObj, source === 'kiosk' ? 'kiosk' : 'commercial');

        // STEP 2: Callback immediately — don't block the agent
        toast.success(t('offline.savedLocally'));
        reset();
        setSavedOffline(true);
        onSubmitSuccess?.();
        setIsSubmitting(false);

        // STEP 3: Background POSTto the real API
        (async () => {
            if (!navigator.onLine) return; // SyncManager handles this on restoration

            try {
                const res = await fetch('/api/leads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...bodyObj, client_uuid: localRecord.client_uuid }),
                });

                if (res.status === 409) {
                    // Duplicate — server already has it; mark local as synced
                    await markLeadSynced(localRecord.client_uuid);
                    return;
                }

                if (res.ok) {
                    await markLeadSynced(localRecord.client_uuid);
                } else {
                    await markLeadFailed(localRecord.client_uuid, `HTTP ${res.status}`);
                }
            } catch {
                // SyncManager will retry via the 'online' event or 60-s poll
            }
        })();
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
            {/* Offline status banner */}
            {typeof window !== 'undefined' && !navigator.onLine && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-4 py-3 text-sm font-bold">
                    <WifiOff className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>{t('offline.workingOffline')}</span>
                </div>
            )}

            {/* Render all sections from all pages — agent form is single-scroll */}
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
                    <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.saving')}</>
                ) : (
                    <><Save className="w-4 h-4" /> {t('common.save')}</>
                )}
            </button>
        </form>
    );
};
