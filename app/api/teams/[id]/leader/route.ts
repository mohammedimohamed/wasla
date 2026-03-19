export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db, auditTrail } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMINISTRATOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { userId } = body;
        const teamId = params.id;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const transaction = db.transaction(() => {
            const now = new Date().toISOString();
            
            // Demote any existing team leader for this team to SALES_AGENT
            db.prepare(`
                UPDATE users 
                SET role = 'SALES_AGENT', updated_at = ? 
                WHERE team_id = ? AND role = 'TEAM_LEADER'
            `).run(now, teamId);

            // Promote the selected user to TEAM_LEADER and ensure they are on this team
            const result = db.prepare(`
                UPDATE users 
                SET role = 'TEAM_LEADER', team_id = ?, updated_at = ? 
                WHERE id = ?
            `).run(teamId, now, userId);

            if (result.changes === 0) {
                throw new Error('User not found');
            }

            auditTrail.logAction(session.userId, 'UPDATE', 'TEAM_LEADER', teamId, `Assigned user ${userId} as team leader for team ${teamId}`);
        });

        transaction();

        return NextResponse.json({ success: true, message: 'Team leader updated successfully' });
    } catch (error: any) {
        console.error('[Team Leader Assignment Error]', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
