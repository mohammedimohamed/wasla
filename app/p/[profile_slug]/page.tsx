export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { userDb, settingsDb } from '@/lib/db';
import { DigitalProfileConfig } from '@/lib/schemas';
import * as Icons from 'lucide-react';
import Link from 'next/link';
import { Slideshow } from '@/src/components/Slideshow';
import { AnalyticsTracker } from '@/src/components/AnalyticsTracker';
import { FileDownloadBlock } from '@/src/components/FileDownloadBlock';
import { MultiSiteLocationBlock } from '@/src/components/MultiSiteLocationBlock';
import { GlobalToaster } from '@/src/components/GlobalToaster';

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

    // 🧬 Corporate Heritage: Inject Global Blocks
    const corporateProfile = userDb.findEnterpriseDefault();
    let globalBlocks: any[] = [];
    if (corporateProfile && corporateProfile.id !== user.id) {
        const corpConfig = corporateProfile.profile_config ? JSON.parse(corporateProfile.profile_config) : { blocks: [] };
        globalBlocks = (corpConfig.blocks || []).filter((b: any) => b.isGlobal && b.isVisible !== false);
    }

    // 🧱 Combine Blocks (Global first, then Agent)
    const agentBlocks = config.blocks || [];
    const allBlocks = [...globalBlocks, ...agentBlocks];

    // 🍞 Separate Toasters (Announcement Toaster)
    const toasterBlocks = allBlocks.filter(b => b.type === 'announcement_toaster');
    const contentBlocks = allBlocks.filter(b => b.type !== 'announcement_toaster');
    const isDark = config.theme === 'dark';

    return (
        <div className={`min-h-screen flex flex-col items-center p-6 transition-colors duration-500 ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
            <AnalyticsTracker resourceId={user.id} />
            
            {/* 🍞 Global Toasters */}
            {toasterBlocks.map((block: any, idx: number) => (
                <GlobalToaster key={block.id || idx} block={block} isDark={isDark} />
            ))}

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
                {contentBlocks.filter(b => {
                    if (b.isVisible === false) return false;
                    if (b.visibleUntil && new Date(b.visibleUntil) < new Date()) return false;
                    return true;
                }).map((block: any, idx: number) => {
                    const isGlobal = block.isGlobal;
                    if (block.type === 'social_grid') {
                        return (
                            <div key={idx} className="grid grid-cols-3 gap-4 py-2">
                                {block.items.map((item: any, i: number) => {
                                    // Direct icon resolution — no guessing
                                    const IconComponent = (Icons as any)[item.icon] || Icons.Link;
                                    // Migration fallback: use icon name if label is missing (old data)
                                    const displayLabel = item.label || item.platform || item.icon || '—';
                                    return (
                                        <a 
                                            key={i} 
                                            href={item.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className={`flex flex-col items-center justify-center p-4 rounded-3xl transition-all active:scale-95 shadow-sm ${isDark ? 'bg-slate-900 hover:bg-slate-800' : 'bg-white hover:bg-slate-100'}`}
                                        >
                                            <IconComponent className="w-6 h-6 mb-2 text-indigo-500" />
                                            <span className="text-[10px] font-black uppercase tracking-wider opacity-60">{displayLabel}</span>
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
                                {block.action === 'link' && <Icons.ExternalLink className="w-5 h-5" />}
                                {block.action === 'email' && <Icons.Mail className="w-5 h-5" />}
                                {block.label || (block as any).title}
                            </a>
                        );
                    }

                    if (block.type === 'free_text' || block.type === 'rich_text') {
                        const isRich = block.type === 'rich_text';
                        return (
                            <div key={idx} className={`p-5 rounded-3xl text-sm leading-relaxed ${isDark ? 'bg-slate-900/50' : 'bg-white/50 border border-slate-100'}`}>
                                {isRich ? (
                                    <div dangerouslySetInnerHTML={{ 
                                        __html: block.content
                                            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                                            .replace(/\*(.*?)\*/g, '<i>$1</i>')
                                            .replace(/\n- (.*)/g, '<br/>• $1')
                                            .replace(/\n/g, '<br/>') 
                                    }} />
                                ) : (
                                    block.content
                                )}
                            </div>
                        );
                    }

                    if (block.type === 'file') {
                        return (
                            <FileDownloadBlock
                                key={idx}
                                fileUrl={block.fileUrl}
                                label={block.label || (block as any).title}
                                buttonColor={block.buttonColor}
                                buttonShape={block.buttonShape}
                                iconType={block.iconType}
                                resourceId={user.id}
                            />
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

                    if (block.type === 'localization') {
                        const { provider, display_type, location_data, button_label } = block;
                        
                        // 🛠️ Smart Parsing: Extract Coords from Google Maps URL or raw text
                        let lat: number | null = null;
                        let lng: number | null = null;
                        let isCoords = false;

                        const gMatch = location_data.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                        const qMatch = location_data.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
                        const rMatch = location_data.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);

                        if (gMatch) { [lat, lng] = [parseFloat(gMatch[1]), parseFloat(gMatch[2])]; isCoords = true; }
                        else if (qMatch) { [lat, lng] = [parseFloat(qMatch[1]), parseFloat(qMatch[2])]; isCoords = true; }
                        else if (rMatch) { [lat, lng] = [parseFloat(rMatch[1]), parseFloat(rMatch[2])]; isCoords = true; }

                        const encodedLocation = encodeURIComponent(location_data);
                        let finalDisplayType = display_type;

                        // 🛡️ Fallback: OSM requires coords for a reliable marker embed. 
                        // If no coords and provider is OSM, fallback to button to avoid empty map.
                        if (provider === 'openstreetmap' && !isCoords && display_type === 'map') {
                            finalDisplayType = 'button';
                        }

                        if (finalDisplayType === 'map') {
                            let iframeSrc = "";
                            if (provider === 'google_maps') {
                                iframeSrc = `https://maps.google.com/maps?q=${encodedLocation}&output=embed`;
                            } else if (provider === 'openstreetmap' && isCoords) {
                                // OSM Marker format with calculated bounding box
                                const offset = 0.005;
                                const bbox = `${lng! - offset}%2C${lat! - offset}%2C${lng! + offset}%2C${lat! + offset}`;
                                iframeSrc = `https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=${lat}%2C${lng}&bbox=${bbox}`;
                            } else if (provider === 'bing_maps') {
                                // Bing officially uses 'cp' (center point) and 'pp' (pushpin) for precise location
                                if (isCoords) {
                                    iframeSrc = `https://www.bing.com/maps/embed?cp=${lat}~${lng}&lvl=15&typ=d&sty=r&src=SHELL&pp=${lat}~${lng}+++++`;
                                } else {
                                    iframeSrc = `https://www.bing.com/maps/embed?where1=${encodedLocation}&lvl=15&typ=d&sty=r&src=SHELL`;
                                }
                            }
 
                            if (iframeSrc) {
                                return (
                                    <div key={idx} className="space-y-3">
                                        <div className="w-full aspect-video rounded-3xl overflow-hidden shadow-xl border border-slate-100 dark:border-slate-800">
                                            <iframe 
                                                width="100%" 
                                                height="100%" 
                                                frameBorder="0" 
                                                scrolling="no" 
                                                src={iframeSrc}
                                                title="Location Map"
                                                allowFullScreen
                                            />
                                        </div>
                                        {block.show_navigation_button && (
                                            <a 
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodedLocation}`}
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className={`w-full py-5 px-6 rounded-[28px] font-black text-center transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-3 uppercase tracking-widest text-[10px] ${
                                                    isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                                                }`}
                                            >
                                                <Icons.Navigation className="w-4 h-4" />
                                                Lancer l'itinéraire
                                            </a>
                                        )}
                                    </div>
                                );
                            }
                        }

                        // 🔘 Rendu Bouton (Direct redirection to native maps)
                        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
                        return (
                            <a 
                                key={idx} 
                                href={mapUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`w-full py-4 px-6 rounded-2xl font-black text-center transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-3 ${
                                    isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 border border-slate-100'
                                }`}
                            >
                                <Icons.MapPin className="w-5 h-5 text-indigo-500" />
                                {button_label || 'Itinéraire'}
                            </a>
                        );
                    }

                    if (block.type === 'multiple_locations') {
                        return <MultiSiteLocationBlock key={idx} block={block} isDark={isDark} />;
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
