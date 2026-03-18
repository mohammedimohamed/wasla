"use client";

import { useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { useTranslation } from "@/src/context/LanguageContext";

interface ConsentModalProps {
    isOpen: boolean;
    onAccept: (timestamp: string) => void;
    onReject: () => void;
}

export default function ConsentModal({ isOpen, onAccept, onReject }: ConsentModalProps) {
    const { t } = useTranslation();
    const [agreed, setAgreed] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onReject} />

            <div className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
                <div className="p-6 border-b flex items-start justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 leading-tight">{t('consent.title')}</h2>
                            <p className="text-xs text-gray-500 font-medium tracking-tight">{t('consent.law')}</p>
                        </div>
                    </div>
                    <button onClick={onReject} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="text-sm text-gray-600 leading-relaxed bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                        <p className="font-medium italic text-gray-700">
                            {t('consent.description')}
                        </p>
                    </div>

                    <label className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 cursor-pointer active:bg-gray-100 transition-colors">
                        <div className="relative flex items-center mt-1">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                className="w-6 h-6 rounded-lg border-2 border-gray-300 text-primary focus:ring-primary h-6 w-6"
                            />
                        </div>
                        <span className="text-sm font-bold text-gray-700 leading-snug">
                            {t('consent.checkboxLabel')}
                        </span>
                    </label>
                </div>

                <div className="p-6 bg-slate-50 border-t flex flex-col gap-3">
                    <button
                        onClick={() => onAccept(new Date().toISOString())}
                        disabled={!agreed}
                        className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${agreed ? 'bg-primary text-white shadow-blue-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                        {t('consent.validate')}
                    </button>
                    <button
                        onClick={onReject}
                        className="w-full py-3 text-gray-500 font-bold text-sm hover:text-gray-700"
                    >
                        {t('common.cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
}
