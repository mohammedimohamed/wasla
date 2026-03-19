export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { rewardsDb, auditTrail } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import * as z from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// 🛡️ RBAC GUARD — Only ADMINISTRATOR can manage rewards
// ─────────────────────────────────────────────────────────────────────────────
async function requireAdmin() {
    const session = await getSession();
    if (!session) return { error: 'Authentication required', status: 401 as const };
    if (session.role !== 'ADMINISTRATOR') return { error: 'Administrator access required', status: 403 as const };
    return { session };
}

// Zod validation schema for reward creation/update
const rewardSchema = z.object({
    name: z.string().min(2, 'Name required'),
    description: z.string().optional(),
    reward_type: z.enum(['digital_download', 'promo_code', 'physical_gift']),
    value: z.string().optional(),        // Download URL or display value
    reward_code: z.string().optional(),  // Short promo/redemption code
    total_quantity: z.number().int().min(-1).default(-1), // -1 = unlimited
    rule_match: z.string().optional(),   // JSON: { field, operator, value }
});

// ─────────────────────────────────────────────────────────────────────────────
/** GET /api/rewards — List all rewards (Admin only) */
export async function GET() {
    const auth = await requireAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const rewards = rewardsDb.list();
        return NextResponse.json({ success: true, rewards });
    } catch (e) {
        console.error('[Rewards GET]', e);
        return NextResponse.json({ error: 'Failed to fetch rewards' }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
/** POST /api/rewards — Create a new reward (Admin only) */
export async function POST(request: Request) {
    const auth = await requireAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const body = await request.json();
        const parsed = rewardSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
        }

        const id = uuidv4();
        rewardsDb.create({ id, ...parsed.data, created_by: auth.session!.userId });

        // 📑 Mandatory Audit Log
        auditTrail.logAction(
            auth.session!.userId, 'CREATE', 'REWARD', id,
            `Admin created reward: "${parsed.data.name}" (type: ${parsed.data.reward_type}, qty: ${parsed.data.total_quantity})`
        );

        return NextResponse.json({ success: true, reward: rewardsDb.getById(id) }, { status: 201 });
    } catch (e) {
        console.error('[Rewards POST]', e);
        return NextResponse.json({ error: 'Failed to create reward' }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
/** PUT /api/rewards — Update an existing reward (Admin only) */
export async function PUT(request: Request) {
    const auth = await requireAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const body = await request.json();
        const { id, ...fields } = body;
        if (!id) return NextResponse.json({ error: 'Reward ID required' }, { status: 400 });

        const existing = rewardsDb.getById(id);
        if (!existing) return NextResponse.json({ error: 'Reward not found' }, { status: 404 });

        rewardsDb.update(id, fields);

        // 📑 Mandatory Audit Log
        auditTrail.logAction(
            auth.session!.userId, 'UPDATE', 'REWARD', id,
            `Admin updated reward: "${existing.name}"`,
            fields
        );

        return NextResponse.json({ success: true, reward: rewardsDb.getById(id) });
    } catch (e) {
        console.error('[Rewards PUT]', e);
        return NextResponse.json({ error: 'Failed to update reward' }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
/** DELETE /api/rewards?id=xxx — Soft-delete (deactivate) a reward (Admin only) */
export async function DELETE(request: Request) {
    const auth = await requireAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Reward ID required' }, { status: 400 });

        const existing = rewardsDb.getById(id);
        if (!existing) return NextResponse.json({ error: 'Reward not found' }, { status: 404 });

        rewardsDb.delete(id);

        // 📑 Mandatory Audit Log
        auditTrail.logAction(
            auth.session!.userId, 'DELETE', 'REWARD', id,
            `Admin deactivated reward: "${existing.name}"`
        );

        return NextResponse.json({ success: true, message: 'Reward deactivated' });
    } catch (e) {
        console.error('[Rewards DELETE]', e);
        return NextResponse.json({ error: 'Failed to delete reward' }, { status: 500 });
    }
}
