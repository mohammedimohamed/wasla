export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { settingsDb, tenantsDb } from '@/lib/db';
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
    mediashow_enabled: z.boolean().optional(),
    idle_timeout: z.number().optional(),
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

        const parsed = settingsSchema.partial().safeParse(body);
        if (!parsed.success) {
            const details = parsed.error.flatten();
            console.error('[Settings Validation Failure]', details);
            return NextResponse.json({ error: 'Validation failed', details }, { status: 400 });
        }

        // Convert Booleans back to Integers for better-sqlite3 compatibility
        const finalData = {
            ...parsed.data,
            mediashow_enabled: parsed.data.mediashow_enabled !== undefined
                ? (parsed.data.mediashow_enabled ? 1 : 0)
                : undefined
        };

        settingsDb.update(finalData as any, auth.session!.userId);
        
        // 🏢 SaaS Bridge: Also update the 'Default Tenant' in the tenants table
        // This ensures the App Title and Logo match the Branding settings
        tenantsDb.update('00000000-0000-0000-0000-000000000000', {
            name: finalData.event_name,
            logo_url: finalData.logo_url
        });

        const updatedSettings = settingsDb.get();
        return NextResponse.json({ success: true, settings: updatedSettings });
    } catch (e) {
        console.error('[Settings PUT]', e);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
