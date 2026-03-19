export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { userDb } from '@/lib/db';
import * as z from 'zod';

// Only the fields an agent is allowed to manage themselves
const updateProfileSchema = z.object({
    phone_number: z.string().max(30).optional().nullable(),
    job_title:    z.string().max(100).optional().nullable(),
    company_name: z.string().max(100).optional().nullable(),
    linkedin_url: z.string().url('Invalid URL').max(300).optional().nullable().or(z.literal('')),
});

/**
 * GET /api/profile — Return the own agent's public card profile
 */
export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    const profile = userDb.findPublicProfile(session.userId);
    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ success: true, profile });
}

/**
 * PUT /api/profile — Self-service update (phone, job_title, company_name, linkedin_url)
 * 🛡️ RBAC: Any authenticated agent. Name/email/role CANNOT be changed here.
 */
export async function PUT(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    try {
        const body = await request.json();
        const parsed = updateProfileSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
        }

        // Convert empty string to null for linkedin_url
        const updates = {
            ...parsed.data,
            linkedin_url: parsed.data.linkedin_url === '' ? null : parsed.data.linkedin_url,
        };

        // userDb.update accepts the new vCard-safe fields — name/email/role are NOT in the payload
        userDb.update(session.userId, updates, session.userId);

        const profile = userDb.findPublicProfile(session.userId);
        return NextResponse.json({ success: true, profile });
    } catch (e) {
        console.error('[Profile PUT]', e);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
}
