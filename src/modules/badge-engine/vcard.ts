export interface VCardContact {
  name: string;
  jobTitle?: string;
  email: string;
  company?: string;
  phone?: string;
  photoUrl?: string;
}

export function generateVCard(contact: VCardContact): string {
  const parts = contact.name.trim().split(' ');
  const lastName = parts.pop() || '';
  const firstName = parts.join(' ');
  
    const vcard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${lastName};${firstName};;;`,
    `FN:${contact.name}`,
    contact.company ? `ORG:${contact.company}` : '',
    contact.jobTitle ? `TITLE:${contact.jobTitle}` : '',
    contact.phone ? `TEL;TYPE=WORK,VOICE:${contact.phone}` : '',
    `EMAIL;TYPE=PREF,INTERNET:${contact.email}`,
    contact.photoUrl ? `PHOTO;VALUE=URI:${process.env.NEXT_PUBLIC_BASE_URL || 'https://wasla.dz'}${contact.photoUrl.split('?')[0]}` : '',
    'END:VCARD'
  ];

  return vcard.filter(Boolean).join('\n');
}

