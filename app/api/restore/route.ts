export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db, leadsDb, auditTrail } from '@/lib/db';
import path from 'path';
import fs from 'fs';
import os from 'os';

async function requireAdmin() {
    const session = await getSession();
    if (!session) return { error: 'Auth Required', status: 401 as const };
    if (session.role !== 'ADMINISTRATOR') return { error: 'Forbidden', status: 403 as const };
    return { session };
}

/**
 * POST /api/restore
 * Accepts a multipart/form-data upload with a field named "backup".
 * Can be either a .sqlite (binary hot-backup) or .json (JSON export).
 *
 * 🛡️ KEY GUARD: Before restoring, picks one encrypted record and verifies
 *   our current ENCRYPTION_KEY can decrypt it. If it cannot, the restore is
 *   blocked to prevent turning encrypted junk into "restored" data.
 */
import * as securityGate from '@/src/lib/security-gate';

export async function POST(request: Request) {
    const auth = await requireAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const formData = await request.formData();
        const file = formData.get('backup') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No backup file provided' }, { status: 400 });
        }

        const fileName = file.name.toLowerCase();
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let dataStr = '';
        try {
            dataStr = buffer.toString('utf-8');
            // Try to parse to see if it's valid JSON
            JSON.parse(dataStr);
        } catch {
            return NextResponse.json({ error: 'Fichier JSON invalide.' }, { status: 400 });
        }

        let restoredCount = 0;
        try {
            restoredCount = await leadsDb.restore(dataStr, 'json');
        } catch (err: any) {
            if (err.message && err.message.includes('Clé de chiffrement invalide')) {
                return NextResponse.json({ success: false, error: err.message }, { status: 422 });
            }
            throw err;
        }

        auditTrail.logAction(auth.session!.userId, 'RESTORE', 'DATABASE(JSON)', 'bulk',
            `Restored ${restoredCount} leads from JSON backup`);

        console.log(`[Restore] Success: ${restoredCount} leads imported`);
        return NextResponse.json({ success: true, restored: restoredCount, format: 'json' });

    } catch (error: any) {
        console.error('[Restore] Error:', error);
        return NextResponse.json({ error: error.message || 'Restore failed' }, { status: 500 });
    }
}

