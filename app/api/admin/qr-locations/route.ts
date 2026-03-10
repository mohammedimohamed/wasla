import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMINISTRATOR') {
            return NextResponse.json({ error: 'Unauthorized or Forbidden' }, { status: 401 });
        }

        const { location } = await request.json();

        // 🛡️ Data Sanitization: Allow only alphanumeric, dashes, and underscores (max 50 chars)
        const sanitizedLocation = String(location || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50);

        if (!sanitizedLocation) {
            return NextResponse.json({ error: 'Location invalid' }, { status: 400 });
        }

        // Register the location if it doesn't already exist
        const now = new Date().toISOString();
        db.prepare(`
            INSERT OR IGNORE INTO kiosk_locations (name, created_at, created_by)
            VALUES (?, ?, ?)
        `).run(sanitizedLocation, now, session.userId);

        return NextResponse.json({ success: true, location: sanitizedLocation });
    } catch (error) {
        console.error('QR Location Registration Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
