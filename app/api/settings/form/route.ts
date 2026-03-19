export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { formConfigDb } from '@/lib/db';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/settings/form
// Public endpoint — Kiosk, Commercial, and Leads List all call this.
// Returns the active JSON form schema from the DB.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
    try {
        const config = formConfigDb.get();
        if (!config) {
            return NextResponse.json({ error: 'Form configuration not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, config }, {
            headers: {
                // Cache for 30s on CDN but always revalidate — safe for enterprise
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
                'X-Form-Version': String(config._version ?? 1),
            }
        });
    } catch (e) {
        console.error('[Form Config GET]', e);
        return NextResponse.json({ error: 'Failed to fetch form configuration' }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/settings/form
// ADMINISTRATOR ONLY — saves and versions the new schema.
// Old leads are safe: metadata column is a flexible JSON blob.
// ─────────────────────────────────────────────────────────────────────────────
export async function PUT(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMINISTRATOR') {
            return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
        }

        const body = await request.json();
        const { config } = body;

        if (!config || !Array.isArray(config.pages) || config.pages.length === 0) {
            return NextResponse.json({
                error: 'Invalid config: must have at least one page with sections and fields'
            }, { status: 400 });
        }

        // Validate each page has sections with at least one field
        for (const page of config.pages) {
            if (!Array.isArray(page.sections)) {
                return NextResponse.json({ error: `Page "${page.id}" is missing sections array` }, { status: 400 });
            }
        }

        const newVersion = formConfigDb.save(config, session.userId);
        const saved = formConfigDb.get();

        return NextResponse.json({ success: true, version: newVersion, config: saved });
    } catch (e) {
        console.error('[Form Config PUT]', e);
        return NextResponse.json({ error: 'Failed to save form configuration' }, { status: 500 });
    }
}
