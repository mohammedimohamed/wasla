export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { isModuleEnabled } from '@/lib/db';
import { mediashowDb } from '@/src/modules/mediashow/lib/mediashow-db';

/**
 * 📺 GET /api/mediashow
 * Public route to list assets for the Kiosk/Marketing mode.
 * No Authentication required.
 */
export async function GET() {
    if (!isModuleEnabled('mediashow')) return new Response(null, { status: 403 });
    try {
        const assets = mediashowDb.list();
        return NextResponse.json({ success: true, assets });
    } catch (e) {
        console.error('[Public Mediashow API Error]', e);
        return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
    }
}
