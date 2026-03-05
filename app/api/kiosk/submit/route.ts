import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { matchReward } from '@/lib/rewards';

export async function POST(request: Request) {
    try {
        const data = await request.json();

        // 1. Anti-doublon (2h)
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        const checkStmt = db.prepare(`
      SELECT id FROM leads 
      WHERE (email = ? OR telephone = ?) 
      AND created_at > ?
    `);
        const existing = checkStmt.get(data.email, data.telephone, twoHoursAgo);

        if (existing) {
            return NextResponse.json({
                success: false,
                message: "Vous avez déjà participé ! Un email vous a été envoyé."
            }, { status: 400 });
        }

        // 2. Match Reward
        const matchedReward = matchReward(data.type_client, data.produits);

        // 3. Save Lead
        const query = `
      INSERT INTO leads (
        id, sync_status, source, created_at, 
        societe, contact, telephone, email, ville, fonction,
        type_client, produits, reward_id, reward_sent,
        consent_given, consent_at, consent_source
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?
      )
    `;

        const stmt = db.prepare(query);
        stmt.run(
            data.id,
            'pending',
            data.source || 'kiosk',
            data.created_at,
            null,
            data.contact,
            data.telephone,
            data.email,
            data.ville || null,
            null,
            data.type_client,
            JSON.stringify(data.produits),
            matchedReward?.id || null,
            matchedReward ? 1 : 0,
            data.consent_given,
            data.consent_at,
            data.consent_source
        );

        return NextResponse.json({
            success: true,
            reward: matchedReward
        });
    } catch (error) {
        console.error('Kiosk submission error:', error);
        return NextResponse.json({ success: false, message: 'Erreur interne' }, { status: 500 });
    }
}
