export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { customFieldsDb } from '@/lib/db';
import * as z from 'zod';

const fieldSchema = z.object({
    label:       z.string().min(1).max(100),
    field_key:   z.string().min(1).max(60).regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers, underscores only'),
    field_type:  z.enum(['text', 'url', 'phone', 'email', 'textarea']).default('text'),
    placeholder: z.string().max(200).optional().nullable(),
    is_required: z.boolean().default(false),
    sort_order:  z.number().int().default(0),
});

async function requireAdmin() {
    const session = await getSession();
    if (!session) return { error: 'Auth required', status: 401 as const };
    if (session.role !== 'ADMINISTRATOR') return { error: 'Admin only', status: 403 as const };
    return { session };
}

/**
 * GET /api/admin/custom-fields
 * Lists all custom fields for this tenant.
 */
export async function GET() {
    const auth = await requireAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const tenantId = (auth.session as any).tenantId || '00000000-0000-0000-0000-000000000000';
    const fields = customFieldsDb.listByTenant(tenantId);
    return NextResponse.json({ success: true, fields });
}

/**
 * POST /api/admin/custom-fields
 * Creates a new custom field definition.
 */
export async function POST(request: Request) {
    const auth = await requireAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const body = await request.json();
        const parsed = fieldSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
        }

        const tenantId = (auth.session as any).tenantId || '00000000-0000-0000-0000-000000000000';
        const id = customFieldsDb.create(tenantId, parsed.data);

        return NextResponse.json({ success: true, id }, { status: 201 });
    } catch (e) {
        console.error('[CustomFields POST]', e);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
