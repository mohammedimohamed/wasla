import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const stmt = db.prepare('SELECT * FROM leads WHERE id = ?');
        const lead = stmt.get(params.id) as any;

        if (!lead) {
            return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            lead: {
                ...lead,
                produits: JSON.parse(lead.produits || '[]'),
                actions: JSON.parse(lead.actions || '[]'),
            }
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
        const data = await request.json();

        // Check if exists
        const checkStmt = db.prepare('SELECT id FROM leads WHERE id = ?');
        if (!checkStmt.get(params.id)) {
            return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
        }

        const query = `
      UPDATE leads SET
        societe = ?, contact = ?, telephone = ?, email = ?, ville = ?, fonction = ?,
        type_client = ?, produits = ?, projet = ?, quantite = ?, delai = ?, budget = ?,
        actions = ?, note = ?, qualified_by = ?, sync_status = 'pending'
      WHERE id = ?
    `;

        const stmt = db.prepare(query);
        stmt.run(
            data.societe || null,
            data.contact,
            data.telephone || null,
            data.email || null,
            data.ville || null,
            data.fonction || null,
            data.type_client,
            JSON.stringify(data.produits),
            data.projet || null,
            data.quantite || null,
            data.delai || null,
            data.budget || null,
            data.actions ? JSON.stringify(data.actions) : null,
            data.note || null,
            data.qualified_by || null,
            params.id
        );

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
