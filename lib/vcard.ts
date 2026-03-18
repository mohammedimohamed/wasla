/**
 * 📇 vCard 3.0 Generation Engine
 * ================================
 * Converts a Wasla user profile object into a standard RFC 2426 vCard 3.0 string.
 * The returned string can be served as a `.vcf` download to allow visitors
 * to save the agent's contact directly to their phone's address book.
 */

export interface VCardProfile {
    name: string;
    email: string;
    phone_number?: string | null;
    job_title?: string | null;
    company_name?: string | null;
    linkedin_url?: string | null;
}

/**
 * Escape special characters per RFC 2426 vCard spec.
 * Commas, semicolons, and backslashes must be escaped.
 */
function vcEscape(value: string): string {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;')
        .replace(/\n/g, '\\n');
}

/**
 * Generate a vCard 3.0 formatted string from a user profile.
 * @param profile - Public safe profile object (no passwords, roles, or hashes)
 * @returns A valid vCard 3.0 string ready to be served as `text/vcard`
 */
export function generateVCard(profile: VCardProfile): string {
    const lines: string[] = [];

    lines.push('BEGIN:VCARD');
    lines.push('VERSION:3.0');

    // Full Name
    lines.push(`FN:${vcEscape(profile.name)}`);

    // Structured Name (last;first;middle;prefix;suffix) — simplified
    const nameParts = profile.name.trim().split(/\s+/);
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0];
    lines.push(`N:${vcEscape(lastName)};${vcEscape(firstName)};;;`);

    // Organization
    if (profile.company_name) {
        lines.push(`ORG:${vcEscape(profile.company_name)}`);
    }

    // Job Title
    if (profile.job_title) {
        lines.push(`TITLE:${vcEscape(profile.job_title)}`);
    }

    // Phone
    if (profile.phone_number) {
        lines.push(`TEL;TYPE=CELL:${vcEscape(profile.phone_number)}`);
    }

    // Email
    if (profile.email) {
        lines.push(`EMAIL;TYPE=INTERNET:${vcEscape(profile.email)}`);
    }

    // LinkedIn URL
    if (profile.linkedin_url) {
        lines.push(`URL:${vcEscape(profile.linkedin_url)}`);
    }

    lines.push('END:VCARD');

    // vCard spec requires CRLF line endings
    return lines.join('\r\n') + '\r\n';
}

/**
 * Generate the filename for the .vcf download.
 */
export function getVCardFilename(name: string): string {
    return name.trim().replace(/\s+/g, '_').toLowerCase() + '.vcf';
}
