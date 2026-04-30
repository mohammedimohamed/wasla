"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Users, Shield, Plus, Loader2, Star, UserPlus, XCircle } from "lucide-react";
import toast from "react-hot-toast";

interface UserData {
    id: string;
    name: string;
    email: string;
    role: string;
    team_id: string | null;
    active?: number;
}

interface TeamData {
    id: string;
    name: string;
    created_at: string;
    users: UserData[];
    leader: UserData | null;
}

export default function AdminTeamsPage() {
    const router = useRouter();
    const [teams, setTeams] = useState<TeamData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [addMemberModal, setAddMemberModal] = useState<{ isOpen: boolean; teamId: string; teamName: string }>({ isOpen: false, teamId: '', teamName: '' });
    const [users, setUsers] = useState<UserData[]>([]);
    const [newTeamName, setNewTeamName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchTeams = async () => {
        setLoading(true);
        try {
            const [resTeams, resUsers] = await Promise.all([
                fetch('/api/teams'),
                fetch('/api/users')
            ]);
            if (!resTeams.ok || !resUsers.ok) throw new Error("Erreur de récupération");
            const dataTeams = await resTeams.json();
            const dataUsers = await resUsers.json();
            setTeams(dataTeams.teams || []);
            setUsers(dataUsers.users || []);
        } catch (error) {
            toast.error("Veuillez vous reconnecter.");
            router.push("/admin/login");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeams();
    }, []);

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTeamName.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newTeamName }),
            });
            if (!res.ok) throw new Error("Erreur lors de la création");
            toast.success("Équipe créée avec succès !");
            setIsCreateModalOpen(false);
            setNewTeamName("");
            fetchTeams();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAssignLeader = async (teamId: string, userId: string) => {
        try {
            const res = await fetch(`/api/teams/${teamId}/leader`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Erreur lors de l'assignation");
            }
            toast.success("Chef d'équipe assigné avec succès !");
            fetchTeams();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const userId = formData.get('user_id') as string;
        if (!userId) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: userId, team_id: addMemberModal.teamId }),
            });
            if (!res.ok) throw new Error("Erreur lors de l'ajout");
            toast.success("Membre ajouté avec succès !");
            setAddMemberModal({ ...addMemberModal, isOpen: false });
            fetchTeams();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/admin/dashboard")}
                        className="p-2 -ml-2 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <ChevronLeft className="w-6 h-6 text-slate-700" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Équipes</h1>
                        <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">Gestion des LEADERS</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-200"
                >
                    <Plus className="w-4 h-4" />
                    Nouvelle Équipe
                </button>
            </header>

            <div className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
                {loading ? (
                    <div className="flex items-center justify-center p-20">
                        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {teams.map(team => (
                            <div key={team.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-black text-slate-900 uppercase">{team.name}</h3>
                                                <span className="bg-red-600 text-white px-3 py-1 rounded-xl text-[10px] font-mono shadow-lg">ID: {team.id || 'N/A'}</span>

                                            </div>
                                            <p className="text-xs text-slate-500 font-medium">{team.users.length} membres</p>
                                        </div>
                                    </div>
                                    {team.leader && (
                                        <div className="px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-2">
                                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase text-amber-700/70 tracking-tight leading-none">Leader</span>
                                                <span className="text-xs font-bold text-amber-700 leading-none mt-0.5">{team.leader.name}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between pl-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Membres</p>
                                        <button
                                            onClick={() => setAddMemberModal({ isOpen: true, teamId: team.id, teamName: team.name })}
                                            title="Ajouter un membre"
                                            className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-colors"
                                        >
                                            <UserPlus className="w-3 h-3" /> Ajouter
                                        </button>
                                    </div>
                                    <div className="bg-slate-50 rounded-2xl p-2 border border-slate-100 space-y-1">
                                        {team.users.length === 0 ? (
                                            <p className="text-xs text-slate-400 text-center py-4">Aucun membre dans cette équipe</p>
                                        ) : (
                                            team.users.map(user => (
                                                <div key={user.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700">{user.name}</p>
                                                        <p className="text-xs text-slate-400">{user.email}</p>
                                                        <p className="text-[10px] font-mono text-red-600 mt-1 font-black uppercase tracking-widest">TEAM ID: {user.team_id || 'N/A'}</p>
                                                    </div>
                                                    {user.id !== team.leader?.id && (
                                                        <button
                                                            onClick={() => handleAssignLeader(team.id, user.id)}
                                                            title="Promouvoir comme leader de l'équipe"
                                                            className="px-3 py-1.5 bg-slate-100 hover:bg-amber-100 text-slate-500 hover:text-amber-700 rounded-lg text-[10px] font-black uppercase transition-colors flex items-center gap-1.5"
                                                        >
                                                            <Star className="w-3 h-3" />
                                                            Promouvoir Leader
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {teams.length === 0 && (
                            <div className="col-span-1 md:col-span-2 text-center p-20 text-slate-400 font-medium bg-white rounded-[32px] border border-slate-100">
                                Aucune équipe existante.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl p-8 relative">
                        <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center">
                            <XCircle className="w-7 h-7" />
                        </button>

                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                <Plus className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Équipe</h2>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Nouvelle équipe</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateTeam} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">Nom de l'équipe</label>
                                <input
                                    type="text"
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    placeholder="Ex: Équipe Alpha"
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-medium focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                                    required
                                />
                            </div>

                            <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] shadow-xl shadow-indigo-200/50 mt-8 py-4 text-sm font-black uppercase tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Créer l'équipe"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {addMemberModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl p-8 relative">
                        <button onClick={() => setAddMemberModal({ ...addMemberModal, isOpen: false })} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center">
                            <XCircle className="w-7 h-7" />
                        </button>

                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                <UserPlus className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">Ajout</h2>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{addMemberModal.teamName}</p>
                            </div>
                        </div>

                        <form onSubmit={handleAddMember} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-2">Sélectionner un agent libre</label>
                                <select name="user_id" required defaultValue="" className="w-full bg-slate-50 border border-slate-200 px-4 py-3.5 rounded-2xl text-sm font-medium focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all appearance-none cursor-pointer">
                                    <option value="" disabled>-- Choisir un agent --</option>
                                    {users.filter(u => !u.team_id && u.role === 'SALES_AGENT' && u.active !== 0).map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                    ))}
                                </select>
                                {users.filter(u => !u.team_id && u.role === 'SALES_AGENT' && u.active !== 0).length === 0 && (
                                    <p className="text-xs text-amber-600 font-bold mt-2 pl-2">Aucun agent libre disponible.</p>
                                )}
                            </div>

                            <button type="submit" disabled={isSubmitting || users.filter(u => !u.team_id && u.role === 'SALES_AGENT' && u.active !== 0).length === 0} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-[24px] shadow-xl shadow-blue-200/50 mt-8 py-4 text-sm font-black uppercase tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ajouter à l'équipe"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
