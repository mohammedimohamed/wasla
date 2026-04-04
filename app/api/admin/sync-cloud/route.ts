export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
    getSyncCloudConfig,
    updateSyncCloudConfig,
    getQueueStats,
    getQueueItems,
    forceRequeue,
    triggerSyncAsync,
} from '@/src/modules/sync-cloud/lib/sync-engine';

// ── GET /api/admin/sync-cloud ─────────────────────────────────────────────────
// Returns the current config + queue stats
export async function GET() {
    const session = await getSession();
    if (!session || session.role !== 'ADMINISTRATOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const config = getSyncCloudConfig();
    const stats = getQueueStats();
    const items = getQueueItems(20);

    return NextResponse.json({ config, stats, items });
}

// ── POST /api/admin/sync-cloud ────────────────────────────────────────────────
// Actions: update_config | force_sync | requeue_failed
export async function POST(request: Request) {
    const session = await getSession();
    if (!session || session.role !== 'ADMINISTRATOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { action, webhook_url, is_active, max_retries } = body;

    if (action === 'update_config') {
        updateSyncCloudConfig(
            { webhook_url, is_active, max_retries },
            session.userId
        );
        return NextResponse.json({ success: true, message: 'Configuration mise à jour.' });
    }

    if (action === 'force_sync') {
        triggerSyncAsync({
            webhookUrl: body.webhook_url || undefined,
            triggeredBy: session.userId,
        });
        return NextResponse.json({ success: true, message: 'Synchronisation forcée lancée en arrière-plan.' });
    }

    if (action === 'requeue_failed') {
        const count = forceRequeue();
        return NextResponse.json({ success: true, message: `${count} éléments remis en file d'attente.` });
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
}
