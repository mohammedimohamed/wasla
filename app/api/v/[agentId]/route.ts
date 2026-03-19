export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateVCard, getVCardFilename } from '@/lib/vcard';

/**
 * 🌐 PUBLIC AGENT CARD API
 * =========================
 * GET /api/v/[agentId]          → Returns public JSON profile
 * GET /api/v/[agentId]?vcf=1   → Returns a downloadable .vcf file
 *
 * 🛡️ Security: ONLY exposes name, job_title, company_name, email, phone_number.
 * Never exposes password, quick_pin, role, or internal IDs.
 */
export async function GET(
    request: Request,
    { params }: { params: { agentId: string } }
) {
    const { agentId } = params;
    const { searchParams } = new URL(request.url);
    const wantsVcf = searchParams.get('vcf') === '1';

    try {
        // Fetch only the public-safe columns — strict SQL projection
        const user = db.prepare(`
            SELECT name, email, phone_number, job_title, company_name, linkedin_url
            FROM users
            WHERE id = ? AND active = 1
        `).get(agentId) as {
            name: string;
            email: string;
            phone_number?: string;
            job_title?: string;
            company_name?: string;
            linkedin_url?: string;
        } | undefined;

        if (!user) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        // Return a .vcf file for direct contact import
        if (wantsVcf) {
            const vcfContent = generateVCard(user);
            const filename = getVCardFilename(user.name);

            return new Response(vcfContent, {
                status: 200,
                headers: {
                    'Content-Type': 'text/vcard; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                    'Cache-Control': 'no-store',
                },
            });
        }

        // Return JSON for the Digital Business Card page
        return NextResponse.json({ success: true, profile: user });

    } catch (err) {
        console.error('[vCard API] Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
