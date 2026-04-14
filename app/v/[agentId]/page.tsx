import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Mail, MapPin, Building2, Phone, Briefcase, UserCircle2, ExternalLink } from 'lucide-react';
import SaveContactButton from './SaveContactButton';

interface CustomField {
    field_id: string;
    field_key: string;
    label: string;
    field_type: string;
    placeholder: string | null;
    value: string | null;
}

const PROFILE_QUERY = `
    SELECT
        u.id, u.name, u.email, u.phone_number, u.job_title,
        u.company_name, u.linkedin_url, u.photo_url, u.slug, u.tenant_id,
        acp.company_logo_url, acp.company_name AS company_profile_name,
        acp.company_website, acp.company_address,
        acp.company_phone, acp.company_email,
        acp.instagram_url, acp.facebook_url,
        acp.twitter_url, acp.whatsapp_number,
        acp.accent_color, acp.font_name
    FROM users u
    LEFT JOIN agent_company_profiles acp ON acp.tenant_id = u.tenant_id
    WHERE (u.slug = ? OR u.id = ?) AND u.active = 1
    LIMIT 1
`;

export default async function DigitalBusinessCardPage({ params }: { params: Promise<{ agentId: string }> }) {
    const { agentId } = await params;
    
    // Fetch directly from SQLite in this Server Component
    const user = db.prepare(PROFILE_QUERY).get(agentId, agentId) as any | undefined;
    
    if (!user) {
        return notFound();
    }

    const customValues = db.prepare(`
        SELECT cf.id AS field_id, cf.field_key, cf.label, cf.field_type, cf.placeholder,
               acv.value
        FROM custom_fields cf
        LEFT JOIN agent_custom_values acv ON acv.field_id = cf.id AND acv.user_id = ?
        WHERE cf.tenant_id = ?
        ORDER BY cf.sort_order ASC
    `).all(user.id, user.tenant_id) as CustomField[];

    const resolvedCompanyName = user.company_name || user.company_profile_name;
    const accentColor = user.accent_color || '#4f46e5';

    // SVG Icons for Socials
    const SocialIcon = ({ type }: { type: string }) => {
        switch (type) {
            case 'whatsapp':
                return <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>;
            case 'linkedin':
                return <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>;
            case 'instagram':
                return <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>;
            case 'facebook':
                return <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>;
            case 'twitter':
                return <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>;
            default:
                return null;
        }
    };

    const hasCompanyInfo = resolvedCompanyName || user.company_website || user.company_address;
    const hasSocials = user.linkedin_url || user.whatsapp_number || user.instagram_url || user.facebook_url || user.twitter_url;
    
    return (
        <>
            <meta name="theme-color" content={accentColor} />
            <div 
                className="min-h-screen flex flex-col items-center pb-20 relative bg-slate-50"
                style={{ fontFamily: user.font_name || "'Inter', sans-serif" }}
            >
                {/* ── Background Header Shape ── */}
                <div 
                    className="absolute top-0 left-0 right-0 h-80 rounded-b-[60px] overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)` }}
                />

                <div className="relative z-10 w-full max-w-md pt-20 px-6">
                    {/* ── Profile Card ── */}
                    <div className="bg-white rounded-[40px] shadow-2xl p-8 pb-10 flex flex-col items-center text-center relative mt-16">
                        
                        {/* Avatar */}
                        <div className="absolute -top-16 left-1/2 -translate-x-1/2">
                            {user.photo_url ? (
                                <img 
                                    src={user.photo_url} 
                                    alt={user.name} 
                                    className="w-32 h-32 rounded-[2rem] object-cover shadow-xl border-4 border-white"
                                />
                            ) : (
                                <div 
                                    className="w-32 h-32 rounded-[2rem] flex items-center justify-center text-white text-4xl font-black shadow-xl border-4 border-white"
                                    style={{ background: accentColor }}
                                >
                                    {user.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div className="mt-16 w-full">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{user.name}</h1>
                            {user.job_title && (
                                <p className="text-sm font-bold mt-1 text-slate-500 uppercase tracking-widest">
                                    {user.job_title}
                                </p>
                            )}
                        </div>

                        {/* Social Row */}
                        {hasSocials && (
                            <div className="flex flex-wrap justify-center gap-3 mt-6">
                                {user.whatsapp_number && (
                                    <a href={`https://wa.me/${user.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 hover:-translate-y-1 transition-all">
                                        <SocialIcon type="whatsapp" />
                                    </a>
                                )}
                                {user.linkedin_url && (
                                    <a href={user.linkedin_url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 hover:-translate-y-1 transition-all">
                                        <SocialIcon type="linkedin" />
                                    </a>
                                )}
                                {user.instagram_url && (
                                    <a href={user.instagram_url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center hover:bg-pink-100 hover:-translate-y-1 transition-all">
                                        <SocialIcon type="instagram" />
                                    </a>
                                )}
                                {user.facebook_url && (
                                    <a href={user.facebook_url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 hover:-translate-y-1 transition-all">
                                        <SocialIcon type="facebook" />
                                    </a>
                                )}
                                {user.twitter_url && (
                                    <a href={user.twitter_url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 hover:-translate-y-1 transition-all">
                                        <SocialIcon type="twitter" />
                                    </a>
                                )}
                            </div>
                        )}
                        
                        {/* Primary Action Button */}
                        <div className="w-full mt-8">
                            <SaveContactButton agentId={user.id} agentName={user.name} accentColor={accentColor} />
                        </div>
                    </div>

                    {/* ── Contact Information List ── */}
                    <div className="mt-6 space-y-3">
                        {user.phone_number && (
                            <a href={`tel:${user.phone_number}`} className="flex items-center gap-4 p-5 bg-white rounded-[24px] shadow-sm border border-slate-100 hover:border-slate-200 transition-colors group">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-slate-50 text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100 transition-colors">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Mobile</p>
                                    <p className="text-base font-bold text-slate-800">{user.phone_number}</p>
                                </div>
                            </a>
                        )}

                        {user.email && (
                            <a href={`mailto:${user.email}`} className="flex items-center gap-4 p-5 bg-white rounded-[24px] shadow-sm border border-slate-100 hover:border-slate-200 transition-colors group">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-slate-50 text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100 transition-colors">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email</p>
                                    <p className="text-base font-bold text-slate-800 truncate">{user.email}</p>
                                </div>
                            </a>
                        )}

                        {user.company_email && (
                            <a href={`mailto:${user.company_email}`} className="flex items-center gap-4 p-5 bg-white rounded-[24px] shadow-sm border border-slate-100 hover:border-slate-200 transition-colors group">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-slate-50 text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100 transition-colors">
                                    <Briefcase className="w-5 h-5" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email Entreprise</p>
                                    <p className="text-base font-bold text-slate-800 truncate">{user.company_email}</p>
                                </div>
                            </a>
                        )}
                        
                        {user.company_phone && (
                            <a href={`tel:${user.company_phone}`} className="flex items-center gap-4 p-5 bg-white rounded-[24px] shadow-sm border border-slate-100 hover:border-slate-200 transition-colors group">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-slate-50 text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100 transition-colors">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Standard Entreprise</p>
                                    <p className="text-base font-bold text-slate-800">{user.company_phone}</p>
                                </div>
                            </a>
                        )}
                        
                        {user.company_address && (
                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(user.company_address)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-5 bg-white rounded-[24px] shadow-sm border border-slate-100 hover:border-slate-200 transition-colors group">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-slate-50 text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100 transition-colors">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Adresse</p>
                                    <p className="text-sm font-bold text-slate-800 leading-snug">{user.company_address}</p>
                                </div>
                            </a>
                        )}
                        
                        {user.company_website && (
                            <a href={user.company_website.startsWith('http') ? user.company_website : `https://${user.company_website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-5 bg-white rounded-[24px] shadow-sm border border-slate-100 hover:border-slate-200 transition-colors group">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-slate-50 text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100 transition-colors">
                                    <ExternalLink className="w-5 h-5" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Site Web</p>
                                    <p className="text-base font-bold text-blue-600 truncate">{user.company_website.replace(/^https?:\/\//, '')}</p>
                                </div>
                            </a>
                        )}
                    </div>

                    {/* ── Custom Fields ── */}
                    {customValues.length > 0 && customValues.some(f => !!f.value) && (
                        <div className="mt-8 pt-8 border-t border-slate-200 space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-4">Informations Complémentaires</h3>
                            {customValues.filter(cf => !!cf.value).map(cf => (
                                <div key={cf.field_id} className="p-5 bg-white rounded-[24px] shadow-sm border border-slate-100">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{cf.label}</p>
                                    {cf.field_type === 'url' ? (
                                        <a href={cf.value!} target="_blank" rel="noopener noreferrer" className="text-base font-bold text-blue-600 break-words mt-1 block">
                                            {cf.value}
                                        </a>
                                    ) : cf.field_type === 'phone' ? (
                                        <a href={`tel:${cf.value}`} className="text-base font-bold text-slate-800 mt-1 block">
                                            {cf.value}
                                        </a>
                                    ) : cf.field_type === 'email' ? (
                                        <a href={`mailto:${cf.value}`} className="text-base font-bold text-slate-800 mt-1 block">
                                            {cf.value}
                                        </a>
                                    ) : (
                                        <p className="text-sm font-bold text-slate-800 mt-1 whitespace-pre-wrap">{cf.value}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Bottom Padding & Powered By */}
                    <div className="mt-12 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Propulsé par Wasla CRM</p>
                    </div>

                </div>
            </div>
        </>
    );
}
