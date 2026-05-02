"use server";

import { analyticsLogsDb, AnalyticsEventType, AnalyticsLogPayload } from "@/lib/db";
import { headers } from "next/headers";

/**
 * 🔥 logVisitAction — Fire-and-forget analytics logging.
 *
 * Called from the client; returns immediately so the user never waits.
 * All DB errors are silently swallowed by analyticsLogsDb.log().
 */
export async function logVisitAction(data: {
    event_type: AnalyticsEventType;
    path: string;
    resource_id?: string;
    visitor_session: string;  // Client-generated anonymous session hash
    device_type: string;
    browser: string;
}) {
    // Start the DB write in the background without awaiting — true fire-and-forget
    Promise.resolve().then(() => {
        analyticsLogsDb.log({
            event_type:      data.event_type,
            path:            data.path,
            resource_id:     data.resource_id,
            visitor_session: data.visitor_session,
            device_type:     data.device_type,
            browser:         data.browser,
        });
    });

    // Return immediately — do not await the write above
    return { ok: true };
}

/**
 * 📈 getAnalyticsDashboardAction — Fetch global analytics for the admin UI.
 */
export async function getAnalyticsDashboardAction() {
    return analyticsLogsDb.getGlobalStats();
}

/**
 * 📊 getResourceAnalyticsAction — Fetch stats for a specific profile or resource.
 */
export async function getResourceAnalyticsAction(resourceId: string) {
    return analyticsLogsDb.getResourceStats(resourceId);
}
