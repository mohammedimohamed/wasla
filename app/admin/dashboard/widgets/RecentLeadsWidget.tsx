import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RecentLeadsWidget({ config }: { config: any }) {
    const [recentLeads, setRecentLeads] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const limit = config.limit || 5;

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            try {
                const res = await fetch('/api/analytics');
                if (res.ok && isMounted) {
                    const data = await res.json();
                    setRecentLeads((data.data.recentLeads || []).slice(0, limit));
                }
            } catch (e) {
                // Ignore
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 30000); // refresh every 30s
        return () => { isMounted = false; clearInterval(interval); };
    }, [limit]);

    return (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
                <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">
                    {config.title || 'Derniers Prospects Capturés'}
                </h3>
                <button onClick={() => router.push("/admin/leads/list")} className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:underline">
                    Voir Tout
                </button>
            </div>
            <div className="overflow-x-auto flex-1">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Source</th>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Temps</th>
                            <th className="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {isLoading && recentLeads.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-10 text-center text-xs text-slate-400 font-medium">Chargement...</td></tr>
                        ) : recentLeads.length > 0 ? (
                            recentLeads.map((lead) => {
                                const meta = (() => { try { return JSON.parse(lead.metadata || '{}'); } catch { return {}; } })();
                                return (
                                    <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-3">
                                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${lead.source === 'kiosk' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                {lead.source}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-xs font-bold text-slate-700">
                                            {meta.projectType || 'Standard'}
                                        </td>
                                        <td className="px-6 py-3 text-xs font-medium text-slate-400 italic">
                                            {new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-3 text-right flex justify-end items-center h-full">
                                            <span className={`w-2 h-2 rounded-full inline-block ${lead.sync_status === 'synced' ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`} title={lead.sync_status} />
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center">
                                    <p className="text-slate-300 font-bold italic text-xs">Aucun prospect récent.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
