import { NextResponse } from 'next/server';
import { db, auditTrail, leadsDb, formConfigDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { leads } = body;

        if (!Array.isArray(leads) || leads.length === 0) {
            return NextResponse.json({ success: true, synced_ids: [], failed_ids: [] });
        }

        const session = await getSession();
        const syncedIds: string[] = [];
        const failedIds: string[] = [];

        // Grab form version once — batch is assumed homogenous
        let formVersion = 1;
        try {
            const config = formConfigDb.get();
            formVersion = config ? config._version : 1;
        } catch (_) { }

        for (const item of leads) {
            /**
             * item shape (from IndexedDB OfflineLead):
             *   client_uuid: string  ← idempotency key
             *   type: 'kiosk' | 'commercial'
             *   payload: any
             *   timestamp: number
             */
            const { client_uuid, type, payload } = item;

            // Guard: skip malformed entries
            if (!client_uuid || !payload) {
                console.warn('[Sync API] Skipping malformed item:', item);
                continue;
            }

            try {
                // ── IDEMPOTENCY CHECK ─────────────────────────────────────
                // If the client_uuid was already committed (e.g. flickering connection),
                // just acknowledge it so the client removes it from the local queue.
                const existing = db.prepare(
                    `SELECT id FROM leads WHERE json_extract(metadata, '$.client_uuid') = ? LIMIT 1`
                ).get(client_uuid) as { id: string } | undefined;

                if (existing) {
                    console.log(`[Sync API] Duplicate detected for client_uuid: ${client_uuid} — skipping insert.`);
                    syncedIds.push(client_uuid);
                    continue;
                }

                // ── INSERT ────────────────────────────────────────────────
                const definitiveId = uuidv4();
                const source = type || 'kiosk';
                const cleanDevice = payload.device_id
                    ? String(payload.device_id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50) || 'offline'
                    : 'offline';

                const createdBy = type === 'commercial'
                    ? (session?.userId || payload.created_by || null)
                    : null;

                // Embed client_uuid inside metadata so idempotency check works
                const enrichedPayload = { ...payload, client_uuid };
                const metadataStr = JSON.stringify(enrichedPayload);

                db.prepare(`
                    INSERT INTO leads (id, source, metadata, sync_status, created_by, device_id, form_version, created_at, updated_at)
                    VALUES (?, ?, ?, 'synced', ?, ?, ?, ?, ?)
                `).run(
                    definitiveId,
                    source,
                    metadataStr,
                    createdBy,
                    cleanDevice,
                    formVersion,
                    new Date(item.timestamp || Date.now()).toISOString(),
                    new Date().toISOString()
                );

                // Fire async intelligence analysis — non-blocking
                leadsDb.analyzeLead(definitiveId).catch(err =>
                    console.error('[Sync API] Analytics error:', err)
                );

                syncedIds.push(client_uuid);
            } catch (itemError) {
                console.error(`[Sync API] Failed to process client_uuid: ${client_uuid}`, itemError);
                failedIds.push(client_uuid);
            }
        }

        if (syncedIds.length > 0) {
            auditTrail.logAction(
                'system', 'SYNC', 'LEADS(BATCH)', 'batch',
                `Background sync committed ${syncedIds.length} offline leads. Failed: ${failedIds.length}.`
            );
        }

        return NextResponse.json({
            success: true,
            synced_ids: syncedIds,
            failed_ids: failedIds,
        });

    } catch (error) {
        console.error('[Sync API] Fatal error:', error);
        return NextResponse.json({ error: 'Sync transaction failed.' }, { status: 500 });
    }
}
