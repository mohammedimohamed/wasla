"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    Gift,
    DownloadCloud,
    Ticket,
    Plus,
    Loader2,
    Trash2,
    CheckCircle2,
    XCircle,
    Archive
} from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFormConfig, getAllFields } from "@/src/hooks/useFormConfig";

// Zod Schema matches backend for validation
const rewardSchema = z.object({
    name: z.string().min(2, "Nom obligatoire"),
    description: z.string().optional(),
    reward_type: z.enum(['digital_download', 'promo_code', 'physical_gift']),
    value: z.string().optional(),
    reward_code: z.string().optional(),
    total_quantity: z.number().int().min(-1).default(-1),
    rule_match: z.string().optional(),
});

type RewardFormValues = z.infer<typeof rewardSchema>;

interface Reward extends RewardFormValues {
    id: string;
    is_active: number;
    claimed_count: number;
    total_quantity: number;
    remaining: number;
    created_at: string;
}

const rewardTypes = [
    { value: 'digital_download', label: 'Téléchargement Digital', icon: DownloadCloud, color: 'text-blue-600', bg: 'bg-blue-50' },
    { value: 'promo_code', label: 'Code Promo', icon: Ticket, color: 'text-amber-600', bg: 'bg-amber-50' },
    { value: 'physical_gift', label: 'Cadeau Physique', icon: Gift, color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

export default function AdminRewardsPage() {
    const router = useRouter();
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<RewardFormValues>({
        resolver: zodResolver(rewardSchema),
        defaultValues: { reward_type: 'physical_gift', total_quantity: -1 }
    });

    const isUnlimited = watch('total_quantity') === -1;
    const ruleMatchStr = watch('rule_match');

    // Parse the rule_match string back to object for UI binding if needed
    const ruleMatchObj = ruleMatchStr ? JSON.parse(ruleMatchStr) : { field: '', value: '' };

    const { config } = useFormConfig();
    const formFields = config ? getAllFields(config).filter(f => f.type === 'select' || f.type === 'multiselect' || f.type === 'chip-group') : [];
    const selectedFieldObj = formFields.find(f => f.name === ruleMatchObj?.field);

    const fetchRewards = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/rewards');
            if (!res.ok) throw new Error("Erreur de récupération");
            const data = await res.json();
            setRewards(data.rewards || []);
        } catch (error) {
            toast.error("Veuillez vous reconnecter.");
            router.push("/admin/login");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRewards();
    }, []);

    const onSubmit = async (data: RewardFormValues) => {
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/rewards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Erreur lors de la création");
            }
            toast.success("Récompense ajoutée !");
            setIsModalOpen(false);
            reset();
            fetchRewards();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Désactiver cette récompense ? Elle ne sera plus proposée, mais l'historique sera conservé.")) return;
        try {
            const res = await fetch(`/api/rewards?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Erreur de désactivation");
            toast.success("Récompense désactivée");
            fetchRewards();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const getIconInfo = (type: string) => rewardTypes.find(rt => rt.value === type) || rewardTypes[2];

    return (
        <div className="flex-1 selection:bg-indigo-500/30 font-sans transition-colors duration-300 bg-slate-50 dark:bg-slate-950 min-h-screen">
            <main className="p-6 lg:p-8 max-w-7xl mx-auto w-full">
                
                {/* ── SUB-HEADER ── */}
                <div className="flex flex-wrap items-center justify-between gap-6 mb-10">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Rewards <span className="text-indigo-600 dark:text-indigo-400">Inventory</span></h2>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-widest uppercase mt-1">Engagement Engine & Incentive Quotas</p>
                    </div>
                    
                    <button
                        onClick={() => { reset({ reward_type: 'physical_gift', total_quantity: -1 }); setIsModalOpen(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                    >
                        <Plus className="w-4 h-4" />
                        Nouveau Cadeau
                    </button>
                </div>
                {/* ── DASHBOARD GRID ────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white dark:bg-white/5 p-6 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Gift className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{rewards.filter(r => r.is_active).length}</p>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Actifs</p>
                        </div>
                    </div>
                    {/* Sum up claims */}
                    <div className="bg-white dark:bg-white/5 p-6 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{rewards.reduce((acc, r) => acc + r.claimed_count, 0)}</p>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Distribués au Total</p>
                        </div>
                    </div>
                </div>

                {/* ── REWARDS LIST ─────────────────────────────────────────────── */}
                {loading ? (
                    <div className="flex items-center justify-center p-20">
                        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400" />
                    </div>
                ) : rewards.length === 0 ? (
                    <div className="bg-white dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[40px] p-20 flex flex-col items-center justify-center text-center">
                        <Archive className="w-16 h-16 text-slate-200 dark:text-slate-800 mb-4" />
                        <h3 className="font-black text-slate-700 dark:text-slate-300 text-lg uppercase tracking-tight">Aucun Cadeau Défini</h3>
                        <p className="text-slate-500 dark:text-slate-500 text-sm mt-2 max-w-md">Créez votre première règle d'engagement pour motiver vos prospects sur le stand.</p>
                        <button
                            onClick={() => { reset({ reward_type: 'physical_gift', total_quantity: -1 }); setIsModalOpen(true); }}
                            className="mt-6 px-6 py-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all font-sans"
                        >
                            Créer un cadeau
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {rewards.map(reward => {
                            const IconInfo = getIconInfo(reward.reward_type);
                            const Icon = IconInfo.icon;
                            // Remaining: total - claimed (if total != -1)
                            const remaining = reward.total_quantity === -1 ? -1 : Math.max(0, reward.total_quantity - reward.claimed_count);
                            const isEmpty = remaining === 0;

                            return (
                                <div key={reward.id} className={`bg-white dark:bg-white/5 rounded-[32px] border ${reward.is_active ? 'border-slate-200 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500/50 shadow-sm' : 'border-slate-100 dark:border-white/5 opacity-60'} p-6 relative group transition-all`}>
                                    {!reward.is_active && (
                                        <div className="absolute top-4 right-4 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider">
                                            Désactivé
                                        </div>
                                    )}
                                    {reward.is_active && (
                                        <button onClick={() => handleDelete(reward.id)} className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-200 dark:text-slate-700 hover:text-rose-500 dark:hover:text-rose-400 bg-white dark:bg-slate-900 rounded-full p-2 border border-slate-100 dark:border-white/5 hover:border-rose-100 dark:hover:border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}

                                    <div className="flex gap-4 items-start mb-6 pr-12">
                                        <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center ${IconInfo.bg} dark:bg-white/5 ${IconInfo.color}`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 dark:text-white leading-tight text-lg truncate" title={reward.name}>{reward.name}</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold tracking-tight uppercase mt-1">{IconInfo.label}</p>
                                        </div>
                                    </div>

                                    {reward.description && (
                                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-6 bg-slate-50 dark:bg-slate-900/40 font-medium px-4 py-3 rounded-[20px] max-h-[80px] overflow-hidden relative transition-colors border border-slate-100 dark:border-white/5">
                                            {reward.description}
                                            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent pointer-events-none"></div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-[24px] border border-slate-100 dark:border-white/5">
                                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5">Distribués</p>
                                            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{reward.claimed_count}</p>
                                        </div>
                                        <div className={`p-5 rounded-[24px] border ${isEmpty ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-white/5'}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${isEmpty ? 'text-rose-500' : 'text-slate-400 dark:text-slate-600'}`}>Reste en Stock</p>
                                            <p className={`text-2xl font-black tracking-tight ${isEmpty ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                                                {reward.total_quantity === -1 ? '∞' : remaining}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* ── MODAL: CREATE REWARD ───────────────────────────────────────────────── */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-2xl max-h-[95vh] overflow-y-auto no-scrollbar shadow-2xl p-8 relative border dark:border-white/5 transition-colors duration-300">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors flex items-center justify-center">
                            <XCircle className="w-7 h-7" />
                        </button>

                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
                                <Plus className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">Ajouter un Cadeau</h2>
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">Configurer une nouvelle règle</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="bg-slate-50 dark:bg-white/5 rounded-[32px] p-6 border border-slate-100 dark:border-white/5">
                                <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-[9px]">1</span>
                                    Définition du Cadeau
                                </label>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 pl-2">Nom / Titre du Cadeau</label>
                                        <input {...register('name')} placeholder="Ex: Goodies VIP, Remise 10%" className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 px-5 py-4 rounded-2xl text-sm font-medium focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 text-slate-900 dark:text-white" />
                                        {errors.name && <p className="text-red-500 text-xs mt-2 pl-2 font-bold">{errors.name.message}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 pl-2">Format de remise</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {rewardTypes.map(rt => {
                                                const Icon = rt.icon;
                                                const selected = watch('reward_type') === rt.value;
                                                return (
                                                    <button
                                                        key={rt.value} type="button"
                                                        onClick={() => reset({ ...watch(), reward_type: rt.value as any })}
                                                        className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 h-28 ${selected ? 'border-indigo-500 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-inner' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-white/20 shadow-sm'}`}
                                                    >
                                                        <Icon className={`w-8 h-8 ${selected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-600'}`} />
                                                        <span className={`text-[10px] font-black uppercase tracking-tight ${selected ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>{rt.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 pl-2">Infos Complémentaires (optionnel)</label>
                                        <textarea {...register('description')} placeholder="Instructions pour l'équipe sur le stand..." className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 px-5 py-4 rounded-2xl text-sm font-medium focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 text-slate-900 dark:text-white resize-none h-24" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-white/5 rounded-[32px] p-6 border border-slate-100 dark:border-white/5">
                                <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-[9px]">2</span>
                                    Gestion des Quotas
                                </label>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="col-span-2 sm:col-span-1">
                                        <div className="flex justify-between items-center mb-2 pl-2">
                                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Stock Disponible</label>
                                            <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-950 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 shadow-sm">
                                                <input type="checkbox" checked={watch('total_quantity') !== -1} onChange={(e) => reset({ ...watch(), total_quantity: e.target.checked ? 100 : -1 })} className="accent-indigo-600 w-3 h-3" />
                                                <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Limiter</span>
                                            </label>
                                        </div>

                                        {!isUnlimited ? (
                                            <div className="relative">
                                                <input {...register('total_quantity', { valueAsNumber: true })} type="number" min="1" className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 pl-5 pr-12 py-4 rounded-2xl text-xl font-black focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-500/10 outline-none transition-all text-indigo-900 dark:text-indigo-400" />
                                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-600 uppercase">unités</span>
                                            </div>
                                        ) : (
                                            <div className="h-[60px] rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 border-dashed flex items-center justify-center text-slate-400 dark:text-slate-600 font-bold text-xs uppercase tracking-widest">
                                                <span className="text-3xl font-black mr-2 leading-none mt-1">∞</span> Stock Illimité
                                            </div>
                                        )}
                                    </div>

                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 pl-2">Spécifications (URL / C. Promo)</label>
                                        <input {...register('value')} placeholder="https://... ou CODE20" className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 px-5 py-4 rounded-2xl text-sm font-black focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 font-mono text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 mt-4 flex items-center gap-2">
                                            <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-[9px]">3</span>
                                            Ciblage Logique (Optionnel)
                                        </label>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 font-medium pl-2">
                                            Ce cadeau ne sera distribué qu'aux prospects qui répondent à la condition ci-dessous. Si laissé vide, il sera distribué au hasard (équitablement).
                                        </p>
                                        <div className="grid grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 pl-2">Si le champ...</label>
                                                <select
                                                    value={ruleMatchObj?.field || ''}
                                                    onChange={e => {
                                                        const field = e.target.value;
                                                        setValue('rule_match', field ? JSON.stringify({ field, value: '' }) : '');
                                                    }}
                                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 px-5 py-4 rounded-2xl text-sm font-medium focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-500/10 outline-none transition-all text-slate-900 dark:text-white"
                                                >
                                                    <option value="">(Pas de condition, universel)</option>
                                                    {formFields.map(f => (
                                                        <option key={f.name} value={f.name}>{f.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {selectedFieldObj && (
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 pl-2">Est égal à...</label>
                                                    <select
                                                        value={ruleMatchObj?.value || ''}
                                                        onChange={e => {
                                                            const value = e.target.value;
                                                            setValue('rule_match', JSON.stringify({ field: ruleMatchObj.field, value }));
                                                        }}
                                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 px-5 py-4 rounded-2xl text-sm font-medium focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-500/10 outline-none transition-all text-slate-900 dark:text-white"
                                                    >
                                                        <option value="">Sélectionnez une valeur</option>
                                                        {selectedFieldObj.options?.map(o => (
                                                            <option key={o.value} value={o.value}>{o.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>


                            <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white rounded-[24px] shadow-xl shadow-indigo-200/50 dark:shadow-none mt-8 py-5 text-sm font-black uppercase tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                {isSubmitting ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Création en cours...</>
                                ) : (
                                    <><CheckCircle2 className="w-5 h-5" /> Enregistrer le Cadeau</>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
