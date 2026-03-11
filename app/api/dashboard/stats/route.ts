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
            data: {
                totalLeads: stats.totalLeads ?? 0,
                leadsToday: stats.leadsToday ?? 0,
                syncedLeads: stats.syncedLeads ?? 0,
                kioskLeads: stats.kioskLeads ?? 0,
                commercialLeads: stats.commercialLeads ?? 0,
                rewardsGiven: stats.rewardsGiven ?? 0,
                rewardsGivenToday: stats.rewardsGivenToday ?? 0,
                totalRewards: stats.totalRewards ?? 0,
                rewardsDistributed: stats.rewardsDistributed ?? 0,
                recentLeads: stats.recentLeads ?? [],
            }
        });
    } catch (error) {
        console.error('[API Error] Dashboard stats failed:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

