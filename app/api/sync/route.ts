export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db, auditTrail, leadsDb, formConfigDb, settingsDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { encryptMetadata } from '@/src/lib/crypto';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { leads, agentId, tenantId } = body;

        if (!Array.isArray(leads) || leads.length === 0) {
            return NextResponse.json({ success: true, synced_ids: [], failed_ids: [] });
        }

        const session = await getSession();
        const syncedIds: string[] = [];
        const failedIds: string[] = [];

        // 🛡️ Context Resolver: Prioritize payload, then session, then system defaults
        const finalAgentId = agentId || session?.userId || 'system';
        const finalTenantId = tenantId || session?.tenantId || '00000000-0000-0000-0000-000000000000';

        // Grab form version once — batch is assumed homogenous
        let formVersion = 1;
        try {
            const config = formConfigDb.get();
            formVersion = config ? config._version : 1;
        } catch (_) { }

        for (const item of leads) {
            const { client_uuid, type, payload } = item;

            // Guard: skip malformed entries
            if (!client_uuid || !payload) {
                console.warn('[Sync API] Skipping malformed item:', item);
                continue;
            }

            try {
                // ── IDEMPOTENCY CHECK ─────────────────────────────────────
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

                // Use the agent context from the sync request if available
                const createdBy = source === 'commercial' ? (agentId || payload.agent_id || finalAgentId) : 'system';

                // Embed client_uuid inside metadata so idempotency check works
                const enrichedPayload = encryptMetadata({ ...payload, client_uuid }, settingsDb.isEncryptionEnabled());
                const metadataStr = JSON.stringify(enrichedPayload);

                db.prepare(`
                    INSERT INTO leads (id, source, metadata, sync_status, created_by, device_id, form_version, created_at, updated_at, tenant_id)
                    VALUES (?, ?, ?, 'synced', ?, ?, ?, ?, ?, ?)
                `).run(
                    definitiveId,
                    source,
                    metadataStr,
                    createdBy,
                    cleanDevice,
                    formVersion,
                    new Date(item.timestamp || Date.now()).toISOString(),
                    new Date().toISOString(),
                    finalTenantId
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
                finalAgentId, 'SYNC', 'LEADS(BATCH)', 'batch',
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
