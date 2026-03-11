import { NextResponse } from 'next/server';
import { leadsDb, formConfigDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
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

        const leads = leadsDb.getVisibleLeads(session.userId);
        return NextResponse.json({ success: true, leads });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
    }
}

/**
 * 📥 LEADS API (CREATE)
 * Strictly attributes leads based on the current Session.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { source, deviceId, ...customFields } = body;

        const session = await getSession();

        // 🛡️ SECURITY: Attribution strictly from JWT (Server-Side Enforcement)
        const creatorId = session?.userId || 'SYSTEM_KIOSK';
        const teamId = session?.teamId || null;

        const metadata = customFields || {};

        // Grab active form version
        const config = formConfigDb.get();
        const formVersion = config ? config._version : 1;

        const id = uuidv4();
        leadsDb.create(
            id,
            metadata,
            source || 'unknown',
            creatorId,
            deviceId || 'localhost',
            teamId, // Force server-side team attribution
            formVersion
        );

        // ⚡ ASYNCHRONOUS INTELLIGENCE LAYER
        leadsDb.analyzeLead(id).catch(err => console.error('[Intel Error]', err));

        return NextResponse.json({ success: true, id }, { status: 201 });
    } catch (error) {
        console.error('[API Error] Lead submission failed:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
