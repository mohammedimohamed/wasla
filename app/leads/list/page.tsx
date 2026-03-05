"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    Search,
    Filter,
    Circle,
    CheckCircle2,
    AlertCircle,
    User as UserIcon,
    Monitor,
    QrCode,
    Plus
} from "lucide-react";

interface Lead {
    id: string;
    contact: string;
    societe?: string;
    type_client: string;
    produits: string[];
    source: string;
    created_at: string;
    sync_status: string;
}

export default function LeadsListPage() {
    const router = useRouter();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterSource, setFilterSource] = useState<string>("all");

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/leads");
            if (response.ok) {
                const data = await response.json();
                setLeads(data.leads);
            }
        } catch (error) {
            console.error("Error fetching leads:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLeads = leads.filter(lead => {
        const matchesSearch =
            lead.contact.toLowerCase().includes(search.toLowerCase()) ||
            (lead.societe?.toLowerCase() || "").includes(search.toLowerCase());

        const matchesSource = filterSource === "all" || lead.source === filterSource;

        return matchesSearch && matchesSource;
    });

    const getSourceIcon = (source: string) => {
        switch (source) {
            case "commercial": return <UserIcon className="w-4 h-4" />;
            case "kiosk": return <Monitor className="w-4 h-4" />;
            case "qrcode": return <QrCode className="w-4 h-4" />;
            default: return <Circle className="w-4 h-4" />;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "synced": return <CheckCircle2 className="w-4 h-4 text-success" />;
            case "pending": return <Circle className="w-4 h-4 text-alert" />;
            case "error": return <AlertCircle className="w-4 h-4 text-error" />;
            default: return <Circle className="w-4 h-4 text-gray-300" />;
        }
    };

    return (
        <div className="flex-1 flex flex-col pt-4">
            <header className="px-4 mb-4">
                <div className="flex items-center gap-4 mb-4">
                    <button onClick={() => router.push("/dashboard")} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold">Liste des leads</h1>
                </div>

                <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Rechercher un nom, société..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input-field pl-12 h-14"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    <button
                        onClick={() => setFilterSource("all")}
                        className={`px-4 py-2 border rounded-full text-xs font-bold whitespace-nowrap ${filterSource === "all" ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-gray-200 text-gray-600'}`}
                    >
                        Tous
                    </button>
                    <button
                        onClick={() => setFilterSource("commercial")}
                        className={`px-4 py-2 border rounded-full text-xs font-bold whitespace-nowrap ${filterSource === "commercial" ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-gray-200 text-gray-600'}`}
                    >
                        Commerciaux
                    </button>
                    <button
                        onClick={() => setFilterSource("kiosk")}
                        className={`px-4 py-2 border rounded-full text-xs font-bold whitespace-nowrap ${filterSource === "kiosk" ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-gray-200 text-gray-600'}`}
                    >
                        Kiosque
                    </button>
                    <button
                        onClick={() => setFilterSource("qrcode")}
                        className={`px-4 py-2 border rounded-full text-xs font-bold whitespace-nowrap ${filterSource === "qrcode" ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-gray-200 text-gray-600'}`}
                    >
                        QR Code
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-24">
                {loading ? (
                    [...Array(5)].map((_, i) => (
                        <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />
                    ))
                ) : filteredLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <Search className="w-12 h-12 mb-4 opacity-20" />
                        <p>Aucun lead trouvé</p>
                    </div>
                ) : (
                    filteredLeads.map(lead => (
                        <div
                            key={lead.id}
                            onClick={() => router.push(`/leads/${lead.id}`)}
                            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm active:bg-gray-50 transition-all flex flex-col gap-3"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-900">{lead.contact}</h3>
                                    <p className="text-sm text-gray-500">{lead.societe || "Particulier"}</p>
                                </div>
                                {getStatusIcon(lead.sync_status)}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 bg-blue-50 text-primary text-[10px] font-bold rounded-md uppercase">
                                    {lead.type_client}
                                </span>
                                {lead.produits.slice(0, 2).map(p => (
                                    <span key={p} className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-semibold rounded-md">
                                        {p}
                                    </span>
                                ))}
                                {lead.produits.length > 2 && (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-semibold rounded-md">
                                        +{lead.produits.length - 2}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center justify-between mt-1 pt-3 border-t border-gray-50">
                                <div className="flex items-center gap-1.5 text-gray-400">
                                    {getSourceIcon(lead.source)}
                                    <span className="text-[10px] font-bold uppercase tracking-tight">{lead.source}</span>
                                </div>
                                <span className="text-[10px] text-gray-400 font-medium">
                                    {new Date(lead.created_at).toLocaleDateString()} {new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <button
                onClick={() => router.push("/leads/new")}
                className="fixed bottom-6 right-6 w-16 h-16 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-20"
            >
                <Plus className="w-8 h-8" />
            </button>
        </div>
    );
}
