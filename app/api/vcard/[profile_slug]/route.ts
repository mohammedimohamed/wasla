export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { userDb } from '@/lib/db';
import { generateVCard, getVCardFilename } from '@/lib/vcard';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ profile_slug: string }> }
) {
    const { profile_slug } = await params;

    try {
        const user = userDb.findBySlug(profile_slug);

        if (!user || !user.profile_is_active) {
            return NextResponse.json({ error: 'Profil non disponible' }, { status: 404 });
        }

        // Prepare profile data for vCard generation
        const vcardData = {
            name: user.name,
            email: user.email,
            phone_number: user.phone_number,
            job_title: user.job_title,
            company_name: user.company_name,
            linkedin_url: user.linkedin_url,
        };

        const vcardString = generateVCard(vcardData);
        const filename = getVCardFilename(user.name);

        return new Response(vcardString, {
            headers: {
                'Content-Type': 'text/vcard; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error) {
        console.error('[vCard API Error]:', error);
        return NextResponse.json({ error: 'Erreur lors de la génération de la vCard' }, { status: 500 });
    }
}
