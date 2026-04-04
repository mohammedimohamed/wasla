'use client';

import { useEffect, useState } from 'react';
import {
    Cloud, CloudOff, CloudUpload, RefreshCw, Settings, Zap,
    CheckCircle2, XCircle, Clock, AlertTriangle, Link2, RotateCcw,
    Activity, Shield, Database, ArrowLeft, Eye, EyeOff,
    ChevronDown, ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface SyncCloudConfig {
    id: string;
    webhook_url: string | null;
    is_active: number;
    max_retries: number;
    updated_at: string;
    updated_by?: string;
}

interface QueueStats {
    pending: number;
    failed: number;
    synced: number;
    total: number;
}

interface QueueItem {
    id: number;
    operation: string;
    entity_type: string;
    entity_id: string;
    status: string;
    attempts: number;
    error_message?: string;
    target_url?: string;
    created_at: string;
    last_attempt_at?: string;
}

interface PageData {
    config: SyncCloudConfig | null;
    stats: QueueStats;
    items: QueueItem[];
}

export default function AdminSyncPage() {
    const [data, setData] = useState<PageData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isForceSyncing, setIsForceSyncing] = useState(false);
    const [isRequeueing, setIsRequeueing] = useState(false);
    const [showWebhookUrl, setShowWebhookUrl] = useState(false);
    const [showQueue, setShowQueue] = useState(false);

    // Form state
    const [webhookUrl, setWebhookUrl] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [maxRetries, setMaxRetries] = useState(5);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/admin/sync-cloud');
            if (res.ok) {
                const json: PageData = await res.json();
                setData(json);
                setWebhookUrl(json.config?.webhook_url || '');
                setIsActive(!!json.config?.is_active);
                setMaxRetries(json.config?.max_retries || 5);
            }
        } catch {
            toast.error('Impossible de charger la configuration sync');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/sync-cloud', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_config',
                    webhook_url: webhookUrl || null,
                    is_active: isActive ? 1 : 0,
                    max_retries: maxRetries,
                }),
            });
            const json = await res.json();
            if (res.ok) {
                toast.success(json.message || 'Configuration sauvegardée');
                fetchData();
            } else {
                toast.error(json.error || 'Erreur de sauvegarde');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleForceSync = async () => {
        setIsForceSyncing(true);
        try {
            const res = await fetch('/api/admin/sync-cloud', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'force_sync' }),
            });
            const json = await res.json();
            if (res.ok) {
                toast.success(json.message || 'Sync lancée');
                setTimeout(fetchData, 2000);
            } else {
                toast.error(json.error || 'Échec du lancement');
            }
        } finally {
            setIsForceSyncing(false);
        }
    };

    const handleRequeue = async () => {
        setIsRequeueing(true);
        try {
            const res = await fetch('/api/admin/sync-cloud', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'requeue_failed' }),
            });
            const json = await res.json();
            if (res.ok) {
                toast.success(json.message);
                fetchData();
            } else {
                toast.error(json.error || 'Erreur');
            }
        } finally {
            setIsRequeueing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, { cls: string; icon: React.ReactNode }> = {
            pending: { cls: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Clock className="w-3 h-3" /> },
            synced: { cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <CheckCircle2 className="w-3 h-3" /> },
            failed: { cls: 'bg-red-100 text-red-800 border-red-200', icon: <XCircle className="w-3 h-3" /> },
        };
        const { cls, icon } = map[status] || map.pending;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
                {icon} {status.toUpperCase()}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-slate-500 text-sm font-medium">Chargement...</p>
                </div>
            </div>
        );
    }

    const stats = data?.stats || { pending: 0, failed: 0, synced: 0, total: 0 };
    const overallHealth = stats.pending === 0 && stats.failed === 0 ? 'healthy' : stats.failed > 0 ? 'critical' : 'warning';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
            {/* ── Header ── */}
            <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/admin/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-black flex items-center gap-2">
                                <Cloud className="w-5 h-5 text-indigo-400" />
                                Sync Cloud Intelligent
                            </h1>
                            <p className="text-xs text-slate-400 mt-0.5">Gestion de la synchronisation & Webhooks</p>
                        </div>
                    </div>

                    {/* Live Health Badge */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
                        overallHealth === 'healthy'
                            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                            : overallHealth === 'critical'
                            ? 'bg-red-500/20 border-red-500/30 text-red-300'
                            : 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                    }`}>
                        <span className={`w-2 h-2 rounded-full ${
                            overallHealth === 'healthy' ? 'bg-emerald-400' : overallHealth === 'critical' ? 'bg-red-400 animate-pulse' : 'bg-amber-400 animate-pulse'
                        }`} />
                        {overallHealth === 'healthy' ? 'Système Sain' : overallHealth === 'critical' ? 'Attention Requise' : 'En Attente'}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

                {/* ── Stats Row ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'En Attente', value: stats.pending, icon: <Clock className="w-5 h-5" />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                        { label: 'Échoués', value: stats.failed, icon: <XCircle className="w-5 h-5" />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                        { label: 'Synchronisés', value: stats.synced, icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                        { label: 'Total File', value: stats.total, icon: <Database className="w-5 h-5" />, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
                    ].map(stat => (
                        <div key={stat.label} className={`rounded-2xl border p-4 ${stat.bg}`}>
                            <div className={`${stat.color} mb-2`}>{stat.icon}</div>
                            <div className="text-3xl font-black">{stat.value}</div>
                            <div className="text-xs text-slate-400 font-medium mt-1">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* ── Quick Actions ── */}
                <div className="grid sm:grid-cols-2 gap-4">
                    <button
                        onClick={handleForceSync}
                        disabled={isForceSyncing || !data?.config?.webhook_url}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-all font-bold text-sm shadow-lg shadow-indigo-900/40 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {isForceSyncing ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                            <Zap className="w-5 h-5" />
                        )}
                        <div className="text-left">
                            <div>Forcer la Synchronisation</div>
                            <div className="text-indigo-300 text-xs font-normal">Envoi immédiat vers le webhook</div>
                        </div>
                    </button>

                    <button
                        onClick={handleRequeue}
                        disabled={isRequeueing || stats.failed === 0}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-all font-bold text-sm shadow-lg shadow-amber-900/40 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {isRequeueing ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                            <RotateCcw className="w-5 h-5" />
                        )}
                        <div className="text-left">
                            <div>Remettre en File</div>
                            <div className="text-amber-300 text-xs font-normal">
                                {stats.failed > 0 ? `${stats.failed} élément(s) échoué(s)` : 'Aucun échec en attente'}
                            </div>
                        </div>
                    </button>
                </div>

                {/* ── Webhook Configuration ── */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                            <Settings className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="font-black text-base">Configuration Webhook</h2>
                            <p className="text-xs text-slate-400">Destination n8n, Zapier ou endpoint personnalisé</p>
                        </div>
                    </div>

                    {/* Webhook URL */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">URL de destination</label>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type={showWebhookUrl ? 'text' : 'password'}
                                    value={webhookUrl}
                                    onChange={e => setWebhookUrl(e.target.value)}
                                    placeholder="https://n8n.yourhost.com/webhook/xxxxx"
                                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                />
                            </div>
                            <button
                                onClick={() => setShowWebhookUrl(v => !v)}
                                className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                                title={showWebhookUrl ? 'Masquer' : 'Afficher'}
                            >
                                {showWebhookUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Toggle + Retries */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                            <div>
                                <div className="text-sm font-bold">Sync Automatique</div>
                                <div className="text-xs text-slate-500 mt-0.5">Activer l'envoi au webhook</div>
                            </div>
                            <button
                                onClick={() => setIsActive(v => !v)}
                                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${isActive ? 'bg-emerald-500' : 'bg-slate-700'}`}
                            >
                                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${isActive ? 'translate-x-6' : ''}`} />
                            </button>
                        </div>

                        <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                            <div className="text-sm font-bold mb-2">Tentatives Max (Backoff)</div>
                            <input
                                type="number"
                                min={1} max={20}
                                value={maxRetries}
                                onChange={e => setMaxRetries(Number(e.target.value))}
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-all"
                            />
                            <p className="text-xs text-slate-500 mt-1">Backoff exponentiel: 1s, 2s, 4s, 8s...</p>
                        </div>
                    </div>

                    <button
                        onClick={handleSaveConfig}
                        disabled={isSaving}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-bold text-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                        {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                        {isSaving ? 'Sauvegarde...' : 'Sauvegarder la Configuration'}
                    </button>
                </div>

                {/* ── Queue Items ── */}
                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                    <button
                        onClick={() => setShowQueue(v => !v)}
                        className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Activity className="w-5 h-5 text-indigo-400" />
                            <div className="text-left">
                                <h2 className="font-black text-base">File d'Attente Détaillée</h2>
                                <p className="text-xs text-slate-400">Derniers {data?.items?.length || 0} événements</p>
                            </div>
                        </div>
                        {showQueue ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </button>

                    {showQueue && (
                        <div className="border-t border-white/10 divide-y divide-white/5">
                            {(!data?.items || data.items.length === 0) ? (
                                <div className="py-12 text-center">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                                    <p className="text-slate-400 font-medium">File d'attente vide</p>
                                </div>
                            ) : data.items.map(item => (
                                <div key={item.id} className="px-6 py-4 flex items-start gap-4 hover:bg-white/5 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {getStatusBadge(item.status)}
                                            <span className="text-xs font-mono text-slate-400">#{item.id}</span>
                                            <span className="text-xs bg-white/10 px-2 py-0.5 rounded font-mono">
                                                {item.operation} {item.entity_type}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1 font-mono truncate">
                                            {item.entity_id}
                                        </p>
                                        {item.error_message && (
                                            <p className="text-xs text-red-400 mt-1 truncate">
                                                ⚠ {item.error_message}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-xs text-slate-500">{item.attempts} tentative(s)</div>
                                        <div className="text-xs text-slate-600 mt-0.5">
                                            {new Date(item.created_at).toLocaleTimeString('fr-FR')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Info Banner ── */}
                <div className="flex items-start gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-sm">
                    <AlertTriangle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div className="text-slate-300">
                        <strong className="text-indigo-300">Offline-First:</strong> Les leads saisis hors-ligne sont conservés dans IndexedDB (navigateur) et SQLite (serveur). Le Sync Engine les pousse automatiquement vers votre webhook dès que le réseau est disponible, avec un délai exponentiel entre chaque tentative.
                    </div>
                </div>
            </div>
        </div>
    );
}
