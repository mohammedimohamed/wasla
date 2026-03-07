'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '@/src/locales/en.json';
import fr from '@/src/locales/fr.json';
import ar from '@/src/locales/ar.json';

type Locale = 'en' | 'fr' | 'ar';
type Translations = typeof en;

interface LanguageContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Locale, any> = { en, fr, ar };

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [locale, setLocale] = useState<Locale>('en');

    // Load from localStorage if available
    useEffect(() => {
        const savedLocale = localStorage.getItem('wasla-locale') as Locale;
        if (savedLocale && ['en', 'fr', 'ar'].includes(savedLocale)) {
            setLocale(savedLocale);
        }
    }, []);

    const handleSetLocale = (newLocale: Locale) => {
        setLocale(newLocale);
        localStorage.setItem('wasla-locale', newLocale);
        document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = newLocale;
    };

    const t = (key: string): string => {
        const keys = key.split('.');
        let result = translations[locale];

        for (const k of keys) {
            if (result && typeof result === 'object') {
                result = result[k];
            } else {
                // Fallback to English if key missing in current locale
                return getFallbackTranslation(key);
            }
        }

        return result || key;
    };

    const getFallbackTranslation = (key: string): string => {
        const keys = key.split('.');
        let result = translations['en'];
        for (const k of keys) {
            if (result && typeof result === 'object') result = result[k];
            else return key;
        }
        return result || key;
    };

    return (
        <LanguageContext.Provider value={{ locale, setLocale: handleSetLocale, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }
    return context;
};
