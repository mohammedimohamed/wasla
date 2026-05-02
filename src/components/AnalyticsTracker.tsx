"use client";

import { useEffect, useRef } from "react";
import { trackVisitAction } from "@/app/actions/analytics";

interface AnalyticsTrackerProps {
    profileId?: string;
}

/**
 * 🛰️ Analytics Tracker Component
 * Mounts on public pages to trigger a visit capture.
 * Uses a ref to ensure it only tracks once per mount.
 */
export function AnalyticsTracker({ profileId }: AnalyticsTrackerProps) {
    const tracked = useRef(false);

    useEffect(() => {
        if (!tracked.current) {
            trackVisitAction(profileId);
            tracked.current = true;
        }
    }, [profileId]);

    return null; // Invisible component
}
