'use client';

import { useState } from 'react';
import { Smartphone, CreditCard } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
    companyProfile: any;
    customFields: any[];
    agent: any;
}

export default function LivePreviewCard({ companyProfile, customFields, agent }: Props) {
    const [viewMode, setViewMode] = useState<'digital' | 'pvc'>('digital');

    const accentColor = companyProfile?.accent_color || '#4f46e5';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://wasla.dz';
    const scanUrl = `${baseUrl}/v/${agent?.slug || agent?.id}`;

    return (
        <div className="w-full h-full flex flex-col bg-slate-100/50 rounded-3xl overflow-hidden border border-slate-200">
            {/* Toolbar */}
            <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center z-10 shadow-sm relative">
                <span className="text-sm font-black text-slate-800 uppercase tracking-widest pl-2">Live Preview</span>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setViewMode('digital')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'digital' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Smartphone className="w-4 h-4" /> V-Card (Landing)
                    </button>
                    <button 
                        onClick={() => setViewMode('pvc')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'pvc' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <CreditCard className="w-4 h-4" /> Badge (PVC)
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center p-8 bg-slate-200 relative">
                {viewMode === 'digital' && (
                    <DigitalLandingPreview 
                        company={companyProfile} 
                        customFields={customFields} 
                        agent={agent} 
                        accent={accentColor} 
                    />
                )}

                {viewMode === 'pvc' && (
                    <PhysicalBadgePreview 
                        company={companyProfile} 
                        agent={agent} 
                        accent={accentColor} 
                        qrUrl={scanUrl}
                    />
                )}
            </div>
        </div>
    );
}

function DigitalLandingPreview({ company, customFields, agent, accent }: any) {
    return (
        <div className="w-[320px] shrink-0 bg-slate-50 rounded-[40px] shadow-2xl overflow-hidden border-[8px] border-white relative pb-10">
            <div className="h-32 w-full rounded-b-[40px] shadow-inner absolute top-0" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}dd)` }} />
            
            <div className="relative pt-20 px-4 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-white rounded-full p-1 shadow-lg relative z-10 flex items-center justify-center overflow-hidden">
                   {agent?.photo_url ? (
                       <img src={agent.photo_url} className="w-full h-full rounded-full object-cover" alt="Agent" />
                   ) : (
                       <div className="w-full h-full rounded-full flex items-center justify-center text-white font-black text-2xl" style={{ backgroundColor: accent }}>
                           {agent?.name ? agent.name.substring(0,2).toUpperCase() : 'AW'}
                       </div>
                   )}
                </div>

                <h3 className="text-xl font-black text-slate-900 mt-4">{agent?.name || 'Nom de l\'Agent'}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{agent?.job_title || 'Titre Poste'}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">{company?.company_name || 'Entreprise LLC'}</p>

                <button className="w-full py-3 mt-6 rounded-xl text-white text-xs font-black uppercase tracking-widest shadow-lg" style={{ background: accent }}>
                    Enregistrer Contact
                </button>

                {/* Simulated Fields */}
                <div className="w-full mt-6 space-y-2">
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center" />
                        <div className="flex-1 text-left">
                            <div className="h-2 w-10 bg-slate-200 rounded mb-1" />
                            <div className="h-3 w-24 bg-slate-300 rounded" />
                        </div>
                    </div>
                    {(company?.company_website || company?.company_address) && (
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center" />
                           <div className="flex-1 text-left">
                               <div className="h-2 w-16 bg-slate-200 rounded mb-1" />
                               <div className="h-3 w-20 bg-slate-300 rounded" />
                           </div>
                       </div>
                    )}
                    
                    {/* Custom Fields dynamic placeholder */}
                    {customFields?.map((f:any) => (
                        <div key={f.id} className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col items-start gap-1">
                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{f.label}</span>
                            <div className="h-3 w-full bg-slate-100 rounded mt-1" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function PhysicalBadgePreview({ company, agent, accent, qrUrl }: any) {
    // Dimension carte de crédit ratio (85.6mm x 53.98mm) correspond environ à 340px x 215px
    return (
        <div className="space-y-8 flex flex-col items-center pointer-events-none select-none">
            {/* Recto */}
            <div className="relative w-[340px] h-[540px] bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 flex flex-col">
                <div className="h-40 w-full" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}dd)` }}>
                    {company?.company_logo_url && (
                        <div className="absolute top-6 left-6 bg-white/20 p-2 rounded-lg backdrop-blur">
                            {/* Logo Simulator */}
                            <span className="text-white font-black text-xs">LOGO ENTREPRISE</span>
                        </div>
                    )}
                </div>
                
                <div className="flex-1 relative flex flex-col items-center pt-16 px-6 text-center">
                    <div className="absolute -top-16 w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-slate-100 flex items-center justify-center text-4xl text-white font-black" style={{ backgroundColor: accent }}>
                        {agent?.photo_url ? <img src={agent.photo_url} className="w-full h-full object-cover" /> : agent?.name.substring(0,2).toUpperCase()}
                    </div>
                    
                    <h2 className="text-2xl font-black text-slate-900 leading-tight">{agent?.name}</h2>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2" style={{ color: accent }}>{agent?.job_title}</p>
                    <p className="text-xs font-bold text-slate-400 mt-1">{company?.company_name}</p>

                    <div className="mt-auto pb-8 w-full flex justify-center">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                            <QRCodeSVG value={qrUrl} size={100} level="M" />
                        </div>
                    </div>
                </div>
            </div>
            <p className="text-xs font-bold text-slate-400">RECTO (Badge Physique)</p>
        </div>
    );
}
