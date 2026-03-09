import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

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
        const meta = (rawMeta.metadata && typeof rawMeta.metadata === 'object' && !Array.isArray(rawMeta.metadata))
            ? rawMeta.metadata
            : rawMeta;

        const flattenedLead = {
            ...lead,
            ...meta,
            // Map common identifier fields to a stable 'contact' key for the profile header
            contact: meta.contact || meta.nom || meta.name || meta.prenom || "—",
            societe: meta.societe || meta.entreprise || meta.company || null,
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
        const existingMeta = JSON.parse(existing.metadata || '{}');
        const updatedMeta = { ...existingMeta, ...customFields };

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
