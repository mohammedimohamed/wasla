export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { customFieldsDb } from '@/lib/db';
import * as z from 'zod';

const updateSchema = z.object({
    label:       z.string().min(1).max(100).optional(),
    placeholder: z.string().max(200).optional().nullable(),
    is_required: z.boolean().optional(),
    sort_order:  z.number().int().optional(),
});

async function requireAdmin() {
    const session = await getSession();
    if (!session) return { error: 'Auth required', status: 401 as const };
    if (session.role !== 'ADMINISTRATOR') return { error: 'Admin only', status: 403 as const };
    return { session };
}

/**
 * PUT /api/admin/custom-fields/[id]
 * Updates label, placeholder, is_required or sort_order.
 */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 });

    const tenantId = (auth.session as any).tenantId || '00000000-0000-0000-0000-000000000000';
    customFieldsDb.update(id, tenantId, parsed.data);
    return NextResponse.json({ success: true });
}

/**
 * DELETE /api/admin/custom-fields/[id]
 * Removes field definition + all agent values for that field.
 */
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const tenantId = (auth.session as any).tenantId || '00000000-0000-0000-0000-000000000000';
    customFieldsDb.delete(id, tenantId);
    return NextResponse.json({ success: true });
}
