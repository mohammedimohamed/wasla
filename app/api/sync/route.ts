import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { auditTrail } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { leads } = body;

        // Verify array payload structure cleanly
        if (!Array.isArray(leads) || leads.length === 0) {
            return NextResponse.json({ success: true, synced_ids: [] });
        }

        const syncedIds: string[] = [];

        // Identify current session context securely (could be null for Kiosk)
        const session = await getSession();

        // 1. Transaction strictly locks processing ensuring partial failures rollback
        const executeSync = db.transaction(() => {
            for (const item of leads) {
                // Extracts payload shape configured heavily natively by Next/TypeScript
                const { id: offlineId, type, payload } = item;

                // Establish definitive unique key ignoring the temporary localStorage key
                const definitiveId = uuidv4();

                const source = type; // "kiosk" || "commercial"
                const deviceId = payload.device_id || null;

                // Determine Creator (Anonymous if Kiosk natively, otherwise parse user Session securely)
                const createdBy = type === 'commercial'
                    ? (session?.userId || payload.created_by || null)
                    : null;

                // Serialize dynamic form layout securely into standardized raw column layout
                const metadataStr = JSON.stringify(payload);

                // Insert into generic WASLA mapping bypassing logic handlers like Reward distribution naturally 
                // since they occurred entirely offline with zero visibility over Active limits.
                db.prepare(`
                    INSERT INTO leads (id, source, metadata, sync_status, created_by, device_id, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    definitiveId,
                    source,
                    metadataStr,
                    'synced', // Mark definitively recovered natively meaning Admin Dashboard captures it immediately 
                    createdBy,
                    deviceId,
                    new Date().toISOString(),
                    new Date().toISOString()
                );

                // Push temporary localStorage ID indicating to the React hook to permanently delete it off-device 
                syncedIds.push(offlineId);
            }

            // Log full event block indicating exactly how many hits were recovered over the Wi-Fi restoration
            auditTrail.logAction('system', 'SYNC', 'LEADS(BATCH)', 'batch', `Synchronized ${syncedIds.length} offline leads contextually from background loop.`);
            return syncedIds;
        });

        const completedIds = executeSync();

        // Send IDs explicitly ensuring frontend deletion
        return NextResponse.json({ success: true, synced_ids: completedIds });
    } catch (error) {
        console.error('[Sync API Execution Fault]', error);
        return NextResponse.json({ error: 'Failed aggressively during sync transaction sequence.' }, { status: 500 });
    }
}
