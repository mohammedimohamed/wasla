export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { leadsDb } from '@/lib/db';

async function requireAdmin() {
    const session = await getSession();
    if (!session) return { error: 'Auth Required', status: 401 as const };
    if (session.role !== 'ADMINISTRATOR') return { error: 'Forbidden', status: 403 as const };
    return { session };
}

export async function GET() {
    const auth = await requireAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const suggestedMerges = leadsDb.getSuggestedMerges(auth.session.tenantId);
        const garbageReport = leadsDb.getAgentQualityRanking(auth.session.tenantId);
        const flaggedLeads = leadsDb.getFlaggedLeads(auth.session.tenantId);
        const cleanLeads = leadsDb.getCleanLeads(auth.session.tenantId);

        return NextResponse.json({
            success: true,
            suggestedMerges,
            garbageReport,
            flaggedLeads,
            cleanLeads
        });
    } catch (error) {
        console.error('[Intelligence API GET]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const auth = await requireAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const body = await request.json();
        const { action, primaryId, secondaryId, id, mergedMetadata } = body;

        if (action === 'MERGE') {
            if (!primaryId || !secondaryId || !mergedMetadata) {
                return NextResponse.json({ error: 'IDs and mergedMetadata required' }, { status: 400 });
            }
            leadsDb.mergeLeads(primaryId, secondaryId, mergedMetadata, auth.session!.userId);
            return NextResponse.json({ success: true, message: 'Leads merged successfully' });
        }

        if (action === 'RELEASE_REWARD') {
            if (!id) return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });
            leadsDb.approveReward(id, auth.session!.userId);
            return NextResponse.json({ success: true, message: 'Reward released successfully' });
        }

        if (action === 'REVERT_MERGE') {
            if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
            leadsDb.revertMerge(id, auth.session!.userId);
            return NextResponse.json({ success: true, message: 'Merge reverted' });
        }

        if (action === 'GET_LINEAGE') {
            if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
            const lineage = leadsDb.getLineage(id);
            return NextResponse.json({ success: true, lineage });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('[Intelligence API POST]', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
