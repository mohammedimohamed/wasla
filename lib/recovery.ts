/**
 * 🛠️ Wasla Recovery Engine — Browser Cache & State Reset
 * 
 * Provides a "Hard Reset" mechanism to resolve ChunkLoadErrors 
 * and stale JS bundles after production builds.
 */

export function forceAppUpdate() {
    console.log('[Recovery] Initializing hard update...');

    // 1. Clear sessionStorage (temp UI states)
    if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.clear();
    }

    // 2. Clear localStorage partially
    if (typeof window !== 'undefined' && window.localStorage) {
        const keysToKeep = [
            'wasla_offline_queue', // Critical: pending leads (Legacy fallback)
            'wasla_leads_columns', // UI: Keep lead table customization
            'sales_agent_id',      // UX: Keep login ID to avoid forced logout if possible
            'sales_name',
            'sales_tenant_id'
        ];

        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (!keysToKeep.includes(key)) {
                localStorage.removeItem(key);
            }
        });
    }

    // 3. Purge session cookies (forces server-side fresh handshake)
    if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        }
    }

    // 4. Hard reload with cache-buster
    window.location.href = "/?update=" + Date.now();
}
