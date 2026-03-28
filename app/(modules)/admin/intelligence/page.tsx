"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    Brain,
    AlertTriangle,
    Merge,
    Loader2,
    CheckCircle2,
    ShieldAlert,
    RefreshCw,
    Gift,
    TrendingUp,
    ShieldCheck,
    Search,
    Filter,
    GitBranch,
    History,
    RotateCcw,
    Check,
    X,
    ArrowRight,
    HelpCircle,
    AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "@/src/context/LanguageContext";

interface SuggestedMerge {
    id1: string; meta1: string; score1: number;
    id2: string; meta2: string; score2: number;
    email: string;
    phone: string;
}

interface GarbageReport {
    agent_name: string;
    total_leads: number;
    avg_score: number;
    low_quality_count: number;
}

interface IntelligenceLead {
    id: string;
    metadata: string;
    quality_score: number;
    reward_status: string;
    source: string;
    risk_messages?: string;
    created_at?: string;
    status?: string;
}

const getDisplayName = (meta: any, fallbackStr: string = 'Anonymous') => {
    if (!meta) return fallbackStr;
    const nameKeys = ['name', 'fullName', 'full_name', 'firstName', 'first_name', 'Nom', 'Prénom', 'nom', 'prenom'];
    for (const key of nameKeys) {
        if (meta[key] && typeof meta[key] === 'string' && meta[key].trim() !== '') return meta[key];
    }
    const dynamicKey = Object.keys(meta).find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('nom'));
    if (dynamicKey && meta[dynamicKey] && typeof meta[dynamicKey] === 'string' && meta[dynamicKey].trim() !== '') {
        return meta[dynamicKey];
    }
    if (meta.email) return Array.isArray(meta.email) ? meta.email[0] : meta.email;
    if (meta.phone) return Array.isArray(meta.phone) ? meta.phone[0] : meta.phone;
    return fallbackStr;
};

// ── CONFLICT RESOLVER MODAL ──────────────────────────────────────────
function ConflictModal({ merge, onMerge, onCancel }: { merge: SuggestedMerge, onMerge: (data: any) => void, onCancel: () => void }) {
    const { t } = useTranslation();
    const m1 = JSON.parse(merge.meta1);
    const m2 = JSON.parse(merge.meta2);

    // Multi-value fields use checkboxes; all others use radio selection
    const MULTI_FIELDS = ['phone', 'email'];

    // Combined unique keys from both leads
    const allKeys = Array.from(new Set([...Object.keys(m1), ...Object.keys(m2)]))
        .filter(k => k !== 'id' && k !== 'created_at');

    // Helper to flatten scalar or array values
    const flatten = (val: any): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) return val.map(v => String(v));
        return [String(val)];
    };

    // State: for single-value fields, store the chosen string. For multi-value, store a Set of checked strings.
    const [resolved, setResolved] = useState<any>(() => {
        const init: any = {};
        allKeys.forEach(k => {
            if (MULTI_FIELDS.includes(k)) {
                // Start with all unique values pre-checked
                const vals = new Set<string>();
                [m1[k], m2[k]].forEach(v => { 
                    flatten(v).forEach(item => vals.add(item));
                });
                init[k] = vals;
            } else {
                init[k] = m1[k] ?? m2[k];
            }
        });
        return init;
    });

    const toggleMulti = (key: string, value: string) => {
        const current = new Set<string>(resolved[key]);
        if (current.has(value)) { current.delete(value); } else { current.add(value); }
        setResolved({ ...resolved, [key]: current });
    };

    const collectAll = () => {
        const updated = { ...resolved };
        MULTI_FIELDS.forEach(k => {
            const vals = new Set<string>();
            [m1[k], m2[k]].forEach(v => { 
                flatten(v).forEach(item => vals.add(item));
            });
            updated[k] = vals;
        });
        setResolved(updated);
    };

    const buildPayload = () => {
        const payload: any = {};
        allKeys.forEach(k => {
            if (MULTI_FIELDS.includes(k)) {
                payload[k] = Array.from(resolved[k] as Set<string>);
            } else {
                payload[k] = resolved[k];
            }
        });
        return payload;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-8 py-6 border-b flex items-center justify-between bg-slate-50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('intelligence.conflictTitle')}</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t('intelligence.accumulativeDesc')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={collectAll}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition-all flex items-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" /> {t('intelligence.collectAll')}
                        </button>
                        <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-all">
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>
                </div>

                <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {/* Column headers */}
                    <div className="grid grid-cols-3 gap-6 mb-4 px-4">
                        <div className="text-[10px] font-black uppercase text-slate-400">Field</div>
                        <div className="text-[10px] font-black uppercase text-indigo-500">Lead #1 (Latest)</div>
                        <div className="text-[10px] font-black uppercase text-slate-400">Lead #2 (Oldest)</div>
                    </div>

                    <div className="space-y-3">
                        {allKeys.map(key => {
                            const isMulti = MULTI_FIELDS.includes(key);
                            const val1 = m1[key]; const val2 = m2[key];
                            const areSame = val1 === val2;

                            if (isMulti) {
                                // Checkbox multi-select for phone/email
                                const checkedSet = resolved[key] as Set<string>;
                                const allVals = Array.from(new Set([...flatten(val1), ...flatten(val2)]));
                                const f1 = flatten(val1);
                                const f2 = flatten(val2);

                                return (
                                    <div key={key} className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="font-black text-xs text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4" /> {key} — {t('intelligence.collectAllHint')}
                                            </span>
                                            <span className="text-[9px] font-black bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full uppercase">{checkedSet.size} selected</span>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {allVals.map((v, idx) => (
                                                <label key={idx} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${checkedSet.has(v) ? 'border-emerald-500 bg-white shadow-md' : 'border-transparent bg-slate-100 opacity-60'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={checkedSet.has(v)}
                                                        onChange={() => toggleMulti(key, v)}
                                                        className="accent-emerald-600"
                                                    />
                                                    <span className="text-xs font-black text-slate-800">{v}</span>
                                                    {f1.includes(v) && <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 rounded font-black">L1</span>}
                                                    {f2.includes(v) && <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 rounded font-black">L2</span>}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }

                            // Radio selection for scalar fields
                            return (
                                <div key={key} className={`grid grid-cols-3 gap-4 p-4 rounded-2xl border items-center ${areSame ? 'bg-slate-50 border-slate-100' : 'bg-white border-amber-100'}`}>
                                    <div className="font-bold text-xs text-slate-600 capitalize flex items-center gap-2">
                                        {!areSame && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />}
                                        {key}
                                    </div>
                                    <button
                                        onClick={() => setResolved({ ...resolved, [key]: val1 })}
                                        className={`p-3 rounded-xl border-2 text-left transition-all ${resolved[key] === val1 ? 'border-indigo-600 bg-white shadow-md' : 'border-transparent bg-slate-100 opacity-60'}`}
                                    >
                                        <p className="text-[11px] font-black text-slate-800 truncate">{val1 || '—'}</p>
                                    </button>
                                    <button
                                        onClick={() => setResolved({ ...resolved, [key]: val2 })}
                                        className={`p-3 rounded-xl border-2 text-left transition-all ${resolved[key] === val2 ? 'border-indigo-600 bg-white shadow-md' : 'border-transparent bg-slate-100 opacity-60'}`}
                                    >
                                        <p className="text-[11px] font-black text-slate-800 truncate">{val2 || '—'}</p>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-8 bg-slate-50 border-t flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                            <Merge className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Merge Strategy</p>
                            <p className="text-sm font-black text-slate-900">Accumulative Union · Zero Data Loss</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={onCancel} className="px-6 py-3 font-black text-slate-500 uppercase tracking-widest text-xs">
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={() => onMerge(buildPayload())}
                            className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all"
                        >
                            {t('intelligence.mergeBtn')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── LINEAGE MODAL ───────────────────────────────────────────────────
function LineageModal({ leadId, onClose }: { leadId: string, onClose: () => void }) {
    const [lineage, setLineage] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/intelligence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'GET_LINEAGE', id: leadId })
        })
            .then(res => res.json())
            .then(data => {
                setLineage(data.lineage || []);
                setLoading(false);
            });
    }, [leadId]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="px-8 py-6 border-b flex items-center justify-between bg-indigo-600 text-white">
                    <div className="flex items-center gap-3">
                        <GitBranch className="w-6 h-6" />
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight">Identity Lineage</h2>
                            <p className="text-[10px] font-bold uppercase opacity-70">Tracing the Golden Record</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-10">
                    {loading ? (
                        <div className="flex py-10 justify-center"><Loader2 className="animate-spin" /></div>
                    ) : lineage.length === 0 ? (
                        <p className="text-center py-10 text-slate-400 font-bold uppercase tracking-widest text-xs">No parents found (Initial Commit)</p>
                    ) : (
                        <div className="space-y-8 relative">
                            <div className="absolute left-[23px] top-6 bottom-6 w-1 bg-indigo-50 border-l-2 border-dashed border-indigo-200" />

                            <div className="flex items-center gap-6 relative z-10">
                                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                                    <Check className="w-6 h-6" />
                                </div>
                                <div className="bg-slate-900 text-white p-4 rounded-3xl flex-1 shadow-xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Golden Record</p>
                                    <p className="font-bold text-sm">HEAD • Active Version</p>
                                </div>
                            </div>

                            {lineage.map((parent, idx) => {
                                const meta = JSON.parse(parent.metadata);
                                return (
                                    <div key={idx} className="flex items-center gap-6 relative z-10">
                                        <div className="w-12 h-12 bg-slate-200 text-slate-500 rounded-2xl flex items-center justify-center">
                                            <History className="w-6 h-6" />
                                        </div>
                                        <div className="bg-white border-2 border-slate-100 p-4 rounded-3xl flex-1 shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Parent Lead</p>
                                                    <p className="font-black text-slate-800 text-sm">{getDisplayName(meta, "Anonymous")}</p>
                                                </div>
                                                <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase">Archived</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 truncate">{meta.email} • {meta.phone}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-8 bg-slate-50 border-t text-center">
                    <button onClick={onClose} className="px-10 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs">
                        Close Lineage
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── HELP MODAL ──────────────────────────────────────────────────────
function HelpModal({ onClose }: { onClose: () => void }) {
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/intelligence/guide')
            .then(res => res.json())
            .then(data => {
                setContent(data.content || "Guide content not available.");
                setLoading(false);
            });
    }, []);

    // Robust Markdown to JSX Parser for Premium Look
    const renderMarkdown = (text: string) => {
        const lines = text.replace(/\r\n/g, '\n').split('\n');
        const blocks: any[] = [];
        let currentList: any[] = [];
        let listType: 'ul' | 'ol' | null = null;

        const flushList = () => {
            if (currentList.length > 0) {
                const listKey = `list-${blocks.length}`;
                if (listType === 'ul') {
                    blocks.push(
                        <ul key={listKey} className="space-y-4 my-6">
                            {currentList.map((item, j) => (
                                <li key={j} className="flex items-start gap-4">
                                    <div className="mt-1.5 w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                                    <span className="text-slate-600 font-medium leading-relaxed">{parseInline(item)}</span>
                                </li>
                            ))}
                        </ul>
                    );
                } else {
                    blocks.push(
                        <ol key={listKey} className="space-y-4 my-6">
                            {currentList.map((item, j) => (
                                <li key={j} className="flex items-start gap-4">
                                    <div className="bg-emerald-50 text-emerald-600 w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0 shadow-sm border border-emerald-100">{j + 1}</div>
                                    <span className="text-slate-600 font-medium leading-relaxed">{parseInline(item)}</span>
                                </li>
                            ))}
                        </ol>
                    );
                }
                currentList = [];
                listType = null;
            }
        };

        const parseInline = (str: string) => {
            return str.split('**').map((part, i) => (
                i % 2 === 1 ? <b key={i} className="text-slate-900 font-black">{part}</b> :
                    part.split('*').map((p, j) => (
                        j % 2 === 1 ? <em key={j} className="text-slate-800 italic">{p}</em> : p
                    ))
            ));
        };

        lines.forEach((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) {
                flushList();
                return;
            }

            // Headers
            if (trimmed.startsWith('# ')) {
                flushList();
                blocks.push(<h1 key={i} className="text-2xl font-black text-slate-900 mb-8 pb-4 border-b-4 border-slate-100">{parseInline(trimmed.replace('# ', ''))}</h1>);
            } else if (trimmed.startsWith('## ')) {
                flushList();
                blocks.push(<h2 key={i} className="text-xl font-black text-slate-900 mt-10 mb-6 flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                    {parseInline(trimmed.replace('## ', ''))}
                </h2>);
            } else if (trimmed === '---') {
                flushList();
                blocks.push(<div key={i} className="h-px bg-slate-100 my-10 relative"><div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200 to-transparent" /></div>);
            } else if (trimmed.startsWith('- ')) {
                if (listType === 'ol') flushList();
                listType = 'ul';
                currentList.push(trimmed.replace('- ', ''));
            } else if (/^\d+\.\s+/.test(trimmed)) {
                if (listType === 'ul') flushList();
                listType = 'ol';
                currentList.push(trimmed.replace(/^\d+\.\s+/, ''));
            } else {
                flushList();
                blocks.push(<p key={i} className="text-slate-600 font-medium leading-relaxed mb-4">{parseInline(trimmed)}</p>);
            }
        });
        flushList();
        return blocks;
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in duration-300">
                <div className="px-10 py-8 border-b bg-emerald-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <HelpCircle className="w-8 h-8" />
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">Intelligence Guide</h2>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Mastering Data Quality</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/20 rounded-full transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-12 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
                        </div>
                    ) : (
                        <div className="md-content">
                            {renderMarkdown(content)}
                            <div className="mt-12 p-8 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                                    Need more help? Contact your System Administrator
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-10 bg-slate-50 border-t flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200"
                    >
                        Got it, Thanks!
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function IntelligencePage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [merges, setMerges] = useState<SuggestedMerge[]>([]);
    const [garbageReport, setGarbageReport] = useState<GarbageReport[]>([]);
    const [flaggedLeads, setFlaggedLeads] = useState<IntelligenceLead[]>([]);
    const [cleanLeads, setCleanLeads] = useState<IntelligenceLead[]>([]);
    const [isMerging, setIsMerging] = useState<string | null>(null);
    const [isReleasing, setIsReleasing] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'FLAGGED' | 'CLEAN'>('FLAGGED');

    // Phase 15 v3 Modals
    const [conflictMerge, setConflictMerge] = useState<SuggestedMerge | null>(null);
    const [viewLineageId, setViewLineageId] = useState<string | null>(null);
    const [isReverting, setIsReverting] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/intelligence');
            if (res.status === 401 || res.status === 403) {
                router.push('/admin/login');
                return;
            }
            const data = await res.json();
            if (res.ok) {
                setMerges(data.suggestedMerges || []);
                setGarbageReport(data.garbageReport || []);
                setFlaggedLeads(data.flaggedLeads || []);
                setCleanLeads(data.cleanLeads || []);
            }
        } catch (error) {
            toast.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const executeMerge = async (resolvedMeta: any) => {
        if (!conflictMerge) return;
        setIsMerging(conflictMerge.id2);
        try {
            const res = await fetch('/api/admin/intelligence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'MERGE',
                    primaryId: conflictMerge.id1,
                    secondaryId: conflictMerge.id2,
                    mergedMetadata: resolvedMeta
                })
            });

            if (res.ok) {
                toast.success(t('intelligence.mergeSuccess'));
                setConflictMerge(null);
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || t('common.error'));
            }
        } catch (error) {
            toast.error(t('common.error'));
        } finally {
            setIsMerging(null);
        }
    };

    const handleRevertMerge = async (id: string) => {
        if (!confirm("Are you sure? This will restore archived parent leads and remove the merge commit.")) return;
        setIsReverting(id);
        try {
            const res = await fetch('/api/admin/intelligence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'REVERT_MERGE', id })
            });

            if (res.ok) {
                toast.success(t('intelligence.rollbackSuccess'));
                fetchData();
            } else {
                toast.error(t('common.error'));
            }
        } catch (error) {
            toast.error(t('common.error'));
        } finally {
            setIsReverting(null);
        }
    };

    const handleReleaseReward = async (id: string) => {
        setIsReleasing(id);
        try {
            const res = await fetch('/api/admin/intelligence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'RELEASE_REWARD', id })
            });

            if (res.ok) {
                toast.success("Reward released!");
                fetchData();
            } else {
                toast.error(t('common.error'));
            }
        } catch (error) {
            toast.error(t('common.error'));
        } finally {
            setIsReleasing(null);
        }
    };

    const handleRecalculate = async () => {
        if (!confirm("Relancer le calcul des scores pour tous les leads ? Cela mettra à jour les valeurs selon les poids actuels.")) return;
        setIsRecalculating(true);
        try {
            const res = await fetch('/api/admin/recalculate-scores', { method: 'POST' });
            if (!res.ok) throw new Error();
            const data = await res.json();
            toast.success(data.message);
            fetchData();
        } catch (err) {
            toast.error("Erreur lors de la recalcule");
        } finally {
            setIsRecalculating(false);
        }
    };

    const parseMeta = (metaStr: string) => {
        try {
            return JSON.parse(metaStr);
        } catch (e) {
            return {};
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-slate-50 min-h-screen pb-20 overflow-x-hidden">
            {/* ── MODALS ── */}
            {conflictMerge && <ConflictModal merge={conflictMerge} onMerge={executeMerge} onCancel={() => setConflictMerge(null)} />}
            {viewLineageId && <LineageModal leadId={viewLineageId} onClose={() => setViewLineageId(null)} />}
            {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

            {/* ── HEADER ── */}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/admin/dashboard")}
                        className="p-2 -ml-2 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <ChevronLeft className="w-6 h-6 text-slate-700" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('intelligence.title')}</h1>
                        <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">V3 Git-Inspired Identity Resolution</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRecalculate}
                        disabled={isRecalculating || loading}
                        className="flex items-center gap-3 bg-white border-2 border-slate-200 hover:border-slate-900 transition-all px-6 py-2.5 rounded-2xl group shadow-sm disabled:opacity-50"
                    >
                        {isRecalculating ? (
                            <Loader2 className="w-4 h-4 text-slate-900 animate-spin" />
                        ) : (
                            <RotateCcw className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                        )}
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Recalculate Weights</span>
                    </button>
                    <button
                        onClick={() => setShowHelp(true)}
                        className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-all border border-emerald-100"
                    >
                        <HelpCircle className="w-5 h-5" />
                    </button>
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh Node
                    </button>
                </div>
            </header>

            <div className="flex-1 p-6 md:p-8 max-w-[1400px] mx-auto w-full">
                {loading ? (
                    <div className="flex items-center justify-center p-20">
                        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">

                        <div className="lg:col-span-1 space-y-8">
                            {/* ── AGENT PERFORMANCE ── */}
                            <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm p-8 overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-50" />
                                <div className="flex items-center gap-4 mb-10 relative z-10">
                                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Agent Performance</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Git Stats</p>
                                    </div>
                                </div>
                                <div className="space-y-6 relative z-10">
                                    {garbageReport.map((rpt, idx) => (
                                        <div key={idx} className="group">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-black text-slate-800 text-xs truncate pr-4">{rpt.agent_name}</span>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${rpt.avg_score < 50 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                    {Math.round(rpt.avg_score)}%
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-1000 ${rpt.avg_score < 50 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${rpt.avg_score}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── IDENTITY CONSOLIDATION (GIT MERGE) ── */}
                            <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm p-8 relative overflow-hidden">
                                <div className="absolute bottom-0 right-0 w-40 h-40 bg-indigo-50 rounded-full -mb-20 -mr-20 opacity-50" />
                                <div className="flex items-center justify-between mb-10 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                            <GitBranch className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Merge Queue</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Conflicts Found</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-black bg-indigo-600 text-white px-3 py-1 rounded-full">{merges.length}</span>
                                </div>
                                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
                                    {merges.length === 0 ? (
                                        <div className="py-12 text-center opacity-40">
                                            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Clean Lineage</p>
                                        </div>
                                    ) : (
                                        merges.map((merge, idx) => {
                                            const m1 = parseMeta(merge.meta1);
                                            const m2 = parseMeta(merge.meta2);
                                            return (
                                                <div key={idx} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-300 transition-all cursor-pointer group shadow-sm hover:shadow-md" onClick={() => setConflictMerge(merge)}>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1">
                                                            <RotateCcw className="w-2.5 h-2.5" /> Conflict
                                                        </span>
                                                        <Merge className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-1.5 h-10 bg-indigo-200 rounded-full" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-black text-slate-800 truncate">{getDisplayName(m1, "User 1")}</p>
                                                                <p className="text-[10px] font-medium text-slate-400 truncate">{m1.email || m1.phone}</p>
                                                                <p className="text-xs font-black text-slate-700 truncate mt-1">{getDisplayName(m2, "User 2")}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button className="mt-5 w-full py-3 bg-white border-2 border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all shadow-sm">
                                                        Resolve
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── MAIN CONTENT: COMMIT LOG (FLAGGED VS CLEAN) ── */}
                        <div className="lg:col-span-3 space-y-8">
                            <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden min-h-[700px] flex flex-col">
                                <div className="p-10 pb-6 flex items-center justify-between border-b bg-slate-50/50">
                                    <div className="flex items-center gap-10">
                                        <button
                                            onClick={() => setActiveTab('FLAGGED')}
                                            className={`pb-6 text-sm font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'FLAGGED' ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            {t('intelligence.statusFraud')} ({flaggedLeads.length})
                                            {activeTab === 'FLAGGED' && <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-rose-600 rounded-full shadow-[0_-4px_10px_rgba(225,29,72,0.4)]" />}
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('CLEAN')}
                                            className={`pb-6 text-sm font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'CLEAN' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            {t('intelligence.statusClean')} ({cleanLeads.length})
                                            {activeTab === 'CLEAN' && <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-emerald-600 rounded-full shadow-[0_-4px_10px_rgba(16,185,129,0.4)]" />}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white border-2 border-slate-200 rounded-2xl px-4 py-2 shadow-sm">
                                        <Filter className="w-4 h-4 text-slate-400" />
                                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Filter by Score</span>
                                    </div>
                                </div>

                                <div className="p-10 flex-1">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {activeTab === 'FLAGGED' ? (
                                            flaggedLeads.length === 0 ? (
                                                <div className="col-span-full py-32 text-center">
                                                    <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                                        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                                                    </div>
                                                    <p className="font-black text-slate-900 uppercase text-lg tracking-tight">Main Branch is Stable</p>
                                                    <p className="text-sm text-slate-500 mt-2">No data corruption or fraud detected in any commits.</p>
                                                </div>
                                            ) : (
                                                flaggedLeads.map((lead) => {
                                                    const meta = parseMeta(lead.metadata);
                                                    return (
                                                        <div key={lead.id} className="p-8 rounded-[40px] bg-slate-50 border-2 border-slate-100 hover:border-rose-200 transition-all shadow-sm hover:shadow-xl group relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full -mr-12 -mt-12 opacity-40 group-hover:scale-150 transition-transform duration-700" />

                                                            <div className="flex justify-between items-start mb-6 relative z-10">
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${lead.quality_score < 30 ? 'bg-rose-600 text-white' : 'bg-orange-500 text-white'}`}>
                                                                        <ShieldAlert className="w-6 h-6" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-black text-slate-900 text-base leading-tight truncate max-w-[150px]">{getDisplayName(meta, "Visitor")}</p>
                                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">ID: {lead.id.slice(0, 8)}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end">
                                                                    <span className={`text-[11px] font-black px-4 py-1.5 rounded-full shadow-md ${lead.quality_score < 30 ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-orange-700'}`}>
                                                                        Score: {lead.quality_score}%
                                                                    </span>
                                                                    <div className="mt-2 flex items-center gap-1 text-[8px] font-black text-rose-400 uppercase tracking-tighter opacity-70">
                                                                        <AlertCircle className="w-2.5 h-2.5" /> LAW DEVIATION
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="bg-white p-5 rounded-3xl border border-slate-100 mb-8 min-h-[100px] shadow-inner relative z-10">
                                                                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                    <AlertTriangle className="w-3.5 h-3.5" /> Commit Findings
                                                                </p>
                                                                <div className="space-y-2">
                                                                    {lead.risk_messages?.split(' | ').map((msg, idx) => (
                                                                        <p key={idx} className="text-xs font-black text-slate-700 leading-snug flex items-start gap-2">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1 flex-shrink-0" />
                                                                            {msg}
                                                                        </p>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4 mb-2 relative z-10">
                                                                {lead.reward_status === 'pending_qc' && (
                                                                    <button
                                                                        onClick={() => handleReleaseReward(lead.id)}
                                                                        disabled={isReleasing === lead.id}
                                                                        className="py-4 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3"
                                                                    >
                                                                        {isReleasing === lead.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                                                                        Approve
                                                                    </button>
                                                                )}
                                                                {lead.metadata.includes('"status":"archived"') || lead.risk_messages?.includes("Merged") ? (
                                                                    <button
                                                                        onClick={() => handleRevertMerge(lead.id)}
                                                                        disabled={isReverting === lead.id}
                                                                        className="py-4 bg-white border-2 border-slate-200 text-rose-600 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:border-rose-600 transition-all shadow-sm flex items-center justify-center gap-3"
                                                                    >
                                                                        {isReverting === lead.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                                                                        Revert
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => setViewLineageId(lead.id)}
                                                                        className="py-4 bg-white border-2 border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm flex items-center justify-center gap-3 col-span-full"
                                                                    >
                                                                        <GitBranch className="w-4 h-4" />
                                                                        {t('intelligence.lineage')}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )
                                        ) : (
                                            cleanLeads.length === 0 ? (
                                                <div className="col-span-full py-32 text-center opacity-40">
                                                    <Search className="w-20 h-20 text-slate-300 mx-auto mb-6" />
                                                    <p className="font-black text-slate-900 uppercase tracking-widest">Scanning History...</p>
                                                </div>
                                            ) : (
                                                cleanLeads.map((lead) => {
                                                    const meta = parseMeta(lead.metadata);
                                                    return (
                                                        <div key={lead.id} className="p-8 rounded-[40px] bg-white border-2 border-slate-100 hover:border-emerald-300 transition-all shadow-sm hover:shadow-xl relative overflow-hidden group">
                                                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 opacity-40 group-hover:scale-150 transition-transform duration-700" />

                                                            <div className="flex justify-between items-start mb-6 relative z-10">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-md">
                                                                        <ShieldCheck className="w-6 h-6" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-black text-slate-900 text-base leading-tight truncate max-w-[150px]">{getDisplayName(meta, "Verified User")}</p>
                                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Golden Record Verified</p>
                                                                    </div>
                                                                </div>
                                                                <span className="text-[11px] font-black px-4 py-1.5 bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-100 uppercase tracking-tighter ring-4 ring-emerald-50">
                                                                    {lead.quality_score}%
                                                                </span>
                                                            </div>

                                                            <div className="grid grid-cols-1 gap-3 relative z-10">
                                                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between group-hover:bg-white transition-colors shadow-inner">
                                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Email Identity</span>
                                                                    <p className="text-xs font-black text-slate-800 truncate pl-4">{meta.email || 'N/A'}</p>
                                                                </div>
                                                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between group-hover:bg-white transition-colors shadow-inner">
                                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Phone Link</span>
                                                                    <p className="text-xs font-black text-slate-800 truncate pl-4">{meta.phone || 'N/A'}</p>
                                                                </div>
                                                            </div>

                                                            <div className="mt-8 flex items-center justify-between relative z-10">
                                                                <div className="flex items-center gap-2">
                                                                    <History className="w-3.5 h-3.5 text-slate-400" />
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reward Node: {lead.reward_status}</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => setViewLineageId(lead.id)}
                                                                    className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                                                                >
                                                                    <GitBranch className="w-4 h-4 text-slate-400 hover:text-indigo-600" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                .dashed { background-image: linear-gradient(to right, #e2e8f0 40%, rgba(255,255,255,0) 0%); background-position: bottom; background-size: 8px 1px; background-repeat: repeat-x; }
            `}</style>
        </div>
    );
}
