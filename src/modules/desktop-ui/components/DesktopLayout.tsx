"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    Menu,
    Bell,
    Search,
    User,
    Settings,
    Grid,
    Users,
    BarChart3,
    ShieldCheck,
    Cloud,
    HardDrive,
    LayoutTemplate,
    Gift,
    Brain,
    QrCode,
    Monitor,
} from "lucide-react";
import { useTranslation } from "@/src/context/LanguageContext";
import { CloudStatus } from "@/src/components/CloudStatus";
import { SubBarProvider, useSubBar } from "../context/SubBarContext";

// ─── Inner layout (uses SubBarContext) ──────────────────────────────────────
function DesktopShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useTranslation();
    const { subBar } = useSubBar();

    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("Admin");

    // ── Offline-aware session fetch ─────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            try {
                if (typeof navigator !== "undefined" && !navigator.onLine) {
                    const { getCachedSession } = await import("@/lib/offlineAuthCache");
                    const cached = await getCachedSession();
                    if (cached) {
                        setUserRole(cached.role);
                        setUserName(cached.name || "Admin");
                    }
                    return;
                }
                const res = await fetch("/api/auth");
                if (res.ok) {
                    const data = await res.json();
                    setUserRole(data.user?.role || null);
                    setUserName(data.user?.name || "Admin");
                }
            } catch (err) {
                console.error("Auth check failed:", err);
            }
        };
        init();
    }, []);

    const handleLogout = async () => {
        await fetch("/api/auth", { method: "DELETE" });
        window.location.href = userRole === "ADMINISTRATOR" ? "/admin/login" : "/login";
    };

    const isAdminUser = userRole === "ADMINISTRATOR";
    const isManagerUser = userRole === "ADMINISTRATOR" || userRole === "TEAM_LEADER";

    // ── Nav items (role-aware) ───────────────────────────────────────────────
    const adminNavItems = [
        { icon: Grid, label: "Dashboard", path: "/admin/dashboard" },
        { icon: Users, label: "Leads", path: "/admin/leads/list" },
        { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
        { icon: Users, label: "Équipes", path: "/admin/teams" },
        { icon: Users, label: "Utilisateurs", path: "/admin/users" },
        { icon: Gift, label: "Récompenses", path: "/admin/rewards" },
        { icon: Brain, label: "Intelligence", path: "/admin/intelligence" },
        { icon: ShieldCheck, label: "Vault", path: "/admin/vault" },
        { icon: Monitor, label: "Mediashow", path: "/admin/mediashow" },
        { icon: Cloud, label: "Sync Cloud", path: "/admin/sync" },
        { icon: QrCode, label: "QR Code", path: "/admin/qr" },
        { icon: LayoutTemplate, label: "Form Builder", path: "/admin/settings/form-builder" },
        { icon: Settings, label: "Paramètres", path: "/admin/settings" },
        { icon: HardDrive, label: "Maintenance", path: "/admin/maintenance" },
    ];

    const agentNavItems = [
        { icon: Grid, label: "Dashboard", path: "/dashboard" },
        { icon: Users, label: "Leads", path: "/leads/list" },
    ];

    const navItems = isAdminUser ? adminNavItems : agentNavItems;

    return (
        // The ONE and ONLY shell. h-screen, no overflow on root.
        <div className="flex h-screen bg-slate-100 overflow-hidden text-slate-800 font-sans">

            {/* ── SIDEBAR ───────────────────────────────────────────────────── */}
            <aside
                className={`bg-[#2c3e50] text-slate-300 flex flex-col transition-all duration-300 z-20 shadow-xl flex-shrink-0 ${
                    isSidebarCollapsed ? "w-[56px]" : "w-[220px]"
                }`}
            >
                {/* Logo row */}
                <div className="h-[48px] flex items-center justify-between px-3 bg-[#1e2d3d] flex-shrink-0">
                    {!isSidebarCollapsed && (
                        <span className="font-black text-white uppercase tracking-widest text-xs truncate">
                            Wasla CRM
                        </span>
                    )}
                    <button
                        onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
                        className="text-slate-400 hover:text-white p-1 rounded transition-colors flex-shrink-0"
                        aria-label="Toggle sidebar"
                    >
                        <Menu size={18} />
                    </button>
                </div>

                {/* Nav items */}
                <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
                    {navItems.map((item, idx) => {
                        const isActive = pathname === item.path || pathname.startsWith(item.path + "/");
                        return (
                            <button
                                key={idx}
                                onClick={() => router.push(item.path)}
                                title={item.label}
                                className={`w-full flex items-center gap-3 px-3 py-2 transition-colors text-left ${
                                    isActive
                                        ? "bg-[#1abc9c]/20 text-[#1abc9c] border-l-4 border-[#1abc9c]"
                                        : "hover:bg-white/5 hover:text-white border-l-4 border-transparent text-slate-400"
                                }`}
                            >
                                <item.icon size={17} className="flex-shrink-0" />
                                {!isSidebarCollapsed && (
                                    <span className="text-[13px] font-medium truncate">{item.label}</span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* User footer */}
                {!isSidebarCollapsed && (
                    <div className="border-t border-white/5 px-3 py-3 flex items-center gap-2 flex-shrink-0">
                        <div className="w-7 h-7 rounded-full bg-[#1abc9c]/20 flex items-center justify-center flex-shrink-0">
                            <User size={14} className="text-[#1abc9c]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-white truncate">{userName}</p>
                            <p className="text-[10px] text-slate-500 truncate">{userRole || "..."}</p>
                        </div>
                    </div>
                )}
            </aside>

            {/* ── MAIN COLUMN ───────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* ── TOPBAR (h-[48px]) ──────────────────────────────────────── */}
                <header className="h-[48px] bg-[#714B67] text-white flex items-center justify-between px-4 shadow-md z-10 flex-shrink-0">
                    {/* Left: app home icon */}
                    <div className="flex items-center gap-3">
                        <Grid
                            size={18}
                            className="text-white/70 cursor-pointer hover:text-white transition-colors"
                            onClick={() => router.push(isAdminUser ? "/admin/dashboard" : "/dashboard")}
                        />
                        <span className="text-[13px] font-semibold text-white/80 hidden sm:block">
                            Wasla CRM
                        </span>
                    </div>

                    {/* Center: search */}
                    <div className="hidden md:flex flex-1 max-w-sm mx-6">
                        <div className="relative w-full">
                            <input
                                type="text"
                                placeholder={t("common.search") || "Rechercher..."}
                                className="w-full bg-white/15 text-white placeholder-white/40 border border-white/10 rounded-md px-3 py-1 focus:outline-none focus:bg-white/25 transition-colors text-[13px]"
                            />
                            <Search className="absolute right-2.5 top-1.5 text-white/50" size={14} />
                        </div>
                    </div>

                    {/* Right: cloud + notifications + user */}
                    <div className="flex items-center gap-3">
                        <CloudStatus />
                        <button className="text-white/70 hover:text-white relative" aria-label="Notifications">
                            <Bell size={17} />
                        </button>
                        <div className="h-5 w-px bg-white/15 mx-0.5" />
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1.5 hover:bg-white/10 px-2 py-1 rounded transition-colors"
                            title="Se déconnecter"
                        >
                            <User size={17} className="text-white/70" />
                            <span className="text-[12px] font-medium hidden sm:block max-w-[80px] truncate">
                                {userName}
                            </span>
                        </button>
                    </div>
                </header>

                {/* ── SUB-BAR (h-[40px]) — single source of truth ───────────── */}
                <div className="h-[40px] bg-white border-b border-slate-200 flex items-center justify-between px-4 gap-4 flex-shrink-0 shadow-sm z-0">
                    {/* Title + subtitle from child pages via context */}
                    <div className="flex items-center gap-2 min-w-0">
                        {subBar.title ? (
                            <>
                                <span className="text-[13px] font-bold text-slate-800 truncate">
                                    {subBar.title}
                                </span>
                                {subBar.subtitle && (
                                    <span className="text-[11px] text-slate-400 font-medium truncate hidden sm:block">
                                        — {subBar.subtitle}
                                    </span>
                                )}
                            </>
                        ) : (
                            <span className="text-[12px] text-slate-400 font-medium">Wasla CRM</span>
                        )}
                    </div>
                    {/* Action buttons injected by child pages */}
                    {subBar.actions && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {subBar.actions}
                        </div>
                    )}
                </div>

                {/* ── CONTENT AREA (fills remaining height, scrollable) ──────── */}
                <main className="flex-1 overflow-y-auto bg-slate-50">
                    {children}
                </main>
            </div>
        </div>
    );
}

// ─── Public wrapper: injects the SubBarProvider ──────────────────────────────
export function DesktopLayout({ children }: { children: React.ReactNode }) {
    return (
        <SubBarProvider>
            <DesktopShell>{children}</DesktopShell>
        </SubBarProvider>
    );
}
