import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { settingsDb } from '@/lib/db';
import * as z from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// 🛡️ RBAC GUARD — Only ADMINISTRATOR can manage global settings
// ─────────────────────────────────────────────────────────────────────────────
async function requireAdmin() {
    const session = await getSession();
    if (!session) return { error: 'Authentication required', status: 401 as const };
    if (session.role !== 'ADMINISTRATOR') return { error: 'Administrator access required', status: 403 as const };
    return { session };
}

// Zod Validation for White-Label Settings
const settingsSchema = z.object({
    event_name: z.string().min(2, "Event name must be at least 2 characters"),
    primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color like #4f46e5"),
    logo_url: z.string().url("Must be a valid URL").optional().nullable().or(z.literal('')),
    kiosk_welcome_text: z.string().min(2, "Welcome text required"),
});

/** GET /api/settings — Retrieve global tenant configuration (Available to all) */
export async function GET() {
    // Note: We don't require an ADMIN session for GET, because the frontend 
    // Layout and Kiosk may need to read these Public settings (color, text).
    try {
        const settings = settingsDb.get();
        return NextResponse.json({ success: true, settings });
    } catch (e) {
        console.error('[Settings GET]', e);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

/** PUT /api/settings — Update global tenant configuration (Admin only) */
export async function PUT(request: Request) {
    const auth = await requireAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const body = await request.json();

        // Transform empty string back to null for logo_url
        if (body.logo_url === '') body.logo_url = null;

        const parsed = settingsSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
        }

        settingsDb.update(parsed.data, auth.session!.userId);

        const updatedSettings = settingsDb.get();
        return NextResponse.json({ success: true, settings: updatedSettings });
    } catch (e) {
        console.error('[Settings PUT]', e);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
