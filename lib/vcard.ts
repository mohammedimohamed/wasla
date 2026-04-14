/**
 * 📇 vCard 3.0 Generation Engine
 * ================================
 * Converts a Wasla user profile into a standard RFC 2426 vCard 3.0 string.
 *
 * 🛡️ Rule: photo_url in DB is always a RELATIVE path (/uploads/...).
 *           Pass `baseUrl` to reconstruct the absolute URI for the PHOTO field.
 */

export interface VCardProfile {
    name: string;
    email: string;
    phone_number?: string | null;
    job_title?: string | null;
    company_name?: string | null;
    linkedin_url?: string | null;
    photo_url?: string | null;       // Relative path: /uploads/agents/uuid.jpg
    whatsapp_number?: string | null; // From company profile
    website?: string | null;         // Company website URL (relative or absolute)
}

/** Escape special characters per RFC 2426. */
function vcEscape(value: string): string {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;')
        .replace(/\n/g, '\\n');
}

/**
 * Generate a vCard 3.0 string from a user profile.
 * @param profile  — Public-safe fields (no password/role/pin)
 * @param baseUrl  — Server base URL for photo URI: e.g. https://wasla.dz (from NEXT_PUBLIC_BASE_URL)
 */
export function generateVCard(profile: VCardProfile, baseUrl?: string): string {
    const lines: string[] = [];

    lines.push('BEGIN:VCARD');
    lines.push('VERSION:3.0');

    lines.push(`FN:${vcEscape(profile.name)}`);

    const nameParts = profile.name.trim().split(/\s+/);
    const lastName  = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0];
    lines.push(`N:${vcEscape(lastName)};${vcEscape(firstName)};;;`);

    if (profile.company_name)  lines.push(`ORG:${vcEscape(profile.company_name)}`);
    if (profile.job_title)     lines.push(`TITLE:${vcEscape(profile.job_title)}`);

    if (profile.phone_number)   lines.push(`TEL;TYPE=CELL:${vcEscape(profile.phone_number)}`);
    if (profile.whatsapp_number) lines.push(`TEL;TYPE=CELL,WORK:${vcEscape(profile.whatsapp_number)}`);

    if (profile.email)         lines.push(`EMAIL;TYPE=INTERNET:${vcEscape(profile.email)}`);

    // Company website — reconstruct absolute URL if relative
    if (profile.website) {
        const site = profile.website.startsWith('/')
            ? `${(baseUrl || '').replace(/\/$/, '')}${profile.website}`
            : profile.website;
        lines.push(`URL;TYPE=WORK:${vcEscape(site)}`);
    }

    if (profile.linkedin_url)  lines.push(`URL:${vcEscape(profile.linkedin_url)}`);

    // Photo — always reconstructed from relative path + baseUrl
    if (profile.photo_url && baseUrl) {
        const cleanPath = profile.photo_url.split('?')[0];
        lines.push(`PHOTO;VALUE=URI:${baseUrl.replace(/\/$/, '')}${cleanPath}`);
    }

    lines.push('END:VCARD');

    return lines.join('\r\n') + '\r\n';
}

/** Generate the filename for the .vcf download. */
export function getVCardFilename(name: string): string {
    return name.trim().replace(/\s+/g, '_').toLowerCase() + '.vcf';
}
