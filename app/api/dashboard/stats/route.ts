import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { leadsDb } from '@/lib/db';

/**
 * 🔒 DASHBOARD STATS API
 * Returns secure metrics based on the User's RBAC Profile.
 */
export async function GET() {
    try {
        const session = await getSession();

        // 🛡️ Security Check: Reject if no session or if session is locked
        if (!session || !session.hasPin) {
            return NextResponse.json({ error: 'Auth Required' }, { status: 401 });
        }

        const stats = leadsDb.getStats(session.userId);

        return NextResponse.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('[API Error] Dashboard stats failed:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
