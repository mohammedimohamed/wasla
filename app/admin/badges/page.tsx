import { isModuleEnabled } from '@/lib/db';
import { redirect } from 'next/navigation';
import { BadgeCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Badge Engine | Wasla Admin',
};

/**
 * 🎫 BADGE ENGINE — Entry point
 * Server Component: checks module status before rendering.
 * Respects the same pattern as /admin/rewards, /admin/vault, etc.
 */
export default function BadgesIndexPage() {
    if (!isModuleEnabled('badge-engine')) {
        redirect('/admin/dashboard');
    }

    return (
        <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
            {/* ── HEADER ── */}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/dashboard"
                        className="p-2 -ml-2 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-2"
                    >
                        <ArrowLeft className="w-6 h-6 text-slate-700" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Retour Dashboard</span>
                    </Link>
                </div>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
                <div className="w-20 h-20 bg-violet-100 text-violet-600 rounded-3xl flex items-center justify-center shadow-lg">
                    <BadgeCheck className="w-10 h-10" />
                </div>
            <div className="text-center max-w-md">
                <h1 className="text-3xl font-black text-slate-900 mb-3">Badge Engine</h1>
                <p className="text-slate-500 font-medium">
                    Générez des badges avec QR Code vCard pour tous vos agents.
                    Personnalisez le design, puis imprimez en une seule action.
                </p>
            </div>
            <div className="flex gap-4 mt-4">
                <Link
                    href="/admin/badges/editor"
                    className="px-8 py-4 bg-violet-600 text-white font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-violet-700 transition shadow-xl active:scale-95"
                >
                    Ouvrir le Studio d'Édition
                </Link>
            </div>
            </div>
        </div>
    );
}
