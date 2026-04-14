export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateVCard, getVCardFilename } from '@/lib/vcard';

/**
 * 🌐 PUBLIC AGENT CARD API — v2 (Slug-First)
 * ============================================
 * GET /api/v/[agentId]        → Enriched JSON profile (single JOIN query)
 * GET /api/v/[agentId]?vcf=1  → Download .vcf with photo URI
 *
 * Resolution order: slug → UUID (fallback)
 * 🛡️ Security: NEVER exposes password, quick_pin, role, internal audit fields.
 */

/**
 * Single JOIN query — resolves slug OR uuid, fetches user + company profile in one shot.
 * Custom field values require a second query (1:many — unavoidable by relational design).
 */
const PROFILE_QUERY = `
    SELECT
        u.id, u.name, u.email, u.phone_number, u.job_title,
        u.company_name, u.linkedin_url, u.photo_url, u.slug, u.tenant_id,
        acp.company_logo_url, acp.company_name   AS company_profile_name,
        acp.company_website,  acp.company_address,
        acp.company_phone,    acp.company_email,
        acp.instagram_url,    acp.facebook_url,
        acp.twitter_url,      acp.whatsapp_number,
        acp.accent_color,     acp.font_name
    FROM users u
    LEFT JOIN agent_company_profiles acp ON acp.tenant_id = u.tenant_id
    WHERE (u.slug = ? OR u.id = ?) AND u.active = 1
    LIMIT 1
`;

const CUSTOM_VALUES_QUERY = `
    SELECT cf.id AS field_id, cf.field_key, cf.label, cf.field_type, cf.placeholder,
           acv.value
    FROM custom_fields cf
    LEFT JOIN agent_custom_values acv ON acv.field_id = cf.id AND acv.user_id = ?
    WHERE cf.tenant_id = ?
    ORDER BY cf.sort_order ASC
`;

export async function GET(
    request: Request,
    { params }: { params: Promise<{ agentId: string }> }
) {
    try {
        const { agentId } = await params;
        const { searchParams } = new URL(request.url);
        const wantsVcf = searchParams.get('vcf') === '1';

        // ── Single JOIN query ──────────────────────────────────────────────────
        const user = db.prepare(PROFILE_QUERY).get(agentId, agentId) as any | undefined;

        if (!user) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        // ── Custom field values ────────────────────────────────────────────────
        const customValues = db.prepare(CUSTOM_VALUES_QUERY)
            .all(user.id, user.tenant_id) as any[];

        // ── Resolve company name (agent's own overrides company profile) ───────
        const resolvedCompanyName = user.company_name || user.company_profile_name;

        // ── Reconstruct base URL for absolute asset paths ──────────────────────
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
            || (request.headers.get('origin') ?? '');

        // ── VCF Download ───────────────────────────────────────────────────────
        if (wantsVcf) {
            const vcfContent = generateVCard({
                name:             user.name,
                email:            user.email,
                phone_number:     user.phone_number,
                job_title:        user.job_title,
                company_name:     resolvedCompanyName,
                linkedin_url:     user.linkedin_url,
                photo_url:        user.photo_url,      // relative path
                whatsapp_number:  user.whatsapp_number,
                website:          user.company_website,
            }, baseUrl);

            return new Response(vcfContent, {
                headers: {
                    'Content-Type':        'text/vcard; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${getVCardFilename(user.name)}"`,
                    'Cache-Control':       'no-store',
                },
            });
        }

        // ── JSON Profile ───────────────────────────────────────────────────────
        const profile = {
            // Agent fields
            id:           user.id,
            slug:         user.slug,
            name:         user.name,
            email:        user.email,
            phone_number: user.phone_number,
            job_title:    user.job_title,
            company_name: resolvedCompanyName,
            linkedin_url: user.linkedin_url,
            photo_url:    user.photo_url,      // relative — UI prepends baseUrl

            // Company branding — relative paths
            company_logo_url: user.company_logo_url,
            company_website:  user.company_website,
            company_address:  user.company_address,
            company_phone:    user.company_phone,
            company_email:    user.company_email,
            instagram_url:    user.instagram_url,
            facebook_url:     user.facebook_url,
            twitter_url:      user.twitter_url,
            whatsapp_number:  user.whatsapp_number,

            // Design tokens
            accent_color: user.accent_color || '#4f46e5',
            font_name:    user.font_name    || 'Inter',

            // Dynamic fields
            custom_fields: customValues,
        };

        return NextResponse.json({ success: true, profile, baseUrl });

    } catch (err) {
        console.error('[vCard API v2]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
