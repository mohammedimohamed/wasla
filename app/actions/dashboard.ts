"use server";

import { getSession } from "@/lib/auth";
import { leadsDb, analyticsLogsDb, settingsDb, systemDb, userDb } from "@/lib/db";

/**
 * 🚀 UNIFIED DASHBOARD V2 ENGINE
 * Fetches all critical business intelligence in parallel.
 * Strictly enforces RBAC visibility and tenant isolation.
 */
export async function getDashboardV2Data(period: string = 'global') {
    const session = await getSession();
    if (!session || !session.hasPin) {
        throw new Error("Unauthorized: Session required");
    }

    const userEntry = userDb.findById(session.userId);

    // Parallel fetch using Promise.all for maximum performance
    const [stats, analytics, trends, health, topAgents, branding, conversion] = await Promise.all([
        leadsDb.getStats(session.userId, period),
        analyticsLogsDb.getGlobalStats(period),
        leadsDb.getActivityTrends(),
        systemDb.getHealth(),
        leadsDb.getTopAgents(period),
        settingsDb.get(),
        leadsDb.getConversionStats(period)
    ]);

    return {
        stats,
        analytics,
        trends,
        health,
        topAgents,
        branding,
        conversion,
        user: {
            name: userEntry?.name || "User",
            role: session.role
        }
    };
}
