export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { leadsDb, formConfigDb, db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { isModuleEnabled } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * 📊 LEADS API (LIST)
 * Fetches visible leads based on RBAC rules.
 */
export async function GET() {
    try {
        const session = await getSession();
        if (!session || !session.hasPin) {
            return NextResponse.json({ error: 'Auth Required' }, { status: 401 });
        }

        const leads = await leadsDb.getVisibleLeads(session.userId);
        return NextResponse.json({ success: true, leads });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
    }
}

/**
 * 📥 LEADS API (CREATE)
 * Strictly attributes leads based on the current Session.
 * Supports idempotency via client_uuid to prevent duplicates from offline sync retries.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { source, deviceId, client_uuid, ...customFields } = body;

        // ── IDEMPOTENCY CHECK ─────────────────────────────────────────────────
        // If this client_uuid already committed (e.g. background task + SyncManager both fired),
        // return the existing record id instead of inserting a duplicate.
        if (client_uuid) {
            const existing = db.prepare(
                `SELECT id FROM leads WHERE json_extract(metadata, '$.client_uuid') = ? LIMIT 1`
            ).get(client_uuid) as { id: string } | undefined;

            if (existing) {
                return NextResponse.json({ success: true, id: existing.id }, { status: 200 });
            }
        }

        const session = await getSession();

        // 🛡️ SECURITY: Attribution strictly from JWT (Server-Side Enforcement)
        const creatorId = session?.userId || 'SYSTEM_KIOSK';
        const teamId = session?.teamId || null;

        // Embed client_uuid into metadata for future idempotency lookups
        const metadata = { ...customFields, ...(client_uuid ? { client_uuid } : {}) };

        // Grab active form version
        const config = formConfigDb.get();
        const formVersion = config ? config._version : 1;

        const id = uuidv4();
        await leadsDb.create(
            id,
            metadata,
            source || 'unknown',
            creatorId,
            deviceId || 'localhost',
            teamId,
            formVersion,
            session?.tenantId
        );

        // ⚡ ASYNCHRONOUS INTELLIGENCE LAYER
        if (isModuleEnabled('intelligence')) {
            import('@/src/modules/intelligence/lib/scoring')
                .then(({ intelligenceLogic }) => intelligenceLogic.analyzeLead(id))
                .catch(err => console.error('[Intel Error]', err));
        }

        return NextResponse.json({ success: true, id }, { status: 201 });
    } catch (error) {
        console.error('[API Error] Lead submission failed:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
