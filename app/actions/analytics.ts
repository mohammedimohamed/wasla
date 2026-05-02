"use server";

import { analyticsDb } from "@/lib/db";
import { headers } from "next/headers";

/**
 * 📊 Analytics Tracker Action
 * Captures page visits in a "fire-and-forget" manner.
 */
export async function trackVisitAction(profileId?: string) {
    const headerList = headers();
    const url = headerList.get("referer") || "unknown";
    const userAgent = headerList.get("user-agent") || "unknown";
    
    // In Next.js, we can get the IP from headers
    // x-forwarded-for is common behind proxies (like Render/Vercel)
    const forwardedFor = headerList.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(',')[0] : "127.0.0.1";

    // Async tracking (don't await to avoid blocking the UI)
    // We use a promise to handle it in background
    (async () => {
        try {
            analyticsDb.track({
                url,
                profile_id: profileId,
                visitor_ip: ip,
                user_agent: userAgent
            });
        } catch (e) {
            console.error("[Analytics Action] Failed:", e);
        }
    })();

    return { success: true };
}

export async function getAnalyticsStatsAction(profileId?: string) {
    return analyticsDb.getStats(profileId);
}
