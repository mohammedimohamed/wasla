"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ChevronLeft,
    Edit,
    Trash2,
    User,
    Building,
    Phone,
    Mail,
    MapPin,
    Briefcase,
    Layers,
    FileText,
    Calendar,
    AlertTriangle
} from "lucide-react";
import toast from "react-hot-toast";

interface Lead {
    id: string;
    contact: string;
    societe?: string;
    telephone?: string;
    email?: string;
    ville?: string;
    fonction?: string;
    type_client: string;
    produits: string[];
    projet?: string;
    quantite?: string;
    delai?: string;
    budget?: string;
    actions: string[];
    note?: string;
    source: string;
    created_at: string;
    sync_status: string;
    qualified_by?: string;
}

export default function LeadDetailPage() {
    const router = useRouter();
    const { id } = useParams();
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const res = await fetch('/api/auth');
            if (res.ok) {
                const data = await res.json();
                setUserRole(data.user?.role || null);
            }
        };
        checkAuth();
        fetchLead();
    }, [id]);

    const fetchLead = async () => {
        try {
            const response = await fetch(`/api/leads/${id}`);
            if (response.ok) {
                const data = await response.json();
                setLead(data.lead);
            }
        } catch (error) {
            console.error("Error fetching lead:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex-1 flex items-center justify-center">Chargement...</div>;
    if (!lead) return <div className="flex-1 flex items-center justify-center">Lead non trouvé</div>;

    const isKioskUnqualified = (lead.source === "kiosk" || lead.source === "qrcode") && !lead.qualified_by;

    return (
        <div className="flex-1 flex flex-col pt-4">
            <header className="px-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/leads/list")}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-lg"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold">Détail du lead</h1>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => router.push(`/leads/${id}/edit`)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-primary"
                    >
                        <Edit className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {isKioskUnqualified && (
                <div className="mx-4 mb-6 bg-orange-50 border border-orange-200 p-4 rounded-2xl flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-orange-700 font-bold">
                        <AlertTriangle className="w-5 h-5" />
                        Lead non qualifié
                    </div>
                    <p className="text-sm text-orange-600">Ce prospect s'est auto-enregistré. Enrichissez sa fiche avec ses besoins détaillés.</p>
                    <button
                        onClick={() => router.push(`/leads/${id}/edit`)}
                        className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl active:scale-95 transition-all text-sm"
                    >
                        Qualifier ce lead
                    </button>
                </div>
            )}

            <div className="px-4 pb-12 space-y-6">
                <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-50 text-primary rounded-2xl flex items-center justify-center text-2xl font-bold uppercase">
                            {lead.contact?.charAt(0) || "?"}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{lead.contact}</h2>
                            <p className="text-gray-500">{lead.societe || "Particulier"}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-2">
                        {lead.telephone && (
                            <div className="flex items-center gap-3 text-gray-700">
                                <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                                    <Phone className="w-4 h-4" />
                                </div>
                                <a href={`tel:${lead.telephone}`} className="text-sm font-semibold">{lead.telephone}</a>
                            </div>
                        )}
                        {lead.email && (
                            <div className="flex items-center gap-3 text-gray-700">
                                <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <a href={`mailto:${lead.email}`} className="text-sm font-semibold">{lead.email}</a>
                            </div>
                        )}
                        {lead.ville && (
                            <div className="flex items-center gap-3 text-gray-700">
                                <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-semibold">{lead.ville}</span>
                            </div>
                        )}
                        {lead.fonction && (
                            <div className="flex items-center gap-3 text-gray-700">
                                <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                                    <Briefcase className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-semibold">{lead.fonction}</span>
                            </div>
                        )}
                    </div>
                </section>

                <section className="space-y-3">
                    <h3 className="font-bold text-gray-900 text-sm ml-2 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
                        Profil & Intérêts
                    </h3>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-black mb-2 px-1">Type de client</p>
                            <span className="inline-block px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold">
                                {lead.type_client}
                            </span>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-black mb-2 px-1">Produits d'intérêt</p>
                            <div className="flex flex-wrap gap-2">
                                {lead.produits.map(p => (
                                    <span key={p} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold ring-1 ring-gray-200">
                                        {p}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {(lead.projet || lead.quantite || lead.delai || lead.budget) && (
                    <section className="space-y-3">
                        <h3 className="font-bold text-gray-900 text-sm ml-2 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            Détails Projet
                        </h3>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                            {lead.projet && (
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase font-black mb-1 px-1">Description</p>
                                    <p className="text-sm text-gray-700 leading-relaxed">{lead.projet}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                {lead.quantite && (
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-black mb-1 px-1">Quantité</p>
                                        <p className="text-sm font-bold text-gray-800">{lead.quantite}</p>
                                    </div>
                                )}
                                {lead.delai && (
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-black mb-1 px-1">Délai</p>
                                        <p className="text-sm font-bold text-gray-800">{lead.delai}</p>
                                    </div>
                                )}
                            </div>
                            {lead.budget && (
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase font-black mb-1 px-1">Budget</p>
                                    <p className="text-sm font-bold text-gray-800">{lead.budget}</p>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {lead.actions && lead.actions.length > 0 && (
                    <section className="space-y-3">
                        <h3 className="font-bold text-gray-900 text-sm ml-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            Actions à suivre
                        </h3>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-2">
                            {lead.actions.map(action => (
                                <span key={action} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold ring-1 ring-green-100">
                                    {action}
                                </span>
                            ))}
                        </div>
                    </section>
                )}

                {lead.note && (
                    <section className="space-y-3">
                        <h3 className="font-bold text-gray-900 text-sm ml-2">Notes</h3>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-sm text-gray-700 italic">"{lead.note}"</p>
                        </div>
                    </section>
                )}

                <div className="pt-6 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">
                        Saisie le {new Date(lead.created_at).toLocaleString('fr-FR')} • Source: {lead.source}
                    </p>
                </div>
            </div>
        </div>
    );
}
