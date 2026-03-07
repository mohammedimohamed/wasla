import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { userDb, teamDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import * as z from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// 🛡️ RBAC GUARD — Only ADMINISTRATOR can manage users
// ─────────────────────────────────────────────────────────────────────────────
async function requireAdmin() {
    const session = await getSession();
    if (!session) return { error: 'Authentication required', status: 401 as const };
    if (session.role !== 'ADMINISTRATOR') return { error: 'Administrator access required', status: 403 as const };
    return { session };
}

// Validation schema for creating users
const createUserSchema = z.object({
    name: z.string().min(2, 'Name required'),
    email: z.string().email('Invalid email'),
    role: z.enum(['ADMINISTRATOR', 'TEAM_LEADER', 'SALES_AGENT']),
    team_id: z.string().optional().nullable(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

// ─────────────────────────────────────────────────────────────────────────────
/** GET /api/users — List all users and teams (Admin only) */
export async function GET() {
    const auth = await requireAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const users = userDb.list();
        const teams = teamDb.list();
        return NextResponse.json({ success: true, users, teams });
    } catch (e) {
        console.error('[Users GET]', e);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
/** POST /api/users — Create a new user (Admin only) */
export async function POST(request: Request) {
    const auth = await requireAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const body = await request.json();
        const parsed = createUserSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
        }

        const existingUser = userDb.findByEmail(parsed.data.email);
        if (existingUser) {
            return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
        }

        const id = uuidv4();

        // Enforce logic: Administrators cannot belong to a team, others should (in a perfect setup, but we allow optional)
        const teamId = parsed.data.role === 'ADMINISTRATOR' ? null : parsed.data.team_id;

        userDb.create({
            id,
            name: parsed.data.name,
            email: parsed.data.email,
            role: parsed.data.role,
            team_id: teamId,
            password_plain: parsed.data.password
        }, auth.session!.userId);

        return NextResponse.json({ success: true, user: userDb.findById(id) }, { status: 201 });
    } catch (e) {
        console.error('[Users POST]', e);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
/** PUT /api/users — Update or Reset PIN for an existing user (Admin only) */
export async function PUT(request: Request) {
    const auth = await requireAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const body = await request.json();
        const { id, action, ...fields } = body;

        if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

        const existingUser = userDb.findById(id);
        if (!existingUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Action routing: Reset PIN
        if (action === 'reset_pin') {
            userDb.resetUserCredentials(auth.session!.userId, id, { quick_pin: null });
            return NextResponse.json({ success: true, message: 'PIN reset successfully' });
        }

        // Generic Update
        userDb.update(id, fields, auth.session!.userId);
        return NextResponse.json({ success: true, user: userDb.findById(id) });

    } catch (e) {
        console.error('[Users PUT]', e);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
/** DELETE /api/users?id=xxx — Soft-delete (deactivate) a user (Admin only) */
export async function DELETE(request: Request) {
    const auth = await requireAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

        // Prevent self-deletion
        if (id === auth.session!.userId) {
            return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
        }

        const existing = userDb.findById(id);
        if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        userDb.delete(id, auth.session!.userId);

        return NextResponse.json({ success: true, message: 'User deactivated' });
    } catch (e) {
        console.error('[Users DELETE]', e);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
