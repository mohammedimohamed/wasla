"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { logVisitAction } from "@/app/actions/analytics";
import type { AnalyticsEventType } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// 🔧 UA PARSER — runs purely on the client, no external deps
// ─────────────────────────────────────────────────────────────────────────────
function parseDevice(ua: string): string {
    if (/tablet|ipad|playbook|silk/i.test(ua)) return "Tablet";
    if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "Mobile";
    return "Desktop";
}

function parseBrowser(ua: string): string {
    if (/edg\//i.test(ua))     return "Edge";
    if (/opr\//i.test(ua))     return "Opera";
    if (/chrome/i.test(ua))    return "Chrome";
    if (/safari/i.test(ua))    return "Safari";
    if (/firefox/i.test(ua))   return "Firefox";
    if (/trident/i.test(ua))   return "IE";
    return "Other";
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔑 SESSION FINGERPRINT — anonymous, browser-scoped, never leaves client
// Uses sessionStorage so it resets every browser session (tab close).
// No PII, no IP, no cookie — RGPD-safe.
// ─────────────────────────────────────────────────────────────────────────────
function getOrCreateSession(): string {
    const KEY = "__wasla_sid";
    try {
        let sid = sessionStorage.getItem(KEY);
        if (!sid) {
            // Generate a random 16-byte hex string
            const arr = new Uint8Array(16);
            crypto.getRandomValues(arr);
            sid = Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
            sessionStorage.setItem(KEY, sid);
        }
        return sid;
    } catch {
        return "anon";
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🗺️ RESOURCE RESOLVER — determines event_type and resource_id from the path
// ─────────────────────────────────────────────────────────────────────────────
interface ResolvedSource {
    event_type: AnalyticsEventType;
    resource_id?: string;
}

function resolveSource(path: string, explicitResourceId?: string): ResolvedSource {
    if (path.startsWith("/p/")) {
        // NFC Profile: resource_id is the user id, passed in via props
        return { event_type: "NFC_SCAN", resource_id: explicitResourceId };
    }
    if (path === "/kiosk" || path.startsWith("/kiosk")) {
        return { event_type: "PAGE_VIEW", resource_id: "KIOSK_MAIN" };
    }
    return { event_type: "PAGE_VIEW", resource_id: explicitResourceId };
}

// ─────────────────────────────────────────────────────────────────────────────
// 🛰️ AnalyticsTracker Component
// Drop into any layout; re-fires on every route change.
// ─────────────────────────────────────────────────────────────────────────────
interface AnalyticsTrackerProps {
    /** Pass the DB resource id when known server-side (e.g. user.id for /p/ pages) */
    resourceId?: string;
}

export function AnalyticsTracker({ resourceId }: AnalyticsTrackerProps) {
    const pathname = usePathname();
    const lastTracked = useRef<string | null>(null);

    useEffect(() => {
        // Guard: only fire when the path actually changes
        if (lastTracked.current === pathname) return;
        lastTracked.current = pathname;

        const ua = navigator.userAgent;
        const device  = parseDevice(ua);
        const browser = parseBrowser(ua);
        const session = getOrCreateSession();
        const { event_type, resource_id } = resolveSource(pathname, resourceId);

        // Fire-and-forget: do NOT await
        logVisitAction({
            event_type,
            path:            pathname,
            resource_id,
            visitor_session: session,
            device_type:     device,
            browser,
        });
    }, [pathname, resourceId]);

    return null; // Invisible component — zero DOM output
}

// ─────────────────────────────────────────────────────────────────────────────
// 📎 useTrackDownload — Hook for file download tracking
// Usage: const trackDownload = useTrackDownload(resourceId);
//        <a onClick={() => trackDownload(fileId)} href={url}>Download</a>
// ─────────────────────────────────────────────────────────────────────────────
export function useTrackDownload(parentResourceId?: string) {
    const pathname = usePathname();

    return function trackDownload(fileId: string) {
        const ua = navigator.userAgent;
        logVisitAction({
            event_type:      "FILE_DOWNLOAD",
            path:            pathname,
            resource_id:     fileId || parentResourceId,
            visitor_session: getOrCreateSession(),
            device_type:     parseDevice(ua),
            browser:         parseBrowser(ua),
        });
    };
}
