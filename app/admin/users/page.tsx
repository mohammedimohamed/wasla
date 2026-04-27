"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    Users,
    Shield,
    UsersRound,
    User,
    Plus,
    Loader2,
    Trash2,
    KeyRound,
    XCircle,
    CheckCircle2,
    AlertCircle,
    Pencil,
    Camera,
    Image as ImageIcon
} from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { DigitalProfileBuilder } from "@/src/components/DigitalProfileBuilder";
import { updateDigitalProfileAction } from "./actions";
import { updateUserAction, resetUserPasswordAction } from "./actions";

// Zod Schema matches backend for validation
const userSchema = z.object({
    name: z.string().min(2, "Nom obligatoire"),
    email: z.string().email("Email invalide"),
    password: z.string().min(6, "Mot de passe min. 6 caractères"),
    role: z.enum(['ADMINISTRATOR', 'TEAM_LEADER', 'SALES_AGENT']),
    team_id: z.string().optional().nullable(),
});

type UserFormValues = z.infer<typeof userSchema>;

interface UserData {
    id: string;
    name: string;
    email: string;
    role: 'ADMINISTRATOR' | 'TEAM_LEADER' | 'SALES_AGENT';
    team_id: string | null;
    team_name: string | null;
    active: number;
    created_at: string;
    updated_at: string;
    quick_pin: string | null;
    image_url: string | null;
    force_password_reset: number;
    phone_number: string | null;
    job_title: string | null;
    company_name: string | null;
    linkedin_url: string | null;
    profile_slug: string | null;
    profile_is_active: number;
    profile_config: string | null;
}

interface TeamData {
    id: string;
    name: string;
}

const roleMap = {
    'ADMINISTRATOR': { label: 'Administrateur', icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50' },
    'TEAM_LEADER': { label: 'Chef d\'Équipe', icon: UsersRound, color: 'text-amber-600', bg: 'bg-amber-50' },
    'SALES_AGENT': { label: 'Agent Commercial', icon: User, color: 'text-blue-600', bg: 'bg-blue-50' },
};

export default function AdminUsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<UserData[]>([]);
    const [teams, setTeams] = useState<TeamData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editModal, setEditModal] = useState<{ isOpen: boolean; user: UserData | null }>({ isOpen: false, user: null });
    const [assignModal, setAssignModal] = useState<{ isOpen: boolean; userId: string; userName: string; currentTeamId: string | null }>({ isOpen: false, userId: '', userName: '', currentTeamId: null });
    const [resetCodeModal, setResetCodeModal] = useState<{ isOpen: boolean; code: string; userName: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [editTab, setEditTab] = useState<'info' | 'nfc'>('info');
    const [brandingSettings, setBrandingSettings] = useState<any>(null);

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<UserFormValues>({
        resolver: zodResolver(userSchema),
        defaultValues: { role: 'SALES_AGENT' }
    });

    const currentRole = watch('role');

    const fetchData = async (): Promise<UserData[] | undefined> => {
        setLoading(true);
        try {
            const res = await fetch('/api/users');
            if (!res.ok) throw new Error("Erreur de récupération");
            const data = await res.json();
            setUsers(data.users || []);
            setTeams(data.teams || []);
            return data.users as UserData[];
        } catch (error) {
            toast.error("Veuillez vous reconnecter.");
            router.push("/admin/login");
            return [];
        } finally {
            setLoading(false);
        }
    };

    const fetchBranding = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data.success) setBrandingSettings(data.settings);
        } catch (_) {}
    };

    useEffect(() => {
        fetchData();
        fetchBranding();
    }, []);

    const onSubmit = async (data: UserFormValues) => {
        setIsSubmitting(true);
        try {
            // Adjust payload: null out team_id for admins or if not selected
            const payload = { ...data };
            if (payload.role === 'ADMINISTRATOR' || !payload.team_id || payload.team_id === '') {
                payload.team_id = null;
            }

            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Erreur lors de la création");
            }
            toast.success("Utilisateur créé avec succès !");
            setIsModalOpen(false);
            reset();
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const onEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const formData = new FormData(e.currentTarget);
            const res = await updateUserAction(formData);
            if (res.error) throw new Error(res.error);
            
            toast.success("Utilisateur mis à jour !");
            setEditModal({ isOpen: false, user: null });
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const onResetPassword = async (userId: string, userName: string) => {
        if (!confirm(`Générer un mot de passe temporaire pour ${userName} ?`)) return;
        setIsSubmitting(true);
        try {
            const res = await resetUserPasswordAction(userId);
            if (res.error) throw new Error(res.error);
            setResetCodeModal({ isOpen: true, code: res.tempCode!, userName });
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPin = async (id: string, name: string) => {
        if (!confirm(`Forcer la réinitialisation du PIN pour ${name} ?`)) return;
        try {
            const res = await fetch(`/api/users`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'reset_pin' })
            });
            if (!res.ok) throw new Error("Erreur");
            toast.success(`PIN réinitialisé pour ${name}`);
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleAssignTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.target as HTMLFormElement);
        const team_id = formData.get('team_id') as string;
        
        try {
            const res = await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: assignModal.userId, team_id: team_id || null })
            });
            if (!res.ok) throw new Error("Erreur d'affectation");
            toast.success(`Équipe affectée pour ${assignModal.userName}`);
            setAssignModal({ ...assignModal, isOpen: false });
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, email: string) => {
        if (!confirm(`Désactiver définitivement le compte : ${email} ?`)) return;
        try {
            const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Erreur de désactivation");
            }
            toast.success("Utilisateur désactivé");
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
            {/* ── HEADER ─────────────────────────────────────────────────────── */}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/admin/dashboard")}
                        className="p-2 -ml-2 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <ChevronLeft className="w-6 h-6 text-slate-700" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Utilisateurs</h1>
                        <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">RBAC & Équipes</p>
                    </div>
                </div>
                <button
                    onClick={() => { reset({ role: 'SALES_AGENT', team_id: '' }); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-200"
                >
                    <Plus className="w-4 h-4" />
                    Ajouter Compte
                </button>
            </header>

            <div className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
                {/* ── DASHBOARD GRID ────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Users className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{users.filter(u => u.active).length}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Comptes Actifs</p>
                        </div>
                    </div>
                    {/* Admins vs Agents breakdown */}
                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center">
                            <Shield className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{users.filter(u => u.role === 'ADMINISTRATOR' && u.active).length}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Administrateurs</p>
                        </div>
                    </div>
                </div>

                {/* ── USERS TABLE ──────────────────────────────────────────────── */}
                {loading ? (
                    <div className="flex items-center justify-center p-20">
                        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                    </div>
                ) : (
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Utilisateur</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rôle & Équipe</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sécurité</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => {
                                        const RMap = roleMap[u.role] || roleMap['SALES_AGENT'];
                                        const RIcon = RMap.icon;
                                        return (
                                            <tr key={u.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${!u.active ? 'opacity-50' : ''}`}>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden ${RMap.bg} ${RMap.color}`}>
                                                            {u.image_url ? (
                                                                <img src={`${u.image_url}?v=${new Date(u.updated_at).getTime()}`} alt={u.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <RIcon className="w-5 h-5" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-900">{u.name}</p>
                                                            {!u.active && <span className="text-[9px] font-black bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full uppercase ml-1">Inactif</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <p className="text-sm font-medium text-slate-600">{u.email}</p>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <p className={`text-xs font-bold ${RMap.color} mb-1`}>{RMap.label}</p>
                                                    {u.team_name && <p className="text-xs text-slate-400 font-medium">Équipe: {u.team_name}</p>}
                                                </td>
                                                <td className="px-8 py-5">
                                                    {u.quick_pin ? (
                                                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl w-max">
                                                            <CheckCircle2 className="w-4 h-4" /> PIN Défini
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl w-max">
                                                            <AlertCircle className="w-4 h-4" /> En Attente
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {u.active && (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditModal({ isOpen: true, user: u });
                                                                        setPhotoPreview(`${u.image_url}?v=${new Date(u.updated_at).getTime()}`);
                                                                    }}
                                                                    title="Modifier l'utilisateur"
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </button>
                                                                {u.role !== 'ADMINISTRATOR' && (
                                                                    <button
                                                                        onClick={() => setAssignModal({ isOpen: true, userId: u.id, userName: u.name, currentTeamId: u.team_id })}
                                                                        title="Affecter à une équipe"
                                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                                                                    >
                                                                        <Users className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleResetPin(u.id, u.name)}
                                                                    title="Réinitialiser le PIN de session"
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                                                                >
                                                                    <KeyRound className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(u.id, u.email)}
                                                                    title="Désactiver l'utilisateur"
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-red-600 transition-colors"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
            </table>
                            {users.length === 0 && !loading && (
                                <div className="p-20 text-center text-slate-400 font-medium">
                                    Aucun utilisateur trouvé.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── MODAL: CREATE USER ───────────────────────────────────────────────── */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[40px] w-full max-w-xl max-h-[95vh] overflow-y-auto no-scrollbar shadow-2xl p-8 relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center">
                            <XCircle className="w-7 h-7" />
                        </button>

                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                <Plus className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Nouvel Utilisateur</h2>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Création de compte sécurisé</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                            {/* Role Selection */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">Rôle & Permissions</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(Object.keys(roleMap) as Array<keyof typeof roleMap>).map(r => {
                                        const RMap = roleMap[r];
                                        const Icon = RMap.icon;
                                        const selected = currentRole === r;
                                        return (
                                            <button
                                                key={r} type="button"
                                                onClick={() => reset({ ...watch(), role: r })}
                                                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 h-24 ${selected ? `border-${RMap.color.split('-')[1]}-500 ${RMap.bg} shadow-inner` : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'}`}
                                            >
                                                <Icon className={`w-6 h-6 ${selected ? RMap.color : 'text-slate-400'}`} />
                                                <span className={`text-[9px] font-black uppercase tracking-tight block ${selected ? RMap.color.replace('text', 'text').replace('500', '900') : 'text-slate-500'}`}>{RMap.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Identity */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">Nom Complet</label>
                                    <input {...register('name')} placeholder="Ahmed Salah" className="w-full bg-white border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-medium focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all" />
                                    {errors.name && <p className="text-red-500 text-xs mt-1 pl-2 font-bold">{errors.name.message}</p>}
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">Email (Identifiant)</label>
                                    <input {...register('email')} type="email" placeholder="agent@wasla.app" className="w-full bg-white border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-medium focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all" />
                                    {errors.email && <p className="text-red-500 text-xs mt-1 pl-2 font-bold">{errors.email.message}</p>}
                                </div>
                            </div>

                            {/* Team Switcher (Only visible for non-admins if teams exist) */}
                            {currentRole !== 'ADMINISTRATOR' && (
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">Affectation d'Équipe (Optionnel)</label>
                                    <select {...register('team_id')} className="w-full bg-white border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-medium focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all appearance-none cursor-pointer">
                                        <option value="">Aucune équipe / Non assigné</option>
                                        {teams.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Password Setup */}
                            <div className="bg-slate-50 p-4 rounded-[24px] border border-slate-100">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">Mot de passe initial / Setup</label>
                                <input {...register('password')} type="password" placeholder="••••••••" className="w-full bg-white border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-black focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all tracking-widest" />
                                {errors.password && <p className="text-red-500 text-xs mt-1 pl-2 font-bold">{errors.password.message}</p>}
                                <p className="text-[10px] font-medium text-slate-500 mt-3 flex gap-2"><KeyRound className="w-3.5 h-3.5 shrink-0" /> Le PIN (Code Session) sera demandé à l'utilisateur lors de sa première connexion au portail agent.</p>
                            </div>

                            <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] shadow-xl shadow-indigo-200/50 mt-8 py-5 text-sm font-black uppercase tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                {isSubmitting ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Traitement en cours...</>
                                ) : (
                                    <><CheckCircle2 className="w-5 h-5" /> Enregistrer le Compte</>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: EDIT USER ─────────────────────────────────────────────────── */}
            {editModal.isOpen && editModal.user && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[95vh] overflow-y-auto no-scrollbar shadow-2xl p-10 relative">
                        <button onClick={() => setEditModal({ isOpen: false, user: null })} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center">
                            <XCircle className="w-7 h-7" />
                        </button>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-[24px] flex items-center justify-center shadow-sm">
                                    <Pencil className="w-7 h-7" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">Modifier le Profil</h2>
                                    <p className="text-xs font-bold text-slate-400 mt-1.5 uppercase tracking-[0.2em]">Management Identity & Security</p>
                                </div>
                            </div>

                            {/* Tab Switcher */}
                            <div className="bg-slate-50 p-1.5 rounded-[22px] flex gap-1 border border-slate-100">
                                <button 
                                    onClick={() => setEditTab('info')}
                                    className={`px-6 py-2.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${editTab === 'info' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Informations
                                </button>
                                <button 
                                    onClick={() => setEditTab('nfc')}
                                    className={`px-6 py-2.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${editTab === 'nfc' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Profil NFC
                                </button>
                            </div>
                        </div>

                        {editTab === 'info' ? (
                            <form onSubmit={onEditSubmit} className="space-y-8">
                            <input type="hidden" name="id" value={editModal.user.id} />

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                                {/* Profile Photo Upload */}
                                <div className="md:col-span-3 flex flex-col items-center">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 w-full text-center">Photo de Profil</label>
                                    <div className="relative group cursor-pointer">
                                        <div className="w-32 h-32 rounded-[40px] bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center transition-all group-hover:border-indigo-300">
                                            {photoPreview ? (
                                                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-slate-300 group-hover:text-indigo-400">
                                                    <Camera className="w-8 h-8" />
                                                    <span className="text-[10px] font-black uppercase">Upload</span>
                                                </div>
                                            )}
                                        </div>
                                        <input 
                                            type="file" 
                                            name="photo" 
                                            accept="image/*" 
                                            className="absolute inset-0 opacity-0 cursor-pointer" 
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) setPhotoPreview(URL.createObjectURL(file));
                                            }}
                                        />
                                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white border border-slate-100 rounded-2xl shadow-lg flex items-center justify-center text-indigo-600">
                                            <ImageIcon className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-4 tracking-widest">JPEG, PNG, WEBP (Max 2MB)</p>
                                </div>

                                <div className="md:col-span-9 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 lg:col-span-1">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">Nom Complet</label>
                                            <input name="name" defaultValue={editModal.user.name} required className="w-full bg-white border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-bold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all" />
                                        </div>
                                        <div className="col-span-2 lg:col-span-1">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">Email Professionnel</label>
                                            <input name="email" defaultValue={editModal.user.email} required type="email" className="w-full bg-white border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-bold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">Rôle</label>
                                            <select name="role" defaultValue={editModal.user.role} className="w-full bg-white border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-black focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all appearance-none cursor-pointer">
                                                <option value="SALES_AGENT">Agent Commercial</option>
                                                <option value="TEAM_LEADER">Chef d'Équipe</option>
                                                <option value="ADMINISTRATOR">Administrateur</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">Statut Compte</label>
                                            <select name="active" defaultValue={editModal.user.active} className="w-full bg-white border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-black focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all appearance-none cursor-pointer">
                                                <option value="1">Actif (Accès total)</option>
                                                <option value="0">Désactivé (Banni)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 lg:col-span-1">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">Numéro de Téléphone</label>
                                            <input name="phone_number" defaultValue={editModal.user.phone_number || ""} placeholder="+213..." className="w-full bg-white border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-bold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all" />
                                        </div>
                                        <div className="col-span-2 lg:col-span-1">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">Poste / Titre</label>
                                            <input name="job_title" defaultValue={editModal.user.job_title || ""} placeholder="Ingénieur Commercial" className="w-full bg-white border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-bold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all" />
                                        </div>
                                        <div className="col-span-2 lg:col-span-1">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">Entreprise</label>
                                            <input name="company_name" defaultValue={editModal.user.company_name || ""} placeholder="Wasla Soft" className="w-full bg-white border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-bold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all" />
                                        </div>
                                        <div className="col-span-2 lg:col-span-1">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">Profil LinkedIn (URL)</label>
                                            <input name="linkedin_url" defaultValue={editModal.user.linkedin_url || ""} placeholder="https://linkedin.com/in/..." className="w-full bg-white border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-bold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100 space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <Shield className="w-5 h-5 text-indigo-600" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Overrides de Sécurité</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">Réinitialiser Mot de Passe</label>
                                        <div className="flex gap-2">
                                            <input name="password" type="password" placeholder="••••••••" className="flex-1 bg-white border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-black focus:border-red-400 focus:ring-4 focus:ring-red-50 outline-none transition-all tracking-widest" />
                                            <button 
                                                type="button" 
                                                onClick={() => onResetPassword(editModal.user!.id, editModal.user!.name)}
                                                className="px-4 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl text-[10px] font-black uppercase transition-all whitespace-nowrap"
                                            >
                                                Générer Code
                                            </button>
                                        </div>
                                        <p className="text-[9px] text-slate-400 mt-2 font-medium italic">Laissez vide pour conserver le mot de passe actuel ou générez un code temporaire.</p>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative">
                                                <input type="checkbox" name="resetPin" value="true" className="sr-only peer" />
                                                <div className="w-12 h-6 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 transition-all after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-6 shadow-inner"></div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase text-slate-900 tracking-wider">Réinitialiser le PIN Session</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase">Forcer Setup au prochain Login</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-4">
                                <button type="button" onClick={() => setEditModal({ isOpen: false, user: null })} className="flex-1 px-6 py-5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-[24px] text-sm font-black uppercase tracking-widest transition-all">
                                    Annuler
                                </button>
                                <button type="submit" disabled={isSubmitting} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] shadow-xl shadow-indigo-200/50 py-5 text-sm font-black uppercase tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                    {isSubmitting ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Mise à jour...</>
                                    ) : (
                                        <><CheckCircle2 className="w-5 h-5" /> Enregistrer les Changements</>
                                    )}
                                </button>
                            </div>
                        </form>
                        ) : (
                            <DigitalProfileBuilder 
                                key={editModal.user.id + (editModal.user.updated_at || Date.now())}
                                userId={editModal.user.id}
                                userName={editModal.user.name}
                                initialSlug={editModal.user.profile_slug || ""}
                                initialConfig={editModal.user.profile_config}
                                initialIsActive={editModal.user.profile_is_active === 1}
                                userJob={editModal.user.job_title}
                                userPhoto={editModal.user.image_url ? `${editModal.user.image_url}?v=${new Date(editModal.user.updated_at).getTime()}` : null}
                                brandingLogo={brandingSettings?.logo_url}
                                onSaveSuccess={(freshData) => {
                                    if (!editModal.user) return;
                                    
                                    // 1. Optimistic update: merge fresh data into local state immediately
                                    const updatedUser = {
                                        ...editModal.user,
                                        profile_config: freshData.profile_config,
                                        profile_slug: freshData.profile_slug,
                                        profile_is_active: freshData.profile_is_active,
                                        updated_at: freshData.updated_at, // Changes the key → forces builder remount
                                    };

                                    // 2. Update the users list (no flicker, no round-trip)
                                    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));

                                    // 3. Update the modal with fresh data (changes key → clean remount)
                                    setEditModal(prev => ({ ...prev, user: updatedUser }));

                                    // 4. Background: invalidate Next.js cache + sync list from server
                                    router.refresh();
                                    fetchData();
                                }}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* ── MODAL: RESET CODE SUCCESS ────────────────────────────────────────── */}
            {resetCodeModal?.isOpen && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[60] animate-in fade-in zoom-in duration-300">
                    <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl p-10 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                        
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[30px] flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <KeyRound className="w-10 h-10" />
                        </div>

                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Code Temporaire</h2>
                        <p className="text-sm text-slate-500 font-medium mb-8">
                            Remettez ce code à <span className="font-bold text-slate-900">{resetCodeModal.userName}</span>. <br/>
                            Il sera forcé de changer son mot de passe au prochain login.
                        </p>

                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-6 mb-8 group">
                            <span className="text-4xl font-black text-emerald-600 tracking-[0.2em] font-mono select-all">
                                {resetCodeModal.code}
                            </span>
                        </div>

                        <button 
                            onClick={() => setResetCodeModal(null)}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-[24px] py-5 text-sm font-black uppercase tracking-widest transition-all shadow-xl"
                        >
                            Fermer & Effacer
                        </button>
                    </div>
                </div>
            )}

            {/* ── MODAL: ASSIGN TEAM ───────────────────────────────────────────────── */}
            {assignModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl p-8 relative">
                        <button onClick={() => setAssignModal({ ...assignModal, isOpen: false })} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center">
                            <XCircle className="w-7 h-7" />
                        </button>

                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">Affectation</h2>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{assignModal.userName}</p>
                            </div>
                        </div>

                        <form onSubmit={handleAssignTeam} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">Sélectionner une équipe</label>
                                <select name="team_id" defaultValue={assignModal.currentTeamId || ""} className="w-full bg-white border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-medium focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all appearance-none cursor-pointer">
                                    <option value="">Aucune équipe / Non assigné</option>
                                    {teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-[24px] shadow-xl shadow-blue-200/50 mt-8 py-5 text-sm font-black uppercase tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                {isSubmitting ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Traitement en cours...</>
                                ) : (
                                    <><CheckCircle2 className="w-5 h-5" /> Confirmer l'affectation</>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
