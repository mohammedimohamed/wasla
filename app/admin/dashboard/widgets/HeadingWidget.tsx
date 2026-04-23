export default function HeadingWidget({ config }: { config: any }) {
    const style = config.style || 'minimal';
    
    if (style === 'block') {
        return (
            <div className="w-full bg-slate-900 text-white px-8 py-6 rounded-[32px] flex items-center justify-between shadow-lg h-full">
                <h2 className="text-xl font-black uppercase tracking-tight">{config.title || 'Nouvelle Section'}</h2>
                {config.subtitle && (
                    <span className="text-xs font-medium text-slate-400">{config.subtitle}</span>
                )}
            </div>
        );
    }
    
    return (
        <div className="w-full py-4 flex items-center gap-4 h-full">
            <h2 className="text-base font-black text-slate-800 uppercase tracking-tight whitespace-nowrap">
                {config.title || 'Nouvelle Section'}
            </h2>
            <div className="h-px bg-slate-200 flex-1 relative">
               {config.subtitle && (
                   <span className="absolute right-0 -top-3 bg-slate-50 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                       {config.subtitle}
                   </span>
               )}
            </div>
        </div>
    );
}
