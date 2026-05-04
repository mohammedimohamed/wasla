'use client';

import React, { useState } from 'react';
import * as Icons from 'lucide-react';

export function MultiSiteLocationBlock({ block, isDark }: { block: any, isDark: boolean }) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const selectedItem = block.items[selectedIndex];
    
    // URL generation logic
    const getIframeSrc = (item: any) => {
        if (!item || !item.location_data) return "";
        const provider = item.provider_override || block.provider;
        const encodedLocation = encodeURIComponent(item.location_data);
        
        let lat: number | null = null;
        let lng: number | null = null;
        let isCoords = false;
        const gMatch = item.location_data.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        const qMatch = item.location_data.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        const rMatch = item.location_data.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
        if (gMatch) { [lat, lng] = [parseFloat(gMatch[1]), parseFloat(gMatch[2])]; isCoords = true; }
        else if (qMatch) { [lat, lng] = [parseFloat(qMatch[1]), parseFloat(qMatch[2])]; isCoords = true; }
        else if (rMatch) { [lat, lng] = [parseFloat(rMatch[1]), parseFloat(rMatch[2])]; isCoords = true; }

        if (provider === 'google_maps') {
            return `https://maps.google.com/maps?q=${encodedLocation}&output=embed`;
        } else if (provider === 'openstreetmap' && isCoords) {
            const offset = 0.005;
            const bbox = `${lng! - offset}%2C${lat! - offset}%2C${lng! + offset}%2C${lat! + offset}`;
            return `https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=${lat}%2C${lng}&bbox=${bbox}`;
        } else if (provider === 'bing_maps') {
            if (isCoords) {
                return `https://www.bing.com/maps/embed?cp=${lat}~${lng}&lvl=15&typ=d&sty=r&src=SHELL&pp=${lat}~${lng}+++++`;
            } else {
                return `https://www.bing.com/maps/embed?where1=${encodedLocation}&lvl=15&typ=d&sty=r&src=SHELL`;
            }
        }
        return "";
    };

    const currentSrc = getIframeSrc(selectedItem);

    return (
        <div className="w-full space-y-4">
            {block.layout === 'tabs' && (
                <div className="w-full aspect-video rounded-3xl overflow-hidden shadow-xl border border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                    {currentSrc ? (
                        <iframe 
                            key={selectedIndex} // Force reload iframe on selection for smooth switch
                            width="100%" 
                            height="100%" 
                            frameBorder="0" 
                            scrolling="no" 
                            src={currentSrc}
                            title="Location Map"
                            allowFullScreen
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-50">
                            <Icons.MapPin className="w-8 h-8" />
                            <span className="text-[10px] font-black uppercase">Sélectionnez un lieu</span>
                        </div>
                    )}
                </div>
            )}

            {/* Bento Grid layout for site buttons */}
            <div className="grid grid-cols-2 gap-3">
                {block.items.map((item: any, i: number) => {
                    const active = i === selectedIndex;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setSelectedIndex(i)}
                            className={`p-5 rounded-3xl border text-left transition-all active:scale-[0.98] flex flex-col gap-1 shadow-sm ${
                                active 
                                ? 'bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-600/20' 
                                : isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className={`text-[11px] font-black uppercase tracking-tight leading-none ${active ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                    {item.label}
                                </span>
                                {active && <Icons.CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                            </div>
                            {item.city && (
                                <span className={`text-[9px] font-bold uppercase tracking-widest ${active ? 'text-indigo-100' : 'text-slate-400'}`}>
                                    {item.city}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
            
            {/* Action button for the selected site */}
            {selectedItem && (
                 <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedItem.location_data)}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`w-full py-5 px-6 rounded-[28px] font-black text-center transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-3 uppercase tracking-widest text-[10px] ${
                        isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                    }`}
                >
                    <Icons.Navigation className="w-4 h-4" />
                    Itinéraire : {selectedItem.label}
                </a>
            )}
        </div>
    );
}
