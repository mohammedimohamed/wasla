export default function TextWidget({ config }: { config: any }) {
    const variant = config.variant || 'neutral';
    
    const variants = {
        neutral: 'bg-white border-slate-100 text-slate-600',
        info: 'bg-sky-50 border-sky-100 text-sky-800',
        warning: 'bg-amber-50 border-amber-100 text-amber-800',
        success: 'bg-emerald-50 border-emerald-100 text-emerald-800'
    };

    const headerColors = {
        neutral: 'text-slate-900',
        info: 'text-sky-900',
        warning: 'text-amber-900',
        success: 'text-emerald-900'
    };

    const wrapperCls = (variants as any)[variant] || variants.neutral;
    const headerCls = (headerColors as any)[variant] || headerColors.neutral;

    return (
        <div className={`p-6 rounded-[32px] border shadow-sm h-full flex flex-col justify-center ${wrapperCls}`}>
            {config.title && (
                <h3 className={`font-black text-sm uppercase tracking-tight mb-2 ${headerCls}`}>
                    {config.title}
                </h3>
            )}
            <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed opacity-90">
                {config.body || 'Ajouter un texte...'}
            </p>
        </div>
    );
}
