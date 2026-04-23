"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Monitor, Pencil } from "lucide-react";
import { toast } from "react-hot-toast";
import { useTranslation } from "@/src/context/LanguageContext";
import MediashowOverlay from "../../kiosk/MediashowOverlay";
import { CloudStatus } from "@/src/components/CloudStatus";
import { v4 as uuidv4 } from "uuid";

import WidgetGrid from "./WidgetGrid";
import WidgetPicker from "./WidgetPicker";
import WidgetConfigModal from "./WidgetConfigModal";

const SEED_WIDGETS = [
    { id: uuidv4(), type: 'heading', title: 'Métriques Principales', subtitle: 'Données en temps réel', col_span: 4, position: 0, config: { style: 'minimal' } },
    { id: uuidv4(), type: 'kpi', col_span: 1, position: 1, config: { metric: 'totalLeads', title: 'Total Leads', color: 'blue', icon: 'Users' } },
    { id: uuidv4(), type: 'kpi', col_span: 1, position: 2, config: { metric: 'leadsToday', title: "Aujourd'hui", color: 'emerald', icon: 'Calendar' } },
    { id: uuidv4(), type: 'kpi', col_span: 1, position: 3, config: { metric: 'syncedLeads', title: 'Synchronisés', color: 'indigo', icon: 'RefreshCw' } },
    { id: uuidv4(), type: 'kpi', col_span: 1, position: 4, config: { metric: 'kioskLeads', title: 'Leads Kiosk', color: 'orange', icon: 'Monitor' } },
    { id: uuidv4(), type: 'source-chart', col_span: 2, position: 5, config: {} },
    { id: uuidv4(), type: 'recent-leads', col_span: 2, position: 6, config: { limit: 5 } },
    { id: uuidv4(), type: 'heading', title: 'Accès Rapides & Gouvernance', col_span: 4, position: 7, config: { style: 'minimal' } },
    { id: uuidv4(), type: 'module-link', col_span: 1, position: 8, config: { title: 'Visuel QR Code', description: 'Mode Kiosk public', url: '/admin/qr', icon: 'QrCode', color: 'slate' } },
    { id: uuidv4(), type: 'module-link', col_span: 1, position: 9, config: { title: 'Module Manager', description: 'Gérer fonctionnalités', url: '/admin/modules', icon: 'LayoutGrid', color: 'dark' } },
    { id: uuidv4(), type: 'module-link', col_span: 1, position: 10, config: { title: 'Utilisateurs', description: 'Accès & rôles', url: '/admin/users', icon: 'Users', color: 'blue' } },
    { id: uuidv4(), type: 'module-link', col_span: 1, position: 11, config: { title: 'Équipes', description: 'Leaders & groupes', url: '/admin/teams', icon: 'Users', color: 'indigo' } },
    { id: uuidv4(), type: 'module-link', col_span: 1, position: 12, config: { title: 'Vault', description: 'Chiffrement', url: '/admin/vault', icon: 'ShieldCheck', color: 'indigo' } },
    { id: uuidv4(), type: 'module-link', col_span: 1, position: 13, config: { title: 'Sync Cloud', description: 'Webhooks', url: '/admin/sync', icon: 'Cloud', color: 'indigo' } },
];

export default function DashboardClient() {
    const { t } = useTranslation();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Global Dashboard States
    const [isSignageMode, setIsSignageMode] = useState(false);
    const [mediashowAssets, setMediashowAssets] = useState<any[]>([]);
    const [branding, setBranding] = useState<{ event_name: string, logo_url: string | null }>({
        event_name: 'Wasla Admin',
        logo_url: null
    });
    const [moduleStatus, setModuleStatus] = useState<Record<string, boolean>>({});

    // Widget Studio States
    const [widgets, setWidgets] = useState<any[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                // 1. Fetch Auth & Verify
                const authRes = await fetch('/api/auth');
                if (!authRes.ok) {
                    router.push("/admin/login");
                    return;
                }
                const authData = await authRes.json();
                if (authData.user.role !== 'ADMINISTRATOR' || !authData.user.sessionHasPin) {
                    router.push("/admin/login");
                    return;
                }

                // 2. Fetch Branding & Modules
                const [brandRes, modulesRes, widgetRes] = await Promise.all([
                    fetch('/api/settings'),
                    fetch('/api/admin/modules'),
                    fetch('/api/admin/dashboard-widgets')
                ]);

                if (brandRes.ok) {
                    const brandData = await brandRes.json();
                    setBranding({ event_name: brandData.settings.event_name, logo_url: brandData.settings.logo_url });
                }

                let mappedModules: Record<string, boolean> = {};
                if (modulesRes.ok) {
                    const modulesData = await modulesRes.json();
                    modulesData.forEach((m: any) => { mappedModules[m.id] = m.is_enabled === 1; });
                    setModuleStatus(mappedModules);
                }

                if (mappedModules.mediashow) {
                    const assetsRes = await fetch('/api/mediashow');
                    if (assetsRes.ok) {
                        const assetsData = await assetsRes.json();
                        setMediashowAssets(assetsData.assets || []);
                    }
                }

                // 3. Setup Widgets
                if (widgetRes.ok) {
                    const widgetData = await widgetRes.json();
                    if (widgetData.widgets && widgetData.widgets.length > 0) {
                        setWidgets(widgetData.widgets);
                    } else {
                        // Seed missing dashboard
                        setWidgets(SEED_WIDGETS);
                        setIsDirty(true);
                    }
                }
            } catch (e) {
                toast.error(t('common.error'));
            } finally {
                setIsLoading(false);
            }
        };
        loadDashboard();
    }, [router, t]);

    // Handle beforeunload warning
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const handleLogout = async () => {
        await fetch('/api/auth', { method: 'DELETE' });
        window.location.href = "/admin/login";
    };

    // --- WIDGET EDIT MODE HANDLERS ---
    
    const handleAddWidget = (type: string, colSpan: number) => {
        const newWidget = {
            id: uuidv4(),
            type,
            col_span: colSpan,
            position: widgets.length,
            config: {}
        };
        setWidgets([...widgets, newWidget]);
        setIsDirty(true);
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
    };

    const handleDeleteWidget = (id: string) => {
        if (!window.confirm("Supprimer ce widget ?")) return;
        setWidgets(widgets.filter(w => w.id !== id));
        setIsDirty(true);
    };

    const handleResizeWidget = (id: string) => {
        setWidgets(widgets.map(w => {
            if (w.id === id) {
                return { ...w, col_span: w.col_span === 1 ? 2 : 1 };
            }
            return w;
        }));
        setIsDirty(true);
    };

    const handleSaveConfig = (id: string, newConfig: any) => {
        setWidgets(widgets.map(w => {
            if (w.id === id) {
                return { ...w, config: newConfig, title: newConfig.title || w.title };
            }
            return w;
        }));
        setEditingWidgetId(null);
        setIsDirty(true);
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedItemIndex(index);
        e.dataTransfer.effectAllowed = "move";
        // Minimal invisible image for custom dragging feeling (optional)
        const ghostOut = document.createElement('div');
        ghostOut.style.display = 'none';
        document.body.appendChild(ghostOut);
        e.dataTransfer.setDragImage(ghostOut, 0, 0); 
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedItemIndex === null) return;
        if (draggedItemIndex === index) return;

        const newWidgets = [...widgets];
        const draggedItem = newWidgets[draggedItemIndex];
        
        newWidgets.splice(draggedItemIndex, 1);
        newWidgets.splice(index, 0, draggedItem);
        
        // Re-assign position order
        const reordered = newWidgets.map((w, i) => ({ ...w, position: i }));
        setWidgets(reordered);
        setDraggedItemIndex(index);
        setIsDirty(true);
    };

    const handleDrop = (e: React.DragEvent) => {
        setDraggedItemIndex(null);
    };

    const saveLayout = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/dashboard-widgets', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'bulk_replace', widgets })
            });

            if (!res.ok) throw new Error("Failed to save layout");
            
            toast.success("Mise en page sauvegardée !");
            setIsDirty(false);
            setIsEditMode(false);
            setEditingWidgetId(null);
        } catch (e) {
            toast.error("Erreur lors de la sauvegarde.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
                <div className="flex flex-col items-center gap-4 text-slate-400">
                    <Loader2 className="w-10 h-10 animate-spin" />
                    <p className="font-bold uppercase tracking-widest text-[10px]">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex-1 flex flex-col bg-slate-50 min-h-screen ${isEditMode ? 'pr-80' : ''} transition-all duration-300`}>
            {/* OVERLAYS */}
            {moduleStatus.mediashow && (
                <MediashowOverlay
                    assets={mediashowAssets}
                    isVisible={isSignageMode}
                    onDismiss={() => setIsSignageMode(false)}
                />
            )}

            {moduleStatus.mediashow && mediashowAssets.length > 0 && !isEditMode && (
                <div className="fixed bottom-8 right-8 z-30">
                    <button
                        onClick={() => setIsSignageMode(true)}
                        title="Démarrer le Mediashow"
                        className="w-16 h-16 bg-slate-900 border-4 border-white text-white rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:scale-110 active:scale-95 transition-all group"
                    >
                        <Monitor className="w-7 h-7 group-hover:text-blue-400" />
                    </button>
                </div>
            )}

            {/* HEADER */}
            <header className={`bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm transition-all ${isEditMode ? 'pr-6' : ''}`}>
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/admin/leads/new")} className="p-2 -ml-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors flex items-center gap-2">
                        <Plus className="w-5 h-5 font-black" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Add Lead</span>
                    </button>
                    <div className="flex items-center gap-2 ml-4">
                        {branding.logo_url && <img src={branding.logo_url} alt={branding.event_name} className="w-8 h-8 object-contain" />}
                        <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">{branding.event_name}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <CloudStatus />
                    {!isEditMode && (
                        <button
                            onClick={() => setIsEditMode(true)}
                            className="flex items-center gap-2 text-[10px] font-black p-2 px-4 bg-indigo-50 text-indigo-600 uppercase tracking-widest hover:bg-indigo-100 rounded-full transition-all"
                        >
                            <Pencil className="w-4 h-4" /> Personnaliser
                        </button>
                    )}
                    <button
                        onClick={handleLogout}
                        className="text-[10px] font-black p-2 px-4 bg-slate-100 text-slate-400 uppercase tracking-widest hover:bg-red-50 hover:text-red-500 rounded-full transition-all"
                    >
                        {t('common.logout')}
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="p-6 max-w-5xl mx-auto w-full">
                {isEditMode && (
                    <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-[20px] shadow-sm flex items-center justify-between animate-in fade-in">
                        <div>
                            <h2 className="text-sm font-black text-indigo-900 uppercase tracking-tight">Mode Édition Actif</h2>
                            <p className="text-xs text-indigo-700/80 font-medium">Déplacez, redimensionnez et configurez les widgets.</p>
                        </div>
                    </div>
                )}
                
                <WidgetGrid 
                    widgets={widgets}
                    isEditMode={isEditMode}
                    onEditWidget={setEditingWidgetId}
                    onDeleteWidget={handleDeleteWidget}
                    onResizeWidget={handleResizeWidget}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                />
            </main>

            {/* EDIT MODE PANELS */}
            <WidgetPicker 
                isVisible={isEditMode}
                onClose={() => {
                    if (isDirty && !window.confirm("Vous avez des modifications non enregistrées. Annuler tout de même ?")) return;
                    setIsEditMode(false);
                    // Reload to throw away dirty state? Or just hide picker and let them keep editing?
                    if (isDirty) window.location.reload(); 
                }}
                onAdd={handleAddWidget}
                onSave={saveLayout}
                isSaving={isSaving}
                isDirty={isDirty}
            />

            <WidgetConfigModal
                widget={widgets.find(w => w.id === editingWidgetId)}
                isVisible={!!editingWidgetId}
                onClose={() => setEditingWidgetId(null)}
                onSave={(newConfig) => handleSaveConfig(editingWidgetId!, newConfig)}
            />
        </div>
    );
}
