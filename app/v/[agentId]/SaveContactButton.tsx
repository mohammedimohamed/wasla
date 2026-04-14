'use client';

import { useState } from 'react';
import { Download, Loader2, CheckCircle2 } from 'lucide-react';

interface SaveContactButtonProps {
    agentId: string;
    agentName: string;
    accentColor: string;
}

/**
 * 💾 SaveContactButton — Client leaf component
 * Triggers VCF download from /api/v/[agentId]?vcf=1
 * Isolated as 'use client' to keep the parent page a pure Server Component.
 */
export default function SaveContactButton({ agentId, agentName, accentColor }: SaveContactButtonProps) {
    const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');

    const handleSave = async () => {
        if (state === 'loading') return;
        setState('loading');
        try {
            const res = await fetch(`/api/v/${agentId}?vcf=1`);
            if (!res.ok) throw new Error('Failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = agentName.replace(/\s+/g, '_').toLowerCase() + '.vcf';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            setState('done');
            setTimeout(() => setState('idle'), 3000);
        } catch {
            setState('idle');
        }
    };

    return (
        <button
            onClick={handleSave}
            className="w-full py-5 rounded-2xl text-white font-black uppercase tracking-widest text-sm shadow-2xl flex items-center justify-center gap-3 active:scale-[0.97] transition-all disabled:opacity-70"
            style={{ background: state === 'done' ? '#10b981' : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
            disabled={state === 'loading'}
        >
            {state === 'loading' && <><Loader2 className="w-5 h-5 animate-spin" /> Préparation...</>}
            {state === 'done'    && <><CheckCircle2 className="w-5 h-5" /> Enregistré !</>}
            {state === 'idle'    && <><Download className="w-5 h-5" /> Enregistrer dans Contacts</>}
        </button>
    );
}
