export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isModuleEnabled } from '@/lib/db';

/**
 * 🔒 ANALYTICS API (Module)
 * Returns advanced metrics based on the User's RBAC Profile.
 */
export async function GET() {
    try {
        if (!isModuleEnabled('analytics')) {
            return NextResponse.json({ error: 'Analytics module is disabled' }, { status: 403 });
        }

        const session = await getSession();

        if (!session || !session.hasPin) {
            return NextResponse.json({ error: 'Auth Required' }, { status: 401 });
        }

        const { statsDb } = await import('@/src/modules/analytics/lib/stats-db');
        const stats = await statsDb.getStats(session.userId);

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
                hourlyStats: stats.hourlyStats ?? [],
                agentStats: stats.agentStats ?? [],
            }
        });
    } catch (error) {
        console.error('[Analytics Module Error]', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
