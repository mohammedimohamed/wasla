import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

// Initialize DB on first use
initDb();

export async function POST(request: Request) {
    try {
        const data = await request.json();

        // Prepare values
        const query = `
      INSERT INTO leads (
        id, sync_status, source, created_at, 
        societe, contact, telephone, email, ville, fonction,
        type_client, produits, projet, quantite, delai, budget,
        actions, note, reward_id, reward_sent, commercial, qualified_by, device_id,
        consent_given, consent_at, consent_source
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `;

        const stmt = db.prepare(query);
        stmt.run(
            data.id,
            data.sync_status || 'pending',
            data.source || 'commercial',
            data.created_at || new Date().toISOString(),
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
            data.reward_id || null,
            data.reward_sent || 0,
            data.commercial || null,
            data.qualified_by || null,
            data.device_id || null,
            data.consent_given || 1,
            data.consent_at || new Date().toISOString(),
            data.consent_source || null
        );

        return NextResponse.json({ success: true, id: data.id });
    } catch (error) {
        console.error('Error creating lead:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const source = searchParams.get('source');

        let query = 'SELECT * FROM leads ORDER BY created_at DESC';
        const params: any[] = [];

        if (status || source) {
            query = 'SELECT * FROM leads WHERE 1=1';
            if (status) {
                query += ' AND sync_status = ?';
                params.push(status);
            }
            if (source) {
                query += ' AND source = ?';
                params.push(source);
            }
            query += ' ORDER BY created_at DESC';
        }

        const stmt = db.prepare(query);
        const leads = stmt.all(...params);

        return NextResponse.json({
            success: true,
            leads: leads.map((l: any) => ({
                ...l,
                produits: JSON.parse(l.produits || '[]'),
                actions: JSON.parse(l.actions || '[]'),
            }))
        });
    } catch (error) {
        console.error('Error fetching leads:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
