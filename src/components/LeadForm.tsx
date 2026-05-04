'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
    const baseInput = `w-full bg-slate-50 dark:bg-white/5 border-2 ${hasError ? 'border-red-300 dark:border-rose-500/50' : 'border-slate-100 dark:border-white/10'} px-4 py-3.5 rounded-2xl font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-600 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-white/10 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600`;

    return (
        <div className={`flex flex-col gap-1.5 ${field.colSpan === 2 ? 'col-span-2' : 'col-span-2 md:col-span-1'}`}>
            <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">
                {field.label}
                {field.required && <span className="text-rose-500 ml-1">*</span>}
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
                                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${value === opt.value 
                                        ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white shadow-md shadow-indigo-200 dark:shadow-none' 
                                        : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/30'}`}
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
                                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all flex items-center gap-1.5 ${active 
                                                ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white shadow-md shadow-indigo-200 dark:shadow-none' 
                                                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/30'}`}
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
                <span className="text-rose-500 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 pl-1 mt-1">
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
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savedOffline, setSavedOffline] = useState(false);

    const { register, handleSubmit, control, reset, formState: { errors, isDirty } } = useForm<FormValues>({
        defaultValues,
    });

    // 🛡️ Data Loss Prevention: Warning when offline with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!navigator.onLine && isDirty) {
                e.preventDefault();
                e.returnValue = ''; // Standard for modern browsers
                return '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const onFormSubmit = async (data: FormValues) => {
        // ── EDIT PATH (leadId present) ──
        if (leadId) {
            setIsSubmitting(true);
            try {
                // Try updating locally first (Offline-First)
                const { getLead, updateLead } = await import('@/src/db/client');
                const localRecord = await getLead(leadId);

                if (localRecord) {
                    // Update in IndexedDB
                    await updateLead(leadId, {
                        payload: { ...localRecord.payload, ...data }, // merge changes
                        sync_status: 'pending'
                    });
                    
                    toast.success(navigator.onLine ? t('common.success') : t('offline.savedLocally'), { icon: '📡' });
                    onSubmitSuccess?.();
                    
                    // Trigger sync if online
                    if (navigator.onLine && typeof window !== 'undefined') {
                        window.dispatchEvent(new Event('online'));
                    }
                    return;
                }

                // If not found locally, and offline -> block
                if (!navigator.onLine) {
                    toast.error(t('offline.workingOffline'));
                    return;
                }

                // Online fallback (for server-synced leads handled by admin/legacy)
                // 🛡️ SECURITY: Strip core system fields that shouldn't be part of metadata updates
                const { 
                    id: _id, 
                    created_at: _ca, 
                    created_by: _cb, 
                    created_by_name: _cbn, 
                    updated_at: _ua,
                    tenant_id: _tid,
                    team_id: _tmid,
                    sync_status: _ss,
                    status: _s,
                    source: _src,
                    ...cleanData 
                } = data;

                const res = await fetch(`/api/leads/${leadId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cleanData),
                });
                if (res.status === 409) {
                    const err = await res.json();
                    toast.error(err.message || t('intelligence.duplicateContact'));
                    return;
                }
                if (!res.ok) throw new Error();
                toast.success(t('common.success'));
                onSubmitSuccess?.();
            } catch (err: any) {
                toast.error(err.message || t('common.error'));
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
            created_at: new Date().toISOString(), // 🕒 Set timestamp immediately for offline accuracy
            deviceId: typeof window !== 'undefined' ? (window.navigator.userAgent.slice(0, 100)) : 'unknown',
            // Agent attribution context (both embedded in metadata for offline records)
            ...(agentId ? { agent_id: agentId } : {}),
            ...(locationContext ? { location_context: locationContext } : {}),
        };

        // STEP 1: Save to IndexedDB immediately — this is the source of truth
        const localRecord = await saveLeadOffline(bodyObj, source === 'kiosk' ? 'kiosk' : 'commercial');

        // STEP 2: Show success and lock navigation UI
        toast.success(t('offline.savedLocally'), {
            icon: '📡',
            duration: 4000
        });
        
        reset(); // Clear form
        setSavedOffline(true);
        onSubmitSuccess?.();
        setIsSubmitting(false);

        // Transition away without reloading the page
        if (source === 'commercial') {
            router.push('/dashboard');
        }

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
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400 opacity-50" />
            </div>
        );
    }

    if (!config) {
        return <p className="text-center text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-widest py-8">Formulaire non configuré.</p>;
    }

    return (
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(onFormSubmit)(e); }} className="space-y-12 transition-all duration-300">
            {/* Offline status banner */}
            {typeof window !== 'undefined' && !navigator.onLine && (
                <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-400 rounded-[20px] px-5 py-4 text-xs font-black uppercase tracking-widest shadow-sm">
                    <WifiOff className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>{t('offline.workingOffline')}</span>
                </div>
            )}

            {/* Render all sections from all pages — agent form is single-scroll */}
            {config.pages.flatMap(page => page.sections).map((section, sIdx) => (
                <div key={section.id || sIdx} className="space-y-6">
                    <div className="border-b border-slate-100 dark:border-white/5 pb-3">
                        <h4 className="font-black text-slate-800 dark:text-white text-[11px] uppercase tracking-[0.2em]">{section.title}</h4>
                        {section.description && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-bold uppercase tracking-widest">{section.description}</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                className="w-full bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
            >
                {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> {t('common.saving')}</>
                ) : (
                    <><Save className="w-5 h-5" /> {t('common.save')}</>
                )}
            </button>
        </form>
    );
};
