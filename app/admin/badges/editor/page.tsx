import EditorClient from './EditorClient';
import { db, companyProfileDb, customFieldsDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function BadgeEditorPage() {
    const session = await getSession();
    if (!session || session.role !== 'ADMINISTRATOR') {
        redirect('/login');
    }

    const tenantId = (session as any).tenantId || '00000000-0000-0000-0000-000000000000';

    // Fetch initial DB states
    const companyProfile = companyProfileDb.get(tenantId) || {};
    const customFields = customFieldsDb.listByTenant(tenantId) || [];
    
    // Fetch a sample agent for the Live Preview
    const sampleAgent = db.prepare(`
        SELECT id, name, job_title, email, phone_number, slug, photo_url 
        FROM users 
        WHERE role != 'ADMINISTRATOR' AND active = 1 
        ORDER BY created_at DESC LIMIT 1
    `).get() as any;

    const fallbackAgent = {
        id: 'sample-001',
        name: 'Ahmed Yassine',
        job_title: 'Directeur Commercial',
        email: 'ahmed.yassine@wasla.dz',
        phone_number: '+213 555 12 34 56',
        slug: 'ahmed-yassine',
        photo_url: null,
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Studio d'Édition & Badges</h1>
                    <p className="text-sm font-medium text-slate-500">Gérez la marque, les formulaires, et générez des cartes physiques.</p>
                </div>
                <nav className="flex items-center gap-3">
                    <a href="/admin/dashboard" className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                        Retour Dashboard
                    </a>
                </nav>
            </header>

            {/* Main Workspace */}
            <main className="flex-1 w-full max-w-[1600px] mx-auto p-6 h-[calc(100vh-80px)]">
                <EditorClient 
                    initialCompanyProfile={companyProfile} 
                    initialCustomFields={customFields}
                    sampleAgent={sampleAgent || fallbackAgent}
                />
            </main>
        </div>
    );
}
