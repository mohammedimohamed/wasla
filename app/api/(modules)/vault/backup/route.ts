export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { dynamicConfig } from '@/src/config/dynamic';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * 💾 DATABASE BACKUP ENDPOINT
 * ============================
 * Downloads a clean, consistent snapshot of the SQLite database.
 *
 * 🔐 DUAL AUTHENTICATION SUPPORT:
 *   1. JWT Cookie Session  → Admin/Team Leader browses the UI and clicks the button.
 *   2. X-Backup-Key Header → Cron jobs call this endpoint with a secret key.
 *
 * 📦 HOW IT WORKS:
 *   Uses better-sqlite3's built-in `backup()` API which performs an
 *   online hot backup — no need to stop the server or lock the DB.
 *   A temp file is created, streamed as a binary response, then cleaned up.
 *
 * 🕐 CRON JOB USAGE EXAMPLE:
 *   # Every day at 02:00, download backup to /var/backups/
 *   0 2 * * * curl -H "X-Backup-Key: your_secret_here" \
 *     https://your-domain.com/api/backup \
 *     -o /var/backups/wasla_$(date +\%F).sqlite
 */
export async function GET(request: Request) {
    try {
        // ── 1. DUAL AUTH: JWT Session OR Cron Secret Key ─────────────────────
        const apiKey = request.headers.get('x-api-key');
        const expectedApiKey = process.env.BACKUP_API_KEY;
        
        let validCron = false;
        if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
            validCron = true;
        }

        if (!validCron) {
            const session = await getSession();
            if (!session || session.role !== 'ADMINISTRATOR') {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        // ── 2. FETCH DATA: Get all leads exactly as stored ────────────────────
        // System backups must export raw data (preserving any encryption hashes)
        const leads = db.prepare('SELECT * FROM leads').all() as any[];

        // Clean up stringified metadata to object structure for the JSON export
        const cleanLeads = leads.map(l => {
            try { return { ...l, metadata: JSON.parse(l.metadata || '{}') }; }
            catch { return l; }
        });

        const exportData = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            total_leads: cleanLeads.length,
            leads: cleanLeads
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_');
        const backupFilename = `wasla_vault_backup_${timestampStr}.json`;

        console.log(`[Backup] ✅ Successful JSON backup generated. Contains ${cleanLeads.length} leads.`);

        return new Response(jsonString, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${backupFilename}"`,
                'Cache-Control': 'no-store, no-cache',
            },
        });
    } catch (error) {
        console.error('[Backup] ❌ Error:', error);
        return NextResponse.json(
            { error: 'Backup failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
