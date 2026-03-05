"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    Plus,
    Gift,
    Mail,
    FileText,
    Tag,
    Edit2,
    Trash2,
    CheckCircle,
    XCircle
} from "lucide-react";
import toast from "react-hot-toast";

interface Reward {
    id: string;
    type_client: string;
    reward_type: string;
    title: string;
    active: number;
}

export default function RewardsListPage() {
    const router = useRouter();
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRewards();
    }, []);

    const fetchRewards = async () => {
        try {
            const response = await fetch("/api/rewards");
            if (response.ok) {
                const data = await response.json();
                setRewards(data.rewards);
            }
        } catch (error) {
            toast.error("Erreur de chargement des récompenses");
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "catalogue_pdf": return <Mail className="w-5 h-5" />;
            case "promo_code": return <Tag className="w-5 h-5" />;
            case "guide_technique": return <FileText className="w-5 h-5" />;
            case "cadeau_physique": return <Gift className="w-5 h-5" />;
            default: return <Gift className="w-5 h-5" />;
        }
    };

    return (
        <div className="flex-1 flex flex-col pt-4 bg-slate-50">
            <header className="px-6 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/admin/dashboard")} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-black text-slate-900">Récompenses</h1>
                </div>
                <button
                    onClick={() => router.push("/admin/rewards/new")}
                    className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 active:scale-90 transition-all"
                >
                    <Plus className="w-6 h-6" />
                </button>
            </header>

            <div className="px-6 space-y-4 pb-12">
                {loading ? (
                    <div className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">Chargement...</div>
                ) : rewards.length === 0 ? (
                    <div className="bg-white p-12 rounded-[32px] border border-dashed border-gray-200 text-center space-y-4">
                        <Gift className="w-12 h-12 text-gray-200 mx-auto" />
                        <p className="text-gray-400 text-sm font-medium">Aucune récompense configurée</p>
                        <button onClick={() => router.push("/admin/rewards/new")} className="text-primary font-bold text-sm">
                            Créer la première →
                        </button>
                    </div>
                ) : (
                    rewards.map(reward => (
                        <div
                            key={reward.id}
                            className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${reward.active ? 'bg-blue-50 text-primary' : 'bg-gray-50 text-gray-400'}`}>
                                    {getIcon(reward.reward_type)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 leading-tight">{reward.title}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{reward.type_client}</span>
                                        <span className="text-[10px] text-gray-300">•</span>
                                        <span className={`text-[10px] font-black uppercase tracking-wider ${reward.active ? 'text-success' : 'text-gray-400'}`}>
                                            {reward.active ? 'Actif' : 'Inactif'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => router.push(`/admin/rewards/${reward.id}/edit`)}
                                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-primary transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
