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
        
        // Strict verification: ensure the env variable is actually set in production!
        const isValidCronKey = apiKey && expectedApiKey && apiKey === expectedApiKey;

        if (!isValidCronKey) {
            // Fall back to JWT session auth (for UI-triggered backups)
            const session = await getSession();
            if (!session || session.role !== 'ADMINISTRATOR') {
                return NextResponse.json(
                    { error: 'Unauthorized. Provide a valid x-api-key header or use an ADMINISTRATOR session.' },
                    { status: 401 }
                );
            }
        }

        // ── 2. BACKUP: Use SQLite online hot-backup API ───────────────────────
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_');
        const backupFilename = `wasla_backup_${timestamp}.sqlite`;
        const backupPath = path.join(os.tmpdir(), backupFilename);

        await db.backup(backupPath);
        const fileSize = fs.statSync(backupPath).size;

        // ── 3. STREAM: Safe Streaming Implementation ──────────────────────────
        // Using a Web ReadableStream to prevent memory crashes on heavy DB files.
        const nodeStream = fs.createReadStream(backupPath);
        const webStream = new ReadableStream({
            start(controller) {
                nodeStream.on('data', (chunk: any) => {
                    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                    controller.enqueue(new Uint8Array(buffer));
                });
                nodeStream.on('end', () => {
                    controller.close();
                    fs.unlink(backupPath, () => {}); // Async cleanup
                });
                nodeStream.on('error', (err) => {
                    controller.error(err);
                    fs.unlink(backupPath, () => {});
                });
            },
            cancel() {
                nodeStream.destroy();
                fs.unlink(backupPath, () => {});
            }
        });

        // ── 4. LOG: Audit trail ───────────────────────────────────────────────
        const authMethod = isValidCronKey ? 'api-key' : 'jwt-session';
        console.log(`[Backup] ✅ Successful backup streaming triggered via ${authMethod}. Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

        return new Response(webStream as unknown as BodyInit, {
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
