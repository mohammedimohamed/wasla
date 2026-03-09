'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LeadForm } from '@/src/components/LeadForm';
import { SyncStatusIcon } from '@/src/components/SyncStatusIcon';
import {
    UserCheck, X, Plus, List, TrendingUp, Loader2,
    Users as UsersIcon
} from 'lucide-react';
import { useTranslation } from '@/src/context/LanguageContext';
import { toast } from 'react-hot-toast';
import { useFormConfig, getTableFields, FormField } from '@/src/hooks/useFormConfig';

/** Unwrap old double-nested leads and return a flat metadata object */
function resolveMeta(lead: any): Record<string, any> {
    try {
        const parsed = typeof lead.metadata === 'string' ? JSON.parse(lead.metadata || '{}') : (lead.metadata || {});
        if (parsed.metadata && typeof parsed.metadata === 'object' && !Array.isArray(parsed.metadata)) {
            return parsed.metadata;
        }
        return parsed;
    } catch (_) { return {}; }
}

interface SessionUser {
    id: string;
    name: string;
    role: 'SALES_AGENT' | 'TEAM_LEADER' | 'ADMINISTRATOR';
}

export default function CommercialPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { config: formConfig } = useFormConfig();
    const TABLE_COLUMNS = formConfig ? getTableFields(formConfig) : [];

    // Session Context
    const [user, setUser] = useState<SessionUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Dashboard States
    const [stats, setStats] = useState<any>(null);
    const [leads, setLeads] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'ADD' | 'LIST'>('ADD');

    // ─────────────────────────────────────────────────────────────────
    // On mount: verify session context. Middleware already blocks access
    // if unauthenticated — this fetch is only to get user data (name, role).
    // ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            try {
                const res = await fetch('/api/auth');
                if (!res.ok) {
                    // Session expired or invalid — hard redirect to login
                    window.location.href = '/login';
                    return;
                }
                const data = await res.json();
                setUser({
                    id: data.user.id,
                    name: data.user.name,
                    role: data.user.role,
                });
                // Fetch dashboard data in parallel after session is confirmed
                await fetchDashboardData();
            } catch (e) {
                window.location.href = '/login';
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [statsRes, leadsRes] = await Promise.all([
                fetch('/api/dashboard/stats'),
                fetch('/api/leads'),
            ]);
            if (statsRes.ok) {
                const d = await statsRes.json();
                setStats(d.data);
            }
            if (leadsRes.ok) {
                const d = await leadsRes.json();
                setLeads(d.leads || []);
            }
        } catch (e) {
            console.error('Dashboard data fetch failed:', e);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth', { method: 'DELETE' });
        window.location.href = '/login';
    };

    // ─────────────────────────────────────────────────────────────────
    // Loading State
    // ─────────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
                <div className="flex flex-col items-center gap-4 text-slate-400">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="font-bold uppercase tracking-widest text-[10px]">Chargement...</p>
                </div>
            </div>
        );
    }

    const isTeamLeader = user?.role === 'TEAM_LEADER';

    // ─────────────────────────────────────────────────────────────────
    // MAIN DASHBOARD (Middleware guarantees auth + PIN are valid here)
    // ─────────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 flex flex-col bg-gray-50">
            {/* ── HEADER ───────────────────────────────────────────── */}
            <header className="p-6 bg-white border-b flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                        <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="font-black text-slate-900 tracking-tight">
                            {user?.name || t('commercial.formTitle')}
                        </h2>
                        <SyncStatusIcon />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Team Performance Badge — visible only to TEAM_LEADER */}
                    {isTeamLeader && stats && (
                        <div className="hidden md:flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl border border-amber-100">
                            <TrendingUp className="w-4 h-4 shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase tracking-wider leading-none">Performances équipe</span>
                                <span className="text-xs font-bold leading-tight">{stats.totalLeads ?? 0} Leads</span>
                            </div>
                        </div>
                    )}

                    <div className="text-right hidden sm:block">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Session Active</p>
                        <p className="text-[10px] font-bold text-slate-500 capitalize">
                            {isTeamLeader ? 'Chef d\'Équipe' : 'Agent Commercial'}
                        </p>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="p-3 hover:bg-red-50 rounded-2xl text-slate-400 hover:text-red-500 transition-all active:scale-95 border border-transparent hover:border-red-100"
                        title="Déconnexion"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* ── MAIN CONTENT ─────────────────────────────────────── */}
            <main className="flex-1 overflow-y-auto pt-6 pb-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">

                    {/* Navigation Tabs */}
                    <div className="flex p-1 bg-slate-200/50 rounded-2xl mb-8 w-fit mx-auto border border-slate-200">
                        <button
                            onClick={() => setActiveTab('ADD')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${activeTab === 'ADD'
                                ? 'bg-white text-primary shadow-md'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Plus className="w-4 h-4" />
                            Ajouter un Lead
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('LIST');
                                fetchDashboardData();
                            }}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${activeTab === 'LIST'
                                ? 'bg-white text-primary shadow-md'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <List className="w-4 h-4" />
                            {isTeamLeader ? 'Leads Équipe' : 'Mes Leads'}
                        </button>
                    </div>

                    {/* ── TAB: ADD LEAD ──────────────────────────── */}
                    {activeTab === 'ADD' && (
                        <>
                            <div className="mb-6 text-center space-y-2">
                                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{t('commercial.formTitle')}</h3>
                                <p className="text-sm text-gray-500 font-medium">{t('commercial.formSubtitle')}</p>
                            </div>

                            <div className="max-w-2xl mx-auto bg-white p-8 rounded-[48px] shadow-2xl shadow-slate-200/50 border border-slate-100 mb-10 transition-all hover:shadow-primary/5">
                                <LeadForm
                                    source="commercial"
                                    onSubmitSuccess={() => {
                                        toast.success(t('kiosk.successMsg'));
                                        fetchDashboardData();
                                    }}
                                />
                            </div>
                        </>
                    )}

                    {/* ── TAB: LEADS LIST ────────────────────────── */}
                    {activeTab === 'LIST' && (
                        <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                                        {isTeamLeader ? 'Leads de mon Équipe' : 'Mes Leads'}
                                    </h3>
                                    {isTeamLeader && (
                                        <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                                            <UsersIcon className="w-3 h-3" />
                                            Tous les leads générés par votre équipe
                                        </p>
                                    )}
                                </div>
                                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
                                    {leads.length} Lead{leads.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {leads.length === 0 ? (
                                <div className="text-center p-16 text-slate-400">
                                    <List className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p className="font-bold text-sm">Aucun lead enregistré pour le moment.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                                {isTeamLeader && (
                                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Auteur</th>
                                                )}
                                                {TABLE_COLUMNS.map(col => (
                                                    <th key={col.name} className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                        {col.label}
                                                    </th>
                                                ))}
                                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Source</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {leads.map((lead: any) => {
                                                const meta = resolveMeta(lead);
                                                return (
                                                    <tr
                                                        key={lead.id}
                                                        onClick={() => router.push(`/leads/${lead.id}`)}
                                                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium text-xs">
                                                            {new Date(lead.created_at).toLocaleDateString('fr-FR', {
                                                                day: '2-digit', month: '2-digit',
                                                                hour: '2-digit', minute: '2-digit'
                                                            })}
                                                        </td>
                                                        {isTeamLeader && (
                                                            <td className="px-6 py-4 text-slate-700 font-bold whitespace-nowrap text-xs">
                                                                {lead.created_by_name || 'Inconnu'}
                                                            </td>
                                                        )}
                                                        {TABLE_COLUMNS.map(col => {
                                                            const raw = meta[col.name];
                                                            let value = "—";
                                                            if (raw !== null && raw !== undefined) {
                                                                value = Array.isArray(raw) ? (raw.join(", ") || "—") : String(raw) || "—";
                                                            }
                                                            const isArray = col.type === 'multiselect' || col.type === 'chip-group';
                                                            return (
                                                                <td key={col.name} className="px-6 py-4 max-w-xs truncate">
                                                                    {isArray ? (
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {(Array.isArray(raw) ? raw : []).slice(0, 2).map((v: string) => (
                                                                                <span key={v} className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold">
                                                                                    {v}
                                                                                </span>
                                                                            ))}
                                                                            {Array.isArray(raw) && raw.length > 2 && (
                                                                                <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold">
                                                                                    +{raw.length - 2}
                                                                                </span>
                                                                            )}
                                                                            {(!Array.isArray(raw) || raw.length === 0) && (
                                                                                <span className="text-slate-300 text-xs">—</span>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-slate-500 text-xs" title={value}>{value}</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="px-6 py-4">
                                                            <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase">
                                                                {lead.source}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
