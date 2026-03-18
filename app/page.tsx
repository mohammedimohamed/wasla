'use client';

import React from 'react';
import { tenantConfig } from '@/src/config/tenant';
import Link from 'next/link';
import { QrCode, UserCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { useTranslation } from '@/src/context/LanguageContext';

export default function Home() {
    const { t, locale, setLocale } = useTranslation();

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white relative overflow-hidden">
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
                        <h1 className="text-5xl font-black tracking-tight text-slate-900">{tenantConfig.name}</h1>
                        <p className="text-xl text-slate-500 font-medium">{t('home.description')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 text-left">
                    <Link
                        href="/kiosk"
                        className="group flex items-center gap-6 p-8 bg-white border-2 border-slate-100 rounded-[32px] hover:border-primary hover:shadow-2xl hover:shadow-primary/10 transition-all active:scale-95"
                    >
                        <div className="w-16 h-16 bg-slate-50 group-hover:bg-blue-50 rounded-2xl flex items-center justify-center transition-colors">
                            <QrCode className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900">{t('home.kioskMode')}</h3>
                            <p className="text-slate-500 font-medium">{t('home.kioskDesc')}</p>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard"
                        className="group flex items-center gap-6 p-8 bg-white border-2 border-slate-100 rounded-[32px] hover:border-primary hover:shadow-2xl hover:shadow-primary/10 transition-all active:scale-95"
                    >
                        <div className="w-16 h-16 bg-slate-50 group-hover:bg-blue-50 rounded-2xl flex items-center justify-center transition-colors">
                            <UserCheck className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900">{t('home.commercialPortal')}</h3>
                            <p className="text-slate-500 font-medium">{t('home.commercialDesc')}</p>
                        </div>
                    </Link>

                    <Link
                        href="/admin"
                        className="group flex items-center gap-6 p-8 bg-slate-900 rounded-[32px] hover:shadow-2xl transition-all active:scale-95"
                    >
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                            <ShieldCheck className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white">{t('home.adminSpace')}</h3>
                            <p className="text-slate-400 font-medium">{t('home.adminDesc')}</p>
                        </div>
                    </Link>
                </div>

                <div className="flex gap-4 justify-center pt-4">
                    {['en', 'fr', 'ar'].map(l => (
                        <button
                            key={l}
                            onClick={() => setLocale(l as any)}
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
