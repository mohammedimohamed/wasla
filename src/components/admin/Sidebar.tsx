'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Settings,
    BarChart3,
    Database,
    Zap,
    Cpu,
    Brain,
    LogOut,
    Menu,
    X,
    ChevronRight,
    Trophy,
    QrCode,
    Share2,
    ShieldCheck,
    CloudIcon,
    HardDrive,
    LayoutTemplate,
    Sun,
    Moon,
    RefreshCw
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'react-hot-toast';

interface SidebarItem {
    label: string;
    icon: React.ElementType;
    href: string;
    roles?: string[];
    moduleKey?: string;
    badge?: string;
}

interface SidebarProps {
    user: {
        name: string;
        role: string;
    };
    settings: any;
}

export default function Sidebar({ user, settings }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setMounted(true);
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const navigation: SidebarItem[] = [
        { label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
        { label: 'Leads', icon: Database, href: '/leads/list' },
        { label: 'Intelligence', icon: Brain, href: '/admin/intelligence', roles: ['ADMINISTRATOR'] },
        { label: 'Golden Records', icon: Trophy, href: '/admin/golden-records' },
        { label: 'Teams', icon: Users, href: '/admin/teams', roles: ['ADMINISTRATOR', 'TEAM_LEADER'] },
        { label: 'Users', icon: ShieldCheck, href: '/admin/users', roles: ['ADMINISTRATOR'] },
        { label: 'Form Builder', icon: LayoutTemplate, href: '/admin/settings/form-builder', roles: ['ADMINISTRATOR'] },
        { label: 'QR Manager', icon: QrCode, href: '/admin/qr' },
        { label: 'Rewards', icon: Zap, href: '/admin/rewards' },
        { label: 'Analytics', icon: BarChart3, href: '/admin/analytics' },
        { label: 'Export Vault', icon: HardDrive, href: '/admin/export', roles: ['ADMINISTRATOR'] },
        { label: 'Maintenance', icon: Cpu, href: '/admin/maintenance', roles: ['ADMINISTRATOR'] },
        { label: 'Settings', icon: Settings, href: '/admin/settings', roles: ['ADMINISTRATOR'] },
    ];

    // Note: I missed "Brain" icon in imports, fixing it.
    // Wait, let's use Lucide's "Zap" or something if Brain is not there.
    // Lucide has "Brain", but let's check.

    const filteredNav = navigation.filter(item => {
        if (item.roles && !item.roles.includes(user.role)) return false;
        if (item.moduleKey && !settings[item.moduleKey]) return false;
        return true;
    });

    const handleLogout = async () => {
        try {
            await fetch('/api/auth', { method: 'DELETE' });
            router.push('/admin/login');
            toast.success('Déconnecté');
        } catch (e) {
            toast.error('Erreur lors de la déconnexion');
        }
    };

    const isActive = (href: string) => pathname === href;

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-white/5 font-sans overflow-hidden transition-colors duration-300">
            {/* TOP: Brand & Version */}
            <div className="p-6 pb-4">
                <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push('/admin/dashboard')}>
                    <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-xl shadow-indigo-500/20 group-hover:rotate-6 transition-transform">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                            {settings.event_name || 'WASLA'} <span className="text-indigo-500">OS</span>
                        </h1>
                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mt-1">
                            v{process.env.NEXT_PUBLIC_APP_VERSION || '2.0.0'} • {user.role.split('_')[0]}
                        </p>
                    </div>
                </div>
            </div>

            {/* MIDDLE: Scrollable Nav */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar">
                <p className="px-3 py-2 text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] mb-2">Main Navigation</p>
                {filteredNav.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link 
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center justify-between px-4 py-3.5 rounded-xl transition-all group ${
                                active 
                                ? 'bg-indigo-600/10 dark:bg-indigo-500/10 text-indigo-600 dark:text-white shadow-sm' 
                                : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                                <span className={`text-xs font-bold tracking-tight ${active ? 'text-indigo-600 dark:text-white' : ''}`}>
                                    {item.label}
                                </span>
                            </div>
                            {active && <ChevronRight className="w-3 h-3 text-indigo-500" />}
                            {item.badge && (
                                <span className="px-1.5 py-0.5 bg-indigo-500 text-white text-[8px] font-black rounded-md uppercase">
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* BOTTOM: Profile & Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50">
                {/* Theme Toggle */}
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 mb-3 hover:border-indigo-500/50 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-indigo-500 transition-colors">
                            {mounted && (theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />)}
                        </div>
                        <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight">
                            {mounted && (theme === 'dark' ? 'Mode Sombre' : 'Mode Clair')}
                        </span>
                    </div>
                    <div className={`w-8 h-4 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                        <div className={`w-2 h-2 rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                </button>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 mb-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-white/5 shadow-inner">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-[11px] font-black text-slate-900 dark:text-white truncate">{user.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter truncate">{user.role}</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Sign Out"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <div className="flex h-1.5 w-1.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </div>
                        <span className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">System Operational</span>
                    </div>

                    <button 
                        onClick={() => {
                            import('@/lib/recovery').then(m => m.forceAppUpdate());
                        }}
                        className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors group"
                        title="Force update & clear cache"
                    >
                        <RefreshCw className="w-2.5 h-2.5 group-hover:rotate-180 transition-transform duration-500" />
                        Actualiser
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <div className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 z-40">
                <SidebarContent />
            </div>

            {/* Mobile Top Bar */}
            <div className="lg:hidden fixed top-0 inset-x-0 h-16 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-white/5 z-40 flex items-center justify-between px-6 transition-colors duration-300">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                        {settings.event_name || 'WASLA'}
                    </span>
                </div>
                <button 
                    onClick={() => setIsOpen(true)}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* Mobile Drawer */}
            {isOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
                    <div className="fixed inset-y-0 left-0 w-[280px] bg-white dark:bg-slate-950 shadow-2xl animate-slide-in-right">
                        <div className="absolute top-4 right-4 z-50">
                            <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <SidebarContent />
                    </div>
                </div>
            )}
        </>
    );
}

// Add these to globals.css if not present:
// .custom-scrollbar::-webkit-scrollbar { width: 4px; }
// .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
// .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
