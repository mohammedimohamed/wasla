import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const leads = await request.json();

        // In a real environment, this endpoint would receive data on a REMOTE server.
        // Here, we simulate the 'sync' by updating the local sync_status.

        if (!Array.isArray(leads)) {
            return NextResponse.json({ success: false, error: 'Expected an array of leads' }, { status: 400 });
        }

        const ids = leads.map(l => l.id);
        const placeholders = ids.map(() => '?').join(',');

        // Update labels to 'synced' and set synced_at
        const now = new Date().toISOString();
        const stmt = db.prepare(`
      UPDATE leads 
      SET sync_status = 'synced', synced_at = ? 
      WHERE id IN (${placeholders})
    `);

        stmt.run(now, ...ids);

        // Log the sync
        const logStmt = db.prepare(`
      INSERT INTO sync_log (id, synced_at, leads_count, status)
      VALUES (?, ?, ?, ?)
    `);
        logStmt.run(crypto.randomUUID(), now, leads.length, 'success');

        return NextResponse.json({
            success: true,
            confirmed: ids,
            synced_at: now
        });
    } catch (error) {
        console.error('Sync error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
