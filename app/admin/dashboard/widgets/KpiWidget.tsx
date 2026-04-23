import { Users, Calendar, RefreshCw, BarChart3, Gift, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

const ICONS = {
    Users: Users,
    Calendar: Calendar,
    RefreshCw: RefreshCw,
    BarChart3: BarChart3,
    Gift: Gift,
    ShieldCheck: ShieldCheck
};

export default function KpiWidget({ config }: { config: any }) {
    const [value, setValue] = useState<number | string>('...');
    const Icon = (ICONS as any)[config.icon || 'BarChart3'] || BarChart3;
    const color = config.color || 'blue';

    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        amber: 'bg-amber-50 text-amber-600',
        rose: 'bg-rose-50 text-rose-600',
        orange: 'bg-orange-50 text-orange-600'
    };

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            try {
                const res = await fetch('/api/analytics');
                if (res.ok && isMounted) {
                    const data = await res.json();
                    setValue(data.data[config.metric || 'totalLeads'] ?? 0);
                }
            } catch (e) {
                // Ignore
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => { isMounted = false; clearInterval(interval); };
    }, [config.metric]);

    return (
        <div className={`bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-2 group hover:shadow-xl transition-all h-full flex flex-col justify-center`}>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${(colorClasses as any)[color] || colorClasses.blue}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 truncate">
                    {config.title || config.metric || 'Métrique'}
                </p>
            </div>
        </div>
    );
}
