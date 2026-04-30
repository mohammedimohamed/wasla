export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { userDb, settingsDb } from '@/lib/db';
import { DigitalProfileConfig } from '@/lib/schemas';
import * as Icons from 'lucide-react';
import Link from 'next/link';
import { Slideshow } from '@/src/components/Slideshow';

interface PublicProfilePageProps {
    params: Promise<{ profile_slug: string }>;
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
    const { profile_slug } = await params;
    const user = userDb.findBySlug(profile_slug);
    if (!user || !user.profile_is_active) return { title: 'Profil non disponible' };

    return {
        title: `${user.name} | Digital Profile`,
        description: user.job_title || 'Agent Wasla',
        openGraph: {
            title: user.name,
            description: user.job_title || '',
            images: user.image_url ? [user.image_url] : [],
        }
    };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
    const { profile_slug } = await params;
    let user = userDb.findBySlug(profile_slug);
    const settings = settingsDb.get();
    let isEnterpriseFallback = false;

    // 🛡️ Fallback Logic: If user missing or deactivated, show Enterprise Profile
    if (!user || !user.profile_is_active || user.account_status === 'Deactivated') {
        user = userDb.findEnterpriseDefault();
        isEnterpriseFallback = true;
    }

    if (!user) {
        notFound();
    }

    const config: DigitalProfileConfig = user.profile_config 
        ? JSON.parse(user.profile_config) 
        : { theme: 'light', blocks: [] };

    const isDark = config.theme === 'dark';

    return (
        <div className={`min-h-screen flex flex-col items-center p-6 transition-colors duration-500 ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
            
            {/* 🏢 Company Header */}
            <header className="w-full flex justify-center mb-10">
                {settings.logo_url && settings.logo_url !== 'null' ? (
                    <img src={settings.logo_url} alt={settings.event_name} className="h-12 object-contain" />
                ) : (
                    <h2 className="text-xl font-black tracking-tighter uppercase">{settings.event_name}</h2>
                )}
            </header>

            {/* 👤 Profile Identity */}
            <div className="flex flex-col items-center text-center mb-8">
                <div className={`w-32 h-32 rounded-[48px] overflow-hidden mb-4 border-4 ${isDark ? 'border-slate-800' : 'border-white'} shadow-2xl`}>
                    {user.image_url && user.image_url !== 'null' ? (
                        <img src={`${user.image_url}?v=${new Date(user.updated_at || Date.now()).getTime()}`} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white text-4xl font-black">
                            {user.name.charAt(0)}
                        </div>
                    )}
                </div>
                <h1 className="text-3xl font-black tracking-tight mb-1">{user.name}</h1>
                <div className="flex flex-col items-center gap-2">
                    <p className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {config.job_title || user.job_title || 'Expert Solutions'}
                    </p>
                    {(isEnterpriseFallback || user.is_enterprise_default === 1) && (
                        <span className="bg-indigo-600/10 text-indigo-600 text-[10px] font-black uppercase px-3 py-1 rounded-full border border-indigo-600/20 tracking-widest">
                            Page Officielle
                        </span>
                    )}
                </div>
            </div>

            {/* 🧱 Dynamic Blocks */}
            <div className="w-full max-w-md space-y-4 mb-24">
                {config.blocks.map((block, idx) => {
                    if (block.type === 'social_grid') {
                        return (
                            <div key={idx} className="grid grid-cols-3 gap-4 py-2">
                                {block.items.map((item, i) => {
                                    const IconComponent = (Icons as any)[item.icon] || Icons.Link;
                                    return (
                                        <a 
                                            key={i} 
                                            href={item.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className={`flex flex-col items-center justify-center p-4 rounded-3xl transition-all active:scale-95 shadow-sm ${isDark ? 'bg-slate-900 hover:bg-slate-800' : 'bg-white hover:bg-slate-100'}`}
                                        >
                                            <IconComponent className="w-6 h-6 mb-2 text-indigo-500" />
                                            <span className="text-[10px] font-black uppercase tracking-wider opacity-60">{item.platform}</span>
                                        </a>
                                    );
                                })}
                            </div>
                        );
                    }

                    if (block.type === 'action_button') {
                        let href = block.value;
                        if (block.action === 'call') href = `tel:${block.value}`;
                        if (block.action === 'email') href = `mailto:${block.value}`;
                        if (block.action === 'save_vcard') href = `/api/vcard/${profile_slug}`;

                        return (
                            <a 
                                key={idx} 
                                href={href} 
                                target={block.action === 'link' ? '_blank' : undefined}
                                className={`w-full py-4 px-6 rounded-2xl font-black text-center transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-3 ${
                                    block.action === 'save_vcard' 
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                                    : isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 border border-slate-100'
                                }`}
                            >
                                {block.action === 'call' && <Icons.Phone className="w-5 h-5" />}
                                {block.action === 'save_vcard' && <Icons.UserPlus className="w-5 h-5" />}
                                {block.label}
                            </a>
                        );
                    }

                    if (block.type === 'free_text') {
                        return (
                            <div key={idx} className={`p-5 rounded-3xl text-sm leading-relaxed ${isDark ? 'bg-slate-900/50' : 'bg-white/50 border border-slate-100'}`}>
                                {block.content}
                            </div>
                        );
                    }

                    if (block.type === 'file') {
                        return (
                            <a 
                                key={idx}
                                href={block.fileUrl}
                                download
                                className="w-full py-4 px-6 rounded-2xl font-black text-center transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-3 bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                <Icons.Download className="w-5 h-5" />
                                {block.label}
                            </a>
                        );
                    }

                    if (block.type === 'media') {
                        if (!block.items || block.items.length === 0) return null;
                        return (
                            <div key={idx} className="w-full shadow-2xl rounded-3xl overflow-hidden">
                                {block.items.length === 1 ? (
                                    block.items[0].type === 'video' ? (
                                        <video src={block.items[0].url} className="w-full aspect-video object-cover" autoPlay muted loop playsInline />
                                    ) : (
                                        block.items[0].url && block.items[0].url !== 'null' && (
                                            <img src={block.items[0].url} className="w-full aspect-video object-cover" alt="" />
                                        )
                                    )
                                ) : (
                                    <Slideshow items={block.items.filter((i: any) => i.url && i.url !== 'null')} />
                                )}
                            </div>
                        );
                    }

                    if (block.type === 'separator') {
                        return (
                            <div key={idx} className="w-full py-4">
                                {block.style === 'solid' && <div className={`h-[2px] w-full rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />}
                                {block.style === 'dotted' && <div className={`h-0 w-full border-t-2 border-dotted ${isDark ? 'border-slate-800' : 'border-slate-300'}`} />}
                                {block.style === 'spacer' && <div className="h-8" />}
                            </div>
                        );
                    }

                    return null;
                })}

                {/* 🏷️ Scanner my visitor button */}
                <Link 
                    href={`/kiosk?device_id=${user.id}`}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                >
                    <Icons.QrCode className="w-4 h-4" />
                    Scanner mon visiteur
                </Link>
            </div>

            {/* 🛡️ Sticky Footer */}
            <footer className={`fixed bottom-0 left-0 w-full p-4 flex gap-3 backdrop-blur-xl border-t ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-100'} z-50`}>
                <a 
                    href={`tel:${user.phone_number || ''}`}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-center shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <Icons.Phone className="w-5 h-5" />
                    Appeler
                </a>
                <a 
                    href={`/api/vcard/${profile_slug}`}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-center shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <Icons.UserPlus className="w-5 h-5" />
                    Enregistrer
                </a>
            </footer>
        </div>
    );
}
