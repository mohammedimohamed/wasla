'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Plus, Trash2, GripVertical, Save, Loader2,
    Image as ImageIcon, Film, Upload, RefreshCw, Eye, MoveUp, MoveDown, Monitor
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Asset {
    id: string;
    type: 'image' | 'video';
    url: string;
    order_index: number;
    duration: number;
}

export default function MediashowAdminPage() {
    const router = useRouter();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [settings, setSettings] = useState({ mediashow_enabled: false, idle_timeout: 60 });
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isOfflineMode, setIsOfflineMode] = useState(false); // 🧪 OFFLINE TEST TOGGLE

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [assetsRes, settingsRes] = await Promise.all([
                fetch('/api/admin/mediashow'),
                fetch('/api/settings')
            ]);

            if (assetsRes.ok) {
                const data = await assetsRes.json();
                setAssets(data.assets);
            }

            if (settingsRes.ok) {
                const data = await settingsRes.json();
                if (data.settings) {
                    setSettings({
                        mediashow_enabled: !!data.settings.mediashow_enabled,
                        idle_timeout: data.settings.idle_timeout || 60
                    });
                }
            }
        } catch (e) {
            toast.error('Erreur de chargement');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('duration', '10'); // Default 10s

        try {
            const res = await fetch('/api/admin/mediashow', {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                toast.success('Média ajouté');
                loadData();
            } else {
                toast.error('Échec de l\'upload');
            }
        } catch (e) {
            toast.error('Erreur réseau');
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const deleteAsset = async (id: string, url: string) => {
        if (!confirm('Supprimer ce média ?')) return;
        try {
            const res = await fetch(`/api/admin/mediashow?id=${id}&url=${url}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                toast.success('Média supprimé');
                setAssets(assets.filter(a => a.id !== id));
            }
        } catch (e) {
            toast.error('Erreur suppression');
        }
    };

    const moveAsset = async (index: number, direction: 'up' | 'down') => {
        const newAssets = [...assets];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newAssets.length) return;

        [newAssets[index], newAssets[targetIndex]] = [newAssets[targetIndex], newAssets[index]];
        setAssets(newAssets);

        // Update DB
        const orders = newAssets.map((a, i) => ({ id: a.id, order_index: i }));
        await fetch('/api/admin/mediashow', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orders })
        });
    };

    const saveSettings = async () => {
        setIsSavingSettings(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mediashow_enabled: !!settings.mediashow_enabled,
                    idle_timeout: settings.idle_timeout
                })
            });
            if (res.ok) {
                toast.success('Configuration mise à jour');
            }
        } catch (e) {
            toast.error('Erreur sauvegarde');
        } finally {
            setIsSavingSettings(false);
        }
    };

    const syncOfflineCache = async () => {
        toast.loading('Synchronisation du cache...', { id: 'sync' });
        try {
            // Manually fetch all assets to force Service Worker caching
            const fetchPromises = assets.map(asset =>
                fetch(asset.url, { mode: 'no-cors', cache: 'reload' })
            );
            await Promise.all(fetchPromises);
            toast.success('Cache synchronisé pour l\'utilisation hors-ligne', { id: 'sync' });
        } catch (e) {
            toast.error('Échec de la synchronisation', { id: 'sync' });
        }
    };

    if (isLoading) return <div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-300" /></div>;

    return (
        <div className="flex-1 selection:bg-indigo-500/30 font-sans">
            <main className="p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-10">
                
                {/* ── SUB-HEADER ── */}
                <div className="flex flex-wrap items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Mediashow <span className="text-primary">Attract Mode</span></h2>
                        <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase flex items-center gap-2">
                            Digital Signage Playlist
                            {isOfflineMode && <span className="bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded text-[8px]">OFFLINE SIMULATOR</span>}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={syncOfflineCache}
                            className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100"
                        >
                            <RefreshCw className="w-4 h-4" /> Sync Cache
                        </button>
                        <button
                            type="button"
                            onClick={saveSettings}
                            disabled={isSavingSettings}
                            className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                        >
                            {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Sauvegarder
                        </button>
                    </div>
                </div>

                {/* 🔧 SETTINGS PANEL */}
                <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Configuration Globale</h3>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div>
                                <p className="text-sm font-black text-slate-700">Activer le Mediashow</p>
                                <p className="text-[10px] font-bold text-slate-400">Diffusion automatique quand le kiosque est inactif</p>
                            </div>
                            <button
                                onClick={() => setSettings({ ...settings, mediashow_enabled: !settings.mediashow_enabled })}
                                className={`w-12 h-6 rounded-full transition-all relative ${settings.mediashow_enabled ? 'bg-primary' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.mediashow_enabled ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Délai d'inactivité</h3>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                            <div className="flex justify-between text-[11px] font-black uppercase text-slate-500">
                                <span>Timeout (Secondes)</span>
                                <span className="text-primary">{settings.idle_timeout}s</span>
                            </div>
                            <input
                                type="range" min="10" max="300" step="10"
                                value={settings.idle_timeout}
                                onChange={(e) => setSettings({ ...settings, idle_timeout: parseInt(e.target.value) })}
                                className="w-full accent-primary h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* 🧪 Simulator Toggle */}
                    <div className="md:col-span-2 flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100 mt-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-200/50 text-amber-700 rounded-xl flex items-center justify-center">
                                <RefreshCw className={`w-5 h-5 ${isOfflineMode ? 'animate-spin-slow' : ''}`} />
                            </div>
                            <div>
                                <p className="text-sm font-black text-amber-900">Mode Test Hors-Ligne</p>
                                <p className="text-[10px] font-bold text-amber-700/70 lowercase uppercase tracking-wider">Simule l'absence de réseau pour vérifier le cache PWA</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOfflineMode(!isOfflineMode)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isOfflineMode ? 'bg-amber-600 text-white shadow-lg' : 'bg-amber-200/50 text-amber-700'}`}
                        >
                            {isOfflineMode ? 'Désactiver' : 'Activer le TEST'}
                        </button>
                    </div>
                </section>

                {/* 📂 ASSET MANAGEMENT */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Playliste Multimédia</h3>
                            <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter flex items-center gap-1">
                                <Monitor className="w-3 h-3" /> Ideal: 1920x1080 (Landscape Fullscreen)
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => router.push('/kiosk')}
                                className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2"
                            >
                                <Eye className="w-4 h-4" /> Voir le Kiosk
                            </button>
                            <label className="cursor-pointer bg-white border-2 border-dashed border-slate-200 hover:border-primary hover:text-primary text-slate-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                {isUploading ? 'Chargement...' : 'Ajouter un média'}
                                <input type="file" className="hidden" accept="image/*,video/*" onChange={handleUpload} disabled={isUploading} />
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.isArray(assets) && assets.map((asset, index) => (
                            <div key={asset.id} className="group bg-white dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col transition-colors duration-300">
                                <div className="aspect-video bg-slate-100 dark:bg-slate-950 relative overflow-hidden">
                                    {asset.type === 'video' ? (
                                        <video src={asset.url} className="w-full h-full object-cover" muted />
                                    ) : (
                                        <img src={asset.url} className="w-full h-full object-cover" alt="" />
                                    )}
                                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 dark:bg-black/70 backdrop-blur-md rounded-lg text-[10px] font-black text-white uppercase tracking-tighter flex items-center gap-1">
                                        {asset.type === 'video' ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                                        {asset.type}
                                    </div>
                                    <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button onClick={() => window.open(asset.url, '_blank')} className="p-2 bg-white dark:bg-slate-900 rounded-full text-indigo-600 dark:text-indigo-400 shadow-xl hover:scale-110 transition-all"><Eye className="w-4 h-4" /></button>
                                        <button onClick={() => deleteAsset(asset.id, asset.url)} className="p-2 bg-white dark:bg-slate-900 rounded-full text-red-500 dark:text-red-400 shadow-xl hover:scale-110 transition-all"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                <div className="p-4 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl flex items-center justify-center text-xs font-black text-slate-400 dark:text-slate-500">
                                            #{index + 1}
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate max-w-[100px]">{asset.url.split('/').pop()}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            disabled={index === 0}
                                            onClick={() => moveAsset(index, 'up')}
                                            className="p-1.5 bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg disabled:opacity-30 transition-all"
                                        >
                                            <MoveUp className="w-4 h-4" />
                                        </button>
                                        <button
                                            disabled={index === assets.length - 1}
                                            onClick={() => moveAsset(index, 'down')}
                                            className="p-1.5 bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg disabled:opacity-30 transition-all"
                                        >
                                            <MoveDown className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {assets.length === 0 && !isUploading && (
                            <div className="col-span-full py-20 bg-slate-50 dark:bg-white/5 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest transition-colors">
                                <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                                Aucune média dans la playliste
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
