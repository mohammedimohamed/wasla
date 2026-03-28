export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db, leadsDb, isModuleEnabled } from '@/lib/db';

async function requireAdmin() {
    const session = await getSession();
    if (!session) return { error: 'Auth Required', status: 401 as const };
    if (session.role !== 'ADMINISTRATOR') return { error: 'Forbidden', status: 403 as const };
    return { session };
}

export async function POST(request: Request) {
    const auth = await requireAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        // Fetch all active leads for the tenant
        const leads = db.prepare("SELECT id FROM leads WHERE tenant_id = ? AND (status = 'active' OR status IS NULL)").all(auth.session.tenantId) as { id: string }[];
        
        console.log(`[Score Recalculation] Starting for ${leads.length} leads...`);
        
        if (isModuleEnabled('intelligence')) {
            const { intelligenceLogic } = await import('@/src/modules/intelligence/lib/scoring');
            for (const lead of leads) {
                await intelligenceLogic.analyzeLead(lead.id);
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: `Successfully recalculated scores for ${leads.length} leads.` 
        });
    } catch (error: any) {
        console.error('[Recalculate API Error]', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
