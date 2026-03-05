"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Plus,
    Users,
    RefreshCw,
    Monitor,
    LogOut
} from "lucide-react";
import toast from "react-hot-toast";

export default function DashboardPage() {
    const router = useRouter();
    const [salesName, setSalesName] = useState("");
    const [isOnline, setIsOnline] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        synced: 0
    });

    useEffect(() => {
        const name = localStorage.getItem("sales_name");
        if (!name) {
            router.push("/login");
            return;
        }
        setSalesName(name);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        setIsOnline(navigator.onLine);

        // Fetch initial stats - placeholder logic
        // In a real app, this would be an API call
        setStats({
            total: 12,
            pending: 3,
            synced: 9
        });

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("sales_name");
        router.push("/login");
    };

    const handleSync = async () => {
        if (!isOnline) {
            toast.error("Connexion requise pour synchroniser");
            return;
        }

        const toastId = toast.loading("Synchronisation en cours...");

        // Simulate sync
        setTimeout(() => {
            toast.success("Synchronisation terminée", { id: toastId });
            setStats(prev => ({
                ...prev,
                pending: 0,
                synced: prev.total
            }));
        }, 2000);
    };

    return (
        <div className="flex-1 flex flex-col pb-20">
            {/* Header */}
            <header className="bg-white border-b p-4 sticky top-0 z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl">
                        W
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-900">Wasla Leads</h1>
                        <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-success' : 'bg-error'}`} />
                            <span className="text-xs text-gray-500 font-medium">
                                {isOnline ? 'En ligne' : 'Hors ligne'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-gray-500">
                    <span className="text-sm font-medium">{salesName}</span>
                    <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-lg">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="p-4 space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-4 rounded-2xl border flex flex-col items-center gap-1 shadow-sm">
                        <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-orange-100 flex flex-col items-center gap-1 shadow-sm relative">
                        {stats.pending > 0 && (
                            <span className="absolute -top-1 -right-1 bg-error text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white font-bold">
                                {stats.pending}
                            </span>
                        )}
                        <span className="text-2xl font-bold text-orange-600">{stats.pending}</span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Attente</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-green-100 flex flex-col items-center gap-1 shadow-sm">
                        <span className="text-2xl font-bold text-green-600">{stats.synced}</span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Sync</span>
                    </div>
                </div>

                {/* CTA Section */}
                <button
                    onClick={() => router.push("/leads/new")}
                    className="w-full bg-primary text-white py-6 rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                >
                    <Plus className="w-6 h-6" />
                    Nouveau Lead
                </button>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => router.push("/leads/list")}
                        className="btn-secondary h-20 flex-col gap-1 rounded-2xl shadow-sm"
                    >
                        <Users className="w-6 h-6 text-gray-500" />
                        <span className="text-sm">Voir Leads</span>
                    </button>

                    <button
                        onClick={handleSync}
                        className="btn-secondary h-20 flex-col gap-1 rounded-2xl shadow-sm"
                    >
                        <RefreshCw className="w-6 h-6 text-gray-500" />
                        <span className="text-sm">Sync</span>
                    </button>
                </div>

                {/* Mode Kiosque Button */}
                <button
                    onClick={() => router.push("/kiosk")}
                    className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-md"
                >
                    <Monitor className="w-6 h-6 text-blue-400" />
                    Activer le Mode Kiosque
                </button>
            </div>
        </div>
    );
}
