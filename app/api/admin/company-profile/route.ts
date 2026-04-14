export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { companyProfileDb } from '@/lib/db';
import * as z from 'zod';

// Relative paths only — no protocol/domain stored in DB
const companySchema = z.object({
    company_name:    z.string().max(200).optional().nullable(),
    company_logo_url:z.string().max(500).optional().nullable(), // relative path: /uploads/logos/...
    company_website: z.string().max(300).optional().nullable(),
    company_address: z.string().max(500).optional().nullable(),
    company_phone:   z.string().max(50).optional().nullable(),
    company_email:   z.string().email().max(200).optional().nullable(),
    linkedin_url:    z.string().max(400).optional().nullable(),
    instagram_url:   z.string().max(400).optional().nullable(),
    facebook_url:    z.string().max(400).optional().nullable(),
    twitter_url:     z.string().max(400).optional().nullable(),
    whatsapp_number: z.string().max(50).optional().nullable(),
    accent_color:    z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    font_name:       z.string().max(100).optional(),
}).partial();

async function requireAdmin() {
    const session = await getSession();
    if (!session) return { error: 'Auth required', status: 401 as const };
    if (session.role !== 'ADMINISTRATOR') return { error: 'Admin only', status: 403 as const };
    return { session };
}

/**
 * GET /api/admin/company-profile
 * Returns the company profile for the admin's tenant.
 */
export async function GET() {
    const auth = await requireAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const tenantId = (auth.session as any).tenantId || '00000000-0000-0000-0000-000000000000';
    const profile = companyProfileDb.get(tenantId);
    return NextResponse.json({ success: true, profile: profile || null });
}

/**
 * POST /api/admin/company-profile
 * Upserts the company profile. Stores only relative paths in DB.
 */
export async function POST(request: Request) {
    const auth = await requireAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const body = await request.json();
        const parsed = companySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
        }

        // Strip any accidentally-included full URLs → store only relative path
        const clean = Object.fromEntries(
            Object.entries(parsed.data).map(([k, v]) => {
                if (typeof v === 'string' && k.endsWith('_url') && v.startsWith('http')) {
                    try {
                        const url = new URL(v);
                        return [k, url.pathname]; // Store only /path/to/asset.jpg
                    } catch {
                        return [k, v];
                    }
                }
                return [k, v];
            })
        );

        const tenantId = (auth.session as any).tenantId || '00000000-0000-0000-0000-000000000000';
        companyProfileDb.upsert(tenantId, clean, auth.session!.userId);

        const profile = companyProfileDb.get(tenantId);
        return NextResponse.json({ success: true, profile });
    } catch (e) {
        console.error('[CompanyProfile POST]', e);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
