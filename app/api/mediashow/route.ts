import { NextResponse } from 'next/server';
import { mediashowDb } from '@/lib/db';

/**
 * 📺 GET /api/mediashow
 * Public route to list assets for the Kiosk/Marketing mode.
 * No Authentication required.
 */
export async function GET() {
    try {
        const assets = mediashowDb.list();
        return NextResponse.json({ success: true, assets });
    } catch (e) {
        console.error('[Public Mediashow API Error]', e);
        return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
    }
}
