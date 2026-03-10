'use client';

import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, Printer, MapPin, Share2, Info, ArrowLeft, LogOut, Eye, Download, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface QRStat {
    location: string;
    total_scans: number;
    last_scan: string | null;
}

export default function AdminQRGenerator() {
    const router = useRouter();
    const [locationName, setLocationName] = useState('');
    const [qrValue, setQrValue] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [stats, setStats] = useState<QRStat[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);

    // Modal State
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [selectedQrValue, setSelectedQrValue] = useState('');
    const qrRef = useRef<HTMLDivElement>(null);

    // Capture the base URL securely on mount to avoid hydration mismatch
    useEffect(() => {
        setBaseUrl(window.location.origin);
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoadingStats(true);
        try {
            const res = await fetch('/api/admin/qr-stats', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setStats(data.stats);
                }
            }
        } catch (error) {
            console.error('Failed to fetch QR stats', error);
        } finally {
            setLoadingStats(false);
        }
    };

    // Dynamically update the QR URL
    useEffect(() => {
        if (!baseUrl) return;

        let path = `${baseUrl}/kiosk`;
        if (locationName.trim()) {
            path += `?location=${encodeURIComponent(locationName.trim())}`;
        }
        setQrValue(path);
    }, [locationName, baseUrl]);

    const handlePrintGenerator = async () => {
        const cleanLocation = locationName.trim() || 'Generic_QR';

        // Register it immediately
        try {
            await fetch('/api/admin/qr-locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location: cleanLocation })
            });
            fetchStats(); // Update the table
        } catch (e) { console.error(e); }

        setSelectedLocation(cleanLocation);
        setSelectedQrValue(qrValue);
        setPrintModalOpen(true);
        // Small delay to ensure modal renders before triggering print dialog
        setTimeout(() => window.print(), 100);
    };

    const handlePrintList = (stat: QRStat) => {
        const path = stat.location === 'Generic_QR'
            ? `${baseUrl}/kiosk`
            : `${baseUrl}/kiosk?location=${encodeURIComponent(stat.location)}`;

        setSelectedLocation(stat.location);
        setSelectedQrValue(path);
        setPrintModalOpen(true);
        setTimeout(() => window.print(), 100);
    };

    const handleDownload = (stat: QRStat) => {
        const canvas = document.getElementById(`qr-canvas-${stat.location}`) as HTMLCanvasElement;
        if (!canvas) return;
        const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
        let downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `QR_${stat.location.replace(/[\s\/]+/g, '_')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* ── HEADER (Admin Standard) ─────────────────────────── */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-40 print:hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/admin/dashboard')}
                            className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-200"
                            title="Retour au Dashboard"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
                                    <QrCode className="w-4 h-4 text-white" />
                                </div>
                                <h1 className="text-xl font-black text-slate-800 tracking-tight">QR Management</h1>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Session Active</p>
                            <p className="text-[10px] font-bold text-slate-500 capitalize">Administrateur</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-3 hover:bg-red-50 rounded-2xl text-slate-400 hover:text-red-500 transition-all active:scale-95 border border-transparent hover:border-red-100"
                            title="Déconnexion"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* ── MAIN CONTENT ────────────────────────────────────── */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12">

                {/* 1. Generator Section */}
                <section>
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                Générateur Rapide
                            </h2>
                            <p className="text-slate-500 text-sm font-medium mt-1">
                                Créez un point de capture de lead identifié physiquement
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 print:hidden relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                            <div className="flex-1 w-full space-y-6">
                                <div>
                                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5" />
                                        Nom de l&apos;emplacement
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="ex: Entree_A, Stand_B2..."
                                        value={locationName}
                                        onChange={(e) => setLocationName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                                        maxLength={50}
                                        className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-2xl font-medium text-slate-800 outline-none focus:border-primary focus:bg-white transition-all placeholder:text-slate-300 text-lg"
                                    />
                                    <p className="text-xs text-slate-400 mt-2 flex gap-1.5 items-start">
                                        <Info className="w-3.5 h-3.5 shrink-0" />
                                        <span>
                                            Ce nom sera enregistré comme <b>device_id</b>. Laissez vide pour utiliser <b>Generic_QR</b>.
                                        </span>
                                    </p>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                                        <Share2 className="w-3.5 h-3.5" />
                                        Lien généré
                                    </label>
                                    <code className="text-sm font-mono text-primary break-all bg-primary/10 px-3 py-1.5 rounded-lg inline-block w-full">
                                        {qrValue || 'En attente...'}
                                    </code>
                                </div>

                                <button
                                    onClick={handlePrintGenerator}
                                    className="w-full bg-slate-900 border border-slate-800 text-white hover:bg-slate-800 focus:ring-4 focus:ring-slate-900/20 active:bg-slate-900 transition-all px-8 py-4 rounded-2xl font-black uppercase text-sm tracking-widest flex justify-center items-center gap-2 shadow-xl shadow-slate-900/20"
                                >
                                    <Printer className="w-5 h-5" />
                                    Visualiser &amp; Imprimer l&apos;affiche
                                </button>
                            </div>

                            <div className="w-full md:w-auto flex-shrink-0 flex justify-center bg-slate-50/50 p-6 rounded-3xl border-2 border-dashed border-slate-200">
                                {qrValue ? (
                                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
                                        <QRCodeSVG value={qrValue} size={200} level="H" includeMargin={true} />
                                    </div>
                                ) : (
                                    <div className="w-[200px] h-[200px] bg-slate-100 rounded-2xl animate-pulse" />
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. QR Stats Dashboard */}
                <section className="print:hidden">
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                Parc Kiosk &amp; Statistiques
                            </h2>
                            <p className="text-slate-500 text-sm font-medium mt-1">
                                Performances par point de capture ({stats.length} emplacement{stats.length !== 1 ? 's' : ''})
                            </p>
                        </div>
                    </div>

                    <div className="w-full bg-white rounded-[24px] border border-slate-100 shadow-xl overflow-hidden">
                        {loadingStats ? (
                            <div className="p-16 flex justify-center text-slate-400">
                                <Search className="w-8 h-8 animate-pulse opacity-50" />
                            </div>
                        ) : stats.length === 0 ? (
                            <div className="text-center p-16 text-slate-400 bg-slate-50/50">
                                <QrCode className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p className="font-bold text-sm">Aucun scan enregistré pour le moment.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Emplacement</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Lien Kiosk</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Total Scans</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dernier Scan</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {stats.map((stat, idx) => {
                                            const fullUrl = stat.location === 'Generic_QR'
                                                ? `${baseUrl}/kiosk`
                                                : `${baseUrl}/kiosk?location=${encodeURIComponent(stat.location)}`;

                                            // Hidden canvas required for the "Download PNG" functionality
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/70 transition-colors group">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                                                                <MapPin className="w-4 h-4 text-primary" />
                                                            </div>
                                                            <span className="font-bold text-slate-800 text-sm">
                                                                {stat.location === 'Generic_QR' ? 'Emplacement Générique' : stat.location}
                                                            </span>
                                                        </div>
                                                        {/* Hidden Canvas for Download */}
                                                        <div className="hidden">
                                                            <QRCodeCanvas
                                                                id={`qr-canvas-${stat.location}`}
                                                                value={fullUrl}
                                                                size={512}
                                                                level="H"
                                                                includeMargin={true}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell max-w-xs truncate">
                                                        <code className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                            {fullUrl}
                                                        </code>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <span className="inline-block px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-black">
                                                            {stat.total_scans}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium text-xs">
                                                        {stat.last_scan ? new Date(stat.last_scan).toLocaleString('fr-FR', {
                                                            day: '2-digit', month: '2-digit',
                                                            hour: '2-digit', minute: '2-digit'
                                                        }) : '—'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                                                        <button
                                                            onClick={() => handlePrintList(stat)}
                                                            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 rounded-xl transition-all"
                                                            title="Visualiser l'affiche"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownload(stat)}
                                                            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-primary rounded-xl transition-all"
                                                            title="Télécharger l'image (PNG)"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* ── PRINT-ONLY MODAL ───────────────────────────────── */}
            {printModalOpen && (
                <div
                    ref={qrRef}
                    className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center min-h-[100vh] text-center print:static print:bg-white print:min-h-0"
                >
                    <div className="print:hidden absolute top-4 right-4">
                        <button
                            onClick={() => setPrintModalOpen(false)}
                            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl"
                        >
                            Fermer
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl ml-2 shadow-lg"
                        >
                            Imprimer !
                        </button>
                    </div>

                    <h1 className="text-5xl font-black text-black mb-4 uppercase tracking-tighter">
                        {selectedLocation === 'Generic_QR' ? 'Scannez ici' : selectedLocation}
                    </h1>
                    <h2 className="text-2xl font-medium text-gray-600 mb-12">
                        Pour démarrer l&apos;expérience
                    </h2>

                    <div className="p-8 border-4 border-black rounded-[3rem] inline-block shadow-2xl">
                        {selectedQrValue && (
                            <QRCodeSVG
                                value={selectedQrValue}
                                size={400}
                                level="H"
                                includeMargin={false}
                            />
                        )}
                    </div>

                    <p className="mt-12 text-sm text-gray-400 font-mono tracking-widest break-all max-w-[80%] mx-auto">
                        {selectedQrValue}
                    </p>
                    <div className="mt-16 border-t-2 border-gray-200 pt-8 w-1/2 mx-auto">
                        <p className="text-xl font-bold text-gray-800 tracking-widest">WASLA KIOSK</p>
                    </div>
                </div>
            )}

            {/* Custom print styles */}
            <style jsx global>{`
                @media print {
                    @page { margin: 0; }
                    body {
                        -webkit-print-color-adjust: exact;
                        background: white !important;
                    }
                    /* Only show the print modal contents */
                    body > div:not(.print\\:static) { display: none !important; }
                    header, main > section:not(.print\\:hidden) { display: none !important; }
                    .print\\:hidden { display: none !important; }
                }
            `}</style>
        </div>
    );
}
