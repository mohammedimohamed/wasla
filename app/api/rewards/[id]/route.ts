import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const stmt = db.prepare('SELECT * FROM rewards WHERE id = ?');
        const reward = stmt.get(params.id) as any;

        if (!reward) {
            return NextResponse.json({ success: false, error: 'Reward not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            reward: {
                ...reward,
                produit_filter: reward.produit_filter ? JSON.parse(reward.produit_filter) : null,
            }
        });
    } catch (error) {
        console.error('Error fetching reward:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const data = await request.json();
        const now = new Date().toISOString();

        const query = `
      UPDATE rewards SET
        type_client = ?, reward_type = ?, title = ?, description = ?, value = ?, 
        produit_filter = ?, active = ?, updated_at = ?
      WHERE id = ?
    `;

        const stmt = db.prepare(query);
        stmt.run(
            data.type_client,
            data.reward_type,
            data.title,
            data.description || null,
            data.value,
            data.produit_filter ? JSON.stringify(data.produit_filter) : null,
            data.active ? 1 : 0,
            now,
            params.id
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating reward:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const stmt = db.prepare('DELETE FROM rewards WHERE id = ?');
        stmt.run(params.id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting reward:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
