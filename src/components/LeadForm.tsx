'use client';

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { tenantConfig, LeadFormField } from '@/src/config/tenant';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from '@/src/context/LanguageContext';

// Dynamic Zod Schema Builder
const createSchema = (fields: LeadFormField[], t: (key: string) => string) => {
    const shape: any = {};
    fields.forEach((field) => {
        let validator = z.string();
        if (field.type === 'email') {
            validator = z.string().email(t('validation.emailInvalid'));
        }
        if (field.required) {
            validator = validator.min(1, `${field.label} ${t('validation.fieldRequired')}`);
        } else {
            validator = validator.optional() as any;
        }

        if (field.type === 'checkbox-group') {
            shape[field.id] = z.array(z.string()).min(field.required ? 1 : 0, t('validation.checkboxMin'));
        } else {
            shape[field.id] = validator;
        }
    });
    return z.object(shape);
};

interface LeadFormProps {
    source: 'kiosk' | 'commercial';
    onSubmitSuccess?: () => void;
}

export const LeadForm: React.FC<LeadFormProps> = ({ source, onSubmitSuccess }) => {
    const { t } = useTranslation();
    const schema = createSchema(tenantConfig.fields, t);
    type FormData = z.infer<typeof schema>;

    const methods = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: tenantConfig.fields.reduce((acc: any, field) => {
            acc[field.id] = field.type === 'checkbox-group' ? [] : '';
            return acc;
        }, {}),
    });

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        watch,
        setValue,
    } = methods;

    const onFormSubmit = async (data: FormData) => {
        try {
            const response = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    metadata: data,
                    source,
                    deviceId: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
                }),
            });

            if (!response.ok) throw new Error(t('common.error'));

            toast.success(t('common.success'));
            reset();
            if (onSubmitSuccess) onSubmitSuccess();
        } catch (error) {
            console.error(error);
            toast.error(t('common.error'));
        }
    };

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6 max-w-2xl mx-auto p-4">
                {tenantConfig.fields.map((field: LeadFormField) => (
                    <div key={field.id} className="flex flex-col gap-1.5">
                        <label htmlFor={field.id} className="font-semibold text-gray-700">
                            {field.label} {field.required && <span className="text-error">*</span>}
                        </label>

                        {field.type === 'select' ? (
                            <select
                                {...register(field.id)}
                                className="input-field"
                            >
                                <option value="">{t('common.selectPlaceholder')}</option>
                                {field.options?.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        ) : field.type === 'checkbox-group' ? (
                            <div className="grid grid-cols-2 gap-3">
                                {field.options?.map((opt: string) => {
                                    const currentValues = (watch(field.id as any) as string[]) || [];
                                    const isActive = currentValues.includes(opt);
                                    return (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => {
                                                const next = isActive
                                                    ? currentValues.filter(v => v !== opt)
                                                    : [...currentValues, opt];
                                                setValue(field.id as any, next as any, { shouldValidate: true });
                                            }}
                                            className={`chip ${isActive ? 'chip-active' : ''}`}
                                        >
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <input
                                id={field.id}
                                type={field.type}
                                placeholder={field.placeholder}
                                {...register(field.id)}
                                className="input-field"
                            />
                        )}

                        {errors[field.id] && (
                            <span className="text-error text-sm">{(errors[field.id] as any).message}</span>
                        )}
                    </div>
                ))}

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary w-full h-14 text-xl"
                    >
                        {isSubmitting ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <>
                                <Save className="w-6 h-6" />
                                {t('common.save')}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </FormProvider>
    );
};
