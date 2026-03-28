export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db, settingsDb, leadsDb, auditTrail, isModuleEnabled } from '@/lib/db';
import { forceEncryptMetadata, decryptMetadata, isActuallyEncrypted } from '@/src/modules/vault/lib/crypto';

async function requireAdmin() {
    if (!isModuleEnabled('vault')) return { error: 'Module Disabled', status: 403 as const };
    const session = await getSession();
    if (!session) return { error: 'Auth Required', status: 401 as const };
    if (session.role !== 'ADMINISTRATOR') return { error: 'Forbidden', status: 403 as const };
    return { session };
}

/**
 * GET /api/admin/vault
 * Returns current encryption state.
 */
export async function GET() {
    const auth = await requireAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const encryption_enabled = settingsDb.isEncryptionEnabled();
    return NextResponse.json({ success: true, encryption_enabled });
}

/**
 * POST /api/admin/vault
 * Actions:
 *   { action: 'TOGGLE', enabled: boolean }  — turn encryption on/off
 *   { action: 'MIGRATE' }                    — encrypt all plaintext leads with current key
 */
export async function POST(request: Request) {
    const auth = await requireAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { action } = body;

    // ── TOGGLE ────────────────────────────────────────────────────────────────
    if (action === 'TOGGLE') {
        const { enabled } = body;
        if (typeof enabled !== 'boolean') {
            return NextResponse.json({ error: 'enabled must be boolean' }, { status: 400 });
        }

        settingsDb.update({ encryption_enabled: enabled ? 1 : 0 } as any, auth.session!.userId);
        auditTrail.logAction(auth.session!.userId, 'UPDATE', 'VAULT', 'global',
            `Encryption ${enabled ? 'ENABLED' : 'DISABLED'} by admin`);

        console.log(`[Vault] Encryption toggled ${enabled ? 'ON ✅' : 'OFF ❌'} by ${auth.session!.userId}`);
        return NextResponse.json({ success: true, encryption_enabled: enabled });
    }

    // ── MIGRATE ───────────────────────────────────────────────────────────────
    if (action === 'MIGRATE') {
        const allLeads = db.prepare(
            "SELECT id, metadata FROM leads WHERE status = 'active' OR status IS NULL"
        ).all() as { id: string; metadata: string }[];

        let migrated = 0;
        let skipped = 0;

        const stmt = db.prepare('UPDATE leads SET metadata = ? WHERE id = ?');

        const migrate = db.transaction(() => {
            const processedIds: string[] = [];
            for (const lead of allLeads) {
                try {
                    const meta = JSON.parse(lead.metadata || '{}');
                    const originalStr = JSON.stringify(meta);
                    
                    const secured = forceEncryptMetadata(meta);
                    const securedStr = JSON.stringify(secured);

                    // If they are exactly the same, forceEncryptMetadata did nothing
                    // which means all sensitive fields are either empty, or ALREADY encrypted
                    if (originalStr === securedStr) { 
                        skipped++; 
                        continue; 
                    }

                    stmt.run(securedStr, lead.id);
                    processedIds.push(lead.id);
                    migrated++;
                } catch {
                    skipped++;
                }
            }
            return processedIds;
        });

        const migratedIds = migrate();

        // Fire asynchronous score recalculation for affected leads
        if (isModuleEnabled('intelligence')) {
            import('@/src/modules/intelligence/lib/scoring')
                .then(({ intelligenceLogic }) => Promise.all(migratedIds.map((id: string) => intelligenceLogic.analyzeLead(id))))
                .catch(err => console.error('[Vault Migration] Score recount failed:', err));
        }

        auditTrail.logAction(auth.session!.userId, 'UPDATE', 'VAULT(MIGRATE)', 'bulk',
            `Encrypted ${migrated} plaintext leads. Skipped: ${skipped}`);

        console.log(`[Vault Migration] ✅ Encrypted: ${migrated} | Skipped (already encrypted): ${skipped}`);
        return NextResponse.json({ success: true, migrated, skipped });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
