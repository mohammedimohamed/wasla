import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Authenticate (Admin only)
        const session = await getSession();
        if (!session || session.role !== 'ADMINISTRATOR') {
            return NextResponse.json({ error: 'Unauthorized or Forbidden' }, { status: 401 });
        }

        // Query leads grouped by device_id, excluding User-Agent strings, combined with managed locations
        const stats = db.prepare(`
            WITH ValidLeads AS (
                SELECT 
                    COALESCE(device_id, 'Generic_QR') as location,
                    created_at
                FROM leads
                WHERE COALESCE(device_id, '') NOT LIKE '%Mozilla%' 
                  AND COALESCE(device_id, '') NOT LIKE '%Chrome%' 
                  AND COALESCE(device_id, '') NOT LIKE '%Safari%'
                  AND COALESCE(device_id, '') NOT LIKE '%AppleWebKit%'
            ),
            AllLocations AS (
                SELECT name as location FROM kiosk_locations
                UNION
                SELECT location FROM ValidLeads
            )
            SELECT 
                l.location,
                COUNT(v.created_at) as total_scans,
                MAX(v.created_at) as last_scan
            FROM AllLocations l
            LEFT JOIN ValidLeads v ON l.location = v.location
            GROUP BY l.location
            ORDER BY total_scans DESC, last_scan DESC, l.location ASC
        `).all();

        return NextResponse.json({ success: true, stats });
    } catch (error) {
        console.error('QR Stats Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
