"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Printer, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function AdminQRPage() {
    const router = useRouter();
    const [settings, setSettings] = useState<any>(null);
    const [kioskUrl, setKioskUrl] = useState("");

    useEffect(() => {
        // Build the current kiosk URL
        setKioskUrl(`${window.location.origin}/kiosk`);

        // Fetch settings
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setSettings(data.settings);
                }
            });
    }, []);

    const handlePrint = () => {
        window.print();
    };

    if (!settings) return null;

    return (
        <div className="flex-1 flex flex-col bg-slate-50 min-h-screen print:bg-white print:min-h-0">
            {/* ── HEADER (Hidden on Print) ─────────────────────────────────────────────────────── */}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm print:hidden">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/admin/dashboard")}
                        className="p-2 -ml-2 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <ChevronLeft className="w-6 h-6 text-slate-700" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Kiosk Mode</h1>
                        <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">Visuel d'acquisition Public</p>
                    </div>
                </div>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-200"
                >
                    <Printer className="w-4 h-4" />
                    Imprimer le QR Code
                </button>
            </header>

            {/* ── PRINTABLE CANVAS ────────────────────────────────────────────── */}
            <div className="flex-1 p-6 md:p-10 flex items-center justify-center print:p-0">
                <div className="bg-white rounded-[40px] shadow-2xl print:shadow-none p-12 md:p-20 text-center max-w-2xl w-full border border-slate-100 print:border-none">

                    {/* Header: Logo / Event Name */}
                    {settings.logo_url ? (
                        <img src={settings.logo_url} alt="Logo" className="h-24 mx-auto mb-6 object-contain" />
                    ) : (
                        <div className="w-20 h-20 bg-slate-100 rounded-3xl mx-auto mb-6 flex items-center justify-center text-4xl font-black" style={{ color: settings.primary_color }}>
                            {settings.event_name?.charAt(0) || 'W'}
                        </div>
                    )}

                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none mb-4 uppercase">
                        {settings.event_name}
                    </h1>
                    <p className="text-lg md:text-xl font-medium text-slate-500 mb-12">
                        {settings.kiosk_welcome_text}
                    </p>

                    {/* The QR Code */}
                    <div className="inline-block p-4 bg-white rounded-3xl border-4 shadow-sm" style={{ borderColor: settings.primary_color }}>
                        <QRCodeSVG
                            value={kioskUrl}
                            size={280}
                            fgColor="#0f172a"
                            level="H"
                            includeMargin={true}
                        />
                    </div>

                    <div className="mt-12 flex items-center justify-center gap-3 text-slate-400">
                        <QrCode className="w-6 h-6" />
                        <p className="text-sm font-black uppercase tracking-widest">Scannez pour participer</p>
                    </div>

                    {/* Footer for print only */}
                    <div className="hidden print:block mt-24 text-[10px] text-slate-300 font-mono">
                        {kioskUrl}
                    </div>
                </div>
            </div>

            {/* Inject Global Print CSS to strip margins and headers automatically */}
            <style jsx global>{`
                @media print {
                    body {
                        background: white;
                    }
                    @page {
                        size: A4 portrait;
                        margin: 20mm;
                    }
                }
            `}</style>
        </div>
    );
}
