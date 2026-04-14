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
    ImagePlus
} from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
    quick_pin: string | null;
    photo_url: string | null;
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<UserFormValues>({
        resolver: zodResolver(userSchema),
        defaultValues: { role: 'SALES_AGENT' }
    });

    const currentRole = watch('role');

    // ── Photo Upload State ──
    const [uploadingUserId, setUploadingUserId] = useState<string | null>(null);

    const handlePhotoUpload = async (userId: string, file: File) => {
        setUploadingUserId(userId);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', userId);

            const res = await fetch('/api/users/upload-avatar', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');

            toast.success("Photo mise à jour");
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setUploadingUserId(null);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/users');
            if (!res.ok) throw new Error("Erreur de récupération");
            const data = await res.json();
            setUsers(data.users || []);
            setTeams(data.teams || []);
        } catch (error) {
            toast.error("Veuillez vous reconnecter.");
            router.push("/admin/login");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
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
                                                        <label className={`w-10 h-10 rounded-xl flex items-center justify-center relative cursor-pointer overflow-hidden group ${RMap.bg} ${RMap.color}`}>
                                                            {uploadingUserId === u.id ? (
                                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                            ) : u.photo_url ? (
                                                                <>
                                                                    <img src={u.photo_url} alt="Avatar" className="w-full h-full object-cover" />
                                                                    <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                                                                        <ImagePlus className="w-4 h-4 text-white" />
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <RIcon className="w-5 h-5 group-hover:hidden" />
                                                                    <ImagePlus className="w-5 h-5 hidden group-hover:block opacity-50" />
                                                                </>
                                                            )}
                                                            <input 
                                                                type="file" 
                                                                className="hidden" 
                                                                accept="image/jpeg, image/png, image/webp" 
                                                                onChange={(e) => {
                                                                    if (e.target.files?.[0]) handlePhotoUpload(u.id, e.target.files[0]);
                                                                    e.target.value = '';
                                                                }} 
                                                                disabled={uploadingUserId === u.id}
                                                            />
                                                        </label>
                                                        <div>
                                                            <p className="font-black text-slate-900">{u.name}</p>
                                                            {!u.active && <span className="text-[9px] font-black bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full uppercase ml-2">Inactif</span>}
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
        </div>
    );
}
