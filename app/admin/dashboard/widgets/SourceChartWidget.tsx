import { useEffect, useState } from "react";
import { TrendingUp, Monitor, Users, BarChart3 } from "lucide-react";

export default function SourceChartWidget({ config }: { config: any }) {
    const [stats, setStats] = useState({ totalLeads: 0, kioskLeads: 0, commercialLeads: 0 });

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            try {
                const res = await fetch('/api/analytics');
                if (res.ok && isMounted) {
                    const data = await res.json();
                    setStats({
                        totalLeads: data.data.totalLeads || 0,
                        kioskLeads: data.data.kioskLeads || 0,
                        commercialLeads: data.data.commercialLeads || 0
                    });
                }
            } catch (e) {
                // Ignore
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => { isMounted = false; clearInterval(interval); };
    }, []);

    const { totalLeads, kioskLeads, commercialLeads } = stats;

    return (
        <div className="bg-slate-900 text-white p-8 rounded-[32px] shadow-sm overflow-hidden relative h-full flex flex-col justify-center">
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <TrendingUp className="w-40 h-40" />
            </div>
            <div className="relative z-10 w-full">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" /> {config.title || 'Répartition par source'}
                </h3>
                <div className="grid grid-cols-1 gap-6">
                    {[
                        { label: 'Kiosque Automatisé', value: kioskLeads, color: 'bg-blue-400', icon: Monitor },
                        { label: 'Force de Vente', value: commercialLeads, color: 'bg-emerald-400', icon: Users }
                    ].map((source, idx) => (
                        <div key={idx} className="space-y-2">
                            <div className="flex justify-between items-end">
                                <span className="flex items-center gap-2 font-bold text-xs text-slate-300">
                                    <source.icon className="w-4 h-4 text-slate-500" /> {source.label}
                                </span>
                                <span className="text-lg font-black">{source.value}</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${source.color} rounded-full transition-all duration-1000 ease-out`}
                                    style={{ width: `${totalLeads > 0 ? (source.value / totalLeads) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
