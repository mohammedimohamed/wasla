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
        const backupKey = request.headers.get('X-Backup-Key');
        const isValidCronKey = backupKey && backupKey === dynamicConfig.backupSecretKey;

        if (!isValidCronKey) {
            // Fall back to JWT session auth (for UI-triggered backups)
            const session = await getSession();
            if (!session) {
                return NextResponse.json(
                    { error: 'Authentication required. Use a JWT session or X-Backup-Key header.' },
                    { status: 401 }
                );
            }
            if (session.role !== 'ADMINISTRATOR') {
                return NextResponse.json(
                    { error: 'Only ADMINISTRATOR can trigger a database backup.' },
                    { status: 403 }
                );
            }
        }

        // ── 2. BACKUP: Use SQLite online hot-backup API ───────────────────────
        // Write to OS temp dir to avoid interfering with the live DB directory
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_');
        const backupFilename = `wasla_backup_${timestamp}.sqlite`;
        const backupPath = path.join(os.tmpdir(), backupFilename);

        // better-sqlite3's backup() is synchronous and transaction-safe
        await db.backup(backupPath);

        // ── 3. STREAM: Read backup file and respond ───────────────────────────
        const fileBuffer = fs.readFileSync(backupPath);
        const fileSize = fs.statSync(backupPath).size;

        // Clean up temp file after reading
        fs.unlinkSync(backupPath);

        // ── 4. LOG: Audit trail ───────────────────────────────────────────────
        const authMethod = isValidCronKey ? 'cron-key' : 'jwt-session';
        console.log(`[Backup] ✅ Successful backup triggered via ${authMethod}. Size: ${(fileSize / 1024).toFixed(1)} KB`);

        return new Response(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${backupFilename}"`,
                'Content-Length': String(fileSize),
                'Cache-Control': 'no-store, no-cache',
                'X-Backup-Size-KB': String((fileSize / 1024).toFixed(1)),
                'X-Backup-Auth': authMethod,
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
