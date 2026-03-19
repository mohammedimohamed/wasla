'use client';

import { useState, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Type definitions — mirror the DB schema structure
// ─────────────────────────────────────────────────────────────────────────────

export interface FormFieldOption {
    value: string;
    label: string;
    icon?: string;
}

export type FormFieldType =
    | 'text' | 'tel' | 'email' | 'textarea'
    | 'select' | 'multiselect' | 'chip-group';

export interface FormField {
    name: string;
    label: string;
    type: FormFieldType;
    placeholder?: string;
    options?: FormFieldOption[];
    required?: boolean;
    minItems?: number;
    colSpan?: 1 | 2;
    showInTable?: boolean;
    tableWidth?: number;
    icon?: string;
    weight?: number;
    isSensitive?: boolean;
}

export interface FormSection {
    id: string;
    title: string;
    description?: string;
    fields: FormField[];
}

export interface FormPage {
    id: string;
    title: string;
    sections: FormSection[];
}

export interface FormConfig {
    version: number;
    _version?: number;
    name: string;
    pages: FormPage[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers (equivalent to the static formSchema.ts utilities)
// ─────────────────────────────────────────────────────────────────────────────

export function getAllFields(config: FormConfig): FormField[] {
    return config.pages.flatMap(p => p.sections.flatMap(s => s.fields));
}

export function getTableFields(config: FormConfig): FormField[] {
    return getAllFields(config).filter(f => f.showInTable === true);
}

export function getRequiredFieldNames(config: FormConfig): string[] {
    return getAllFields(config).filter(f => f.required).map(f => f.name);
}

export function getArrayFieldNames(config: FormConfig): string[] {
    return getAllFields(config)
        .filter(f => f.type === 'multiselect' || f.type === 'chip-group')
        .map(f => f.name);
}

// ─────────────────────────────────────────────────────────────────────────────
// React hook — fetches and caches the DB schema
// ─────────────────────────────────────────────────────────────────────────────

interface UseFormConfigReturn {
    config: FormConfig | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useFormConfig(): UseFormConfigReturn {
    const [config, setConfig] = useState<FormConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setError(null);

        fetch('/api/settings/form')
            .then(res => {
                if (!res.ok) throw new Error(`Form config fetch failed: ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (!cancelled) setConfig(data.config as FormConfig);
            })
            .catch(err => {
                if (!cancelled) setError(err.message);
                console.error('[useFormConfig]', err);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => { cancelled = true; };
    }, [tick]);

    return {
        config,
        isLoading,
        error,
        refetch: () => setTick(t => t + 1),
    };
}
