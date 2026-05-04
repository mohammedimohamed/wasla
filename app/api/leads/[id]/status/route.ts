export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { leadsDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session || !session.hasPin || session.role !== 'ADMINISTRATOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { status } = body;

        if (status !== 'active' && status !== 'disabled') {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        leadsDb.updateStatus(params.id, status);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API Error] Failed to update lead status:', error);
        return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
    }
}
