export const dynamicConfig = {
    dbPath: process.env.DB_PATH || process.env.SQLITE_DB_PATH || './data/wasla.sqlite',
    tenantName: process.env.NEXT_PUBLIC_TENANT_NAME || 'Wasla Default',
    primaryColorBase: process.env.NEXT_PUBLIC_PRIMARY_COLOR || '#2563eb',
    secondaryColorBase: process.env.NEXT_PUBLIC_SECONDARY_COLOR || '#1e40af',
    commercialPin: process.env.COMMERCIAL_PIN || '1234',
    adminPin: process.env.ADMIN_PIN || '0000',
    jwtSecret: process.env.JWT_SECRET || 'super-secret-key-change-me',
    eventName: process.env.NEXT_PUBLIC_EVENT_NAME || 'Batimatec 2026',
    eventDate: process.env.NEXT_PUBLIC_EVENT_DATE || 'May 2026',
    eventLocation: process.env.NEXT_PUBLIC_EVENT_LOCATION || 'Algiers',
    consentTerms: process.env.NEXT_PUBLIC_CONSENT_TERMS || 'I agree to the terms and conditions.',
    // 🔑 Used to authenticate cron job backup requests (no JWT session available for crons)
    backupSecretKey: process.env.BACKUP_SECRET_KEY || 'change-this-backup-secret-in-production',
};
