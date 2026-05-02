'use client';

/**
 * app/page.tsx — Phase 1
 *
 * Renders the existing home page content via <AppShell />.
 * In Phase 3 the children will be replaced with modal views controlled by AppShell state.
 *
 * Rules:
 *  - No router.push() calls for in-app navigation (migrate to navigate() in Phase 3)
 *  - The existing Link components here are OK for now (home → legacy pages still work)
 */

import React from 'react';
import AppShell from '@/src/components/AppShell';
import { tenantConfig } from '@/src/config/tenant';
import Link from 'next/link';
import { QrCode, UserCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { useTranslation } from '@/src/context/LanguageContext';

function HomeContent() {
    const { t, locale, setLocale } = useTranslation();

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-950 relative overflow-hidden transition-colors duration-300">
            {/* Decorative Gradient using branding colors */}
            <div
                className="absolute top-[-20%] left-[-20%] w-[80%] aspect-square rounded-full blur-[150px] opacity-10"
                style={{ backgroundColor: tenantConfig.branding.primaryColor }}
            />
            <div
                className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square rounded-full blur-[100px] opacity-10"
                style={{ backgroundColor: tenantConfig.branding.secondaryColor }}
            />

            <div className="w-full max-w-lg space-y-12 text-center relative z-10">
                <div className="space-y-6">
                    <div className="w-28 h-28 bg-primary rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-primary/20 rotate-3 animate-pulse">
                        <Sparkles className="w-14 h-14 text-white" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Wasla <span className="text-primary">CRM</span></h1>
                        <p className="text-xl text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">{t('home.description')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 text-left">
                    <Link
                        href="/kiosk"
                        className="group flex items-center gap-6 p-8 bg-white dark:bg-white/5 border-2 border-slate-100 dark:border-white/10 rounded-[32px] hover:border-primary dark:hover:border-indigo-500 hover:shadow-2xl transition-all active:scale-95"
                    >
                        <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 group-hover:bg-blue-50 dark:group-hover:bg-indigo-500/20 rounded-2xl flex items-center justify-center transition-colors">
                            <QrCode className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('home.kioskMode')}</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-widest">{t('home.kioskDesc')}</p>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard"
                        className="group flex items-center gap-6 p-8 bg-white dark:bg-white/5 border-2 border-slate-100 dark:border-white/10 rounded-[32px] hover:border-primary dark:hover:border-indigo-500 hover:shadow-2xl transition-all active:scale-95"
                    >
                        <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 group-hover:bg-blue-50 dark:group-hover:bg-indigo-500/20 rounded-2xl flex items-center justify-center transition-colors">
                            <UserCheck className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('home.commercialPortal')}</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-widest">{t('home.commercialDesc')}</p>
                        </div>
                    </Link>

                    <Link
                        href="/admin"
                        className="group flex items-center gap-6 p-8 bg-slate-900 dark:bg-indigo-600 rounded-[32px] hover:shadow-2xl transition-all active:scale-95 border-2 border-transparent"
                    >
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                            <ShieldCheck className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">{t('home.adminSpace')}</h3>
                            <p className="text-slate-400 dark:text-indigo-100 font-bold uppercase text-xs tracking-widest">{t('home.adminDesc')}</p>
                        </div>
                    </Link>
                </div>

                <div className="flex gap-4 justify-center pt-4">
                    {(['en', 'fr', 'ar'] as const).map((l) => (
                        <button
                            key={l}
                            onClick={() => setLocale(l)}
                            className={`uppercase text-sm font-black tracking-widest ${locale === l ? 'text-primary' : 'text-slate-300'}`}
                        >
                            {l}
                        </button>
                    ))}
                </div>

                <footer className="pt-10 text-slate-400 text-sm font-semibold uppercase tracking-widest">
                    {tenantConfig.event.name} • {tenantConfig.event.location}
                </footer>
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <AppShell initialContent={<HomeContent />} />
    );
}
