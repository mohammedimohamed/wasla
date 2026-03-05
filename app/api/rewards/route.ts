import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    try {
        const stmt = db.prepare('SELECT * FROM rewards ORDER BY created_at DESC');
        const rewards = stmt.all() as any[];

        return NextResponse.json({
            success: true,
            rewards: rewards.map(r => ({
                ...r,
                produit_filter: r.produit_filter ? JSON.parse(r.produit_filter) : null
            }))
        });
    } catch (error) {
        console.error('Error fetching rewards:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const id = uuidv4();
        const now = new Date().toISOString();

        const query = `
      INSERT INTO rewards (
        id, type_client, reward_type, title, description, value, 
        produit_filter, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const stmt = db.prepare(query);
        stmt.run(
            id,
            data.type_client,
            data.reward_type,
            data.title,
            data.description || null,
            data.value,
            data.produit_filter ? JSON.stringify(data.produit_filter) : null,
            data.active !== undefined ? (data.active ? 1 : 0) : 1,
            now,
            now
        );

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error('Error creating reward:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
