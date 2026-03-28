export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import db, { settingsDb, isModuleEnabled } from '@/lib/db';
import { getSession } from '@/lib/auth';
import * as securityGate from '@/src/lib/security-gate';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const stmt = db.prepare(`
            SELECT l.*, u.name as created_by_name 
            FROM leads l
            LEFT JOIN users u ON l.created_by = u.id
            WHERE l.id = ?
        `);
        const lead = stmt.get(params.id) as any;

        if (!lead) {
            return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
        }

        const session = await getSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
        }

        // 🛡️ SECURITY: Scope Check per user role
        if (session.role === 'SALES_AGENT' && lead.created_by !== session.userId) {
            return NextResponse.json({ success: false, error: 'Forbidden. This lead does not belong to you.' }, { status: 403 });
        }
        if (session.role === 'TEAM_LEADER' && lead.team_id !== session.teamId) {
            return NextResponse.json({ success: false, error: 'Forbidden. This lead does not belong to your team.' }, { status: 403 });
        }

        // 🛡️ ARCHITECTURAL FIX: Parse metadata and flatten for frontend
        const rawMeta = JSON.parse(lead.metadata || '{}');
        // Backward-compat: unwrap old double-nested {metadata: {...}} leads
        const metaToDecrypt = (rawMeta.metadata && typeof rawMeta.metadata === 'object' && !Array.isArray(rawMeta.metadata))
            ? rawMeta.metadata
            : rawMeta;
        
        const meta = await securityGate.decryptMetadata(metaToDecrypt);

        // Fetch Lineage Story (Phase 16)
        const lineageRows = db.prepare(`
            SELECT l.id, l.metadata, l.status, lin.created_at
            FROM lead_lineage lin
            JOIN leads l ON lin.parent_id = l.id
            WHERE lin.child_id = ?
            ORDER BY lin.created_at DESC
        `).all(params.id) as any[];

        const lineage = await Promise.all(lineageRows.map(async row => {
            const rowMetaRaw = JSON.parse(row.metadata || '{}');
            const rowMetaToDecrypt = (rowMetaRaw.metadata && typeof rowMetaRaw.metadata === 'object' && !Array.isArray(rowMetaRaw.metadata)) ? rowMetaRaw.metadata : rowMetaRaw;
            const rowMeta = await securityGate.decryptMetadata(rowMetaToDecrypt);
            return {
                id: row.id,
                status: row.status,
                created_at: row.created_at,
                name: rowMeta.contact || rowMeta.nom || rowMeta.name || rowMeta.prenom || 'Anonymous',
                company: rowMeta.societe || rowMeta.entreprise || rowMeta.company || '',
                phone: rowMeta.phone || '',
                email: rowMeta.email || '',
            };
        }));

        // Fetch Intelligence Logs (Phase 16)
        const logs = db.prepare(`
            SELECT message, created_at, type 
            FROM lead_intelligence_logs 
            WHERE lead_id = ? AND type = 'SALES_INTEL' 
            ORDER BY created_at DESC
        `).all(params.id) as any[];

        const flattenedLead = {
            ...lead,
            ...meta,
            // Map common identifier fields to a stable 'contact' key for the profile header
            contact: meta.contact || meta.nom || meta.name || meta.prenom || "—",
            societe: meta.societe || meta.entreprise || meta.company || null,
            _lineage: lineage,
            _logs: logs
        };

        return NextResponse.json({
            success: true,
            lead: flattenedLead
        });
    } catch (error) {
        console.error('Error fetching lead:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { source, device_id, ...customFields } = body;
        const now = new Date().toISOString();

        // 🛡️ SECURITY: Verify existence
        const checkStmt = db.prepare('SELECT id, metadata FROM leads WHERE id = ?');
        const existing = checkStmt.get(params.id) as any;
        if (!existing) {
            return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
        }

        // Bundle updates into metadata
        // We merge with existing metadata to preserve fields not sent in this specific PUT
        const existingMeta = await securityGate.decryptMetadata(JSON.parse(existing.metadata || '{}'));
        const updatedMeta = await securityGate.encryptMetadata({ ...existingMeta, ...customFields }, settingsDb.isEncryptionEnabled());

        const query = `
            UPDATE leads SET
                metadata = ?,
                updated_at = ?,
                sync_status = 'pending'
            WHERE id = ?
        `;

        const stmt = db.prepare(query);
        stmt.run(JSON.stringify(updatedMeta), now, params.id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating lead:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const checkStmt = db.prepare('SELECT sync_status FROM leads WHERE id = ?');
        const lead = checkStmt.get(params.id) as any;

        if (!lead) {
            return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
        }

        // Business rule: only delete if synced
        if (lead.sync_status !== 'synced') {
            return NextResponse.json({
                success: false,
                error: 'Un lead ne peut être supprimé que s\'il est déjà synchronisé'
            }, { status: 403 });
        }

        const stmt = db.prepare('DELETE FROM leads WHERE id = ?');
        stmt.run(params.id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting lead:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
