export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db, auditTrail } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMINISTRATOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const teams = db.prepare('SELECT * FROM teams ORDER BY name ASC').all() as any[];
        const users = db.prepare('SELECT id, name, email, role, team_id, active FROM users WHERE active = 1').all() as any[];

        const { decrypt } = require('@/src/lib/crypto');
        const decryptedUsers = users.map(u => {
            try {
                return { ...u, email: decrypt(u.email) };
            } catch {
                return u;
            }
        });

        const teamsWithUsers = teams.map(team => {
            const teamUsers = decryptedUsers.filter(u => u.team_id === team.id);
            const leader = teamUsers.find(u => u.role === 'TEAM_LEADER') || null;
            return {
                ...team,
                users: teamUsers,
                leader
            };
        });

        return NextResponse.json({ success: true, teams: teamsWithUsers, users: decryptedUsers });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMINISTRATOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name } = body;

        if (!name) return NextResponse.json({ error: 'Team name is required' }, { status: 400 });

        const id = uuidv4();
        const now = new Date().toISOString();

        db.prepare('INSERT INTO teams (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(id, name, now, now);
        
        auditTrail.logAction(session.userId, 'CREATE', 'TEAM', id, `Created team: ${name}`);

        return NextResponse.json({ success: true, id, name });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
