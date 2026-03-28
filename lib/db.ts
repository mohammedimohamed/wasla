import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { dynamicConfig } from '@/src/config/dynamic';
import { v4 as uuidv4 } from 'uuid';
import * as securityGate from '@/src/lib/security-gate';

/**
 * 🛠️ Enterprise Singleton Pattern for SQLite
 * Prevents multiple connections during Next.js Fast Refresh/HMR
 */
const globalForDb = global as unknown as { db: any };

// ─────────────────────────────────────────────────────────────────────────────
// 🗄️ DATABASE PATH — Single Source of Truth
// Always: <cwd>/data/<DATABASE_NAME>
// In the standalone server, cwd() = .next/standalone, so the DB file
// lives at .next/standalone/data/<name> which is outside the bundle and
// survives re-deploys.
// ─────────────────────────────────────────────────────────────────────────────
const getDbPath = () => {
    // DATABASE_NAME is the ONLY authority — no hardcoded fallbacks.
    const dbName = process.env.DATABASE_NAME;
    if (!dbName) {
        throw new Error('[DB] CRITICAL: DATABASE_NAME env variable is not set. Check your .env file.');
    }

    if (process.env.NODE_ENV === 'production') {
        // Docker / Linux VPS: prefer /app/data if it exists
        const dockerPath = '/app/data';
        if (process.platform === 'linux' && fs.existsSync(dockerPath)) {
            return path.join(dockerPath, dbName);
        }
    }

    // Universal fallback: always ./data/<name> relative to the process working directory.
    // In next dev:       Wasla/data/<name>
    // In next start:     Wasla/data/<name>
    // In standalone:     Wasla/.next/standalone/data/<name>
    return path.join(process.cwd(), 'data', dbName);
};


// 🛡️ Enterprise Database Loader
// Using require() inside getDb to ensure better-sqlite3 is NEVER loaded during 'next build' static analysis
let _db: any = null;

// Ensure data directory exists before opening
const ensureDir = (pathStr: string) => {
    const dir = path.dirname(pathStr);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

/**
 * 🛠️ Enterprise Singleton Accessor
 * Defers connection until first request to avoid build-time locking.
 */
export const getDb = (): any => {
    if (_db) return _db;

    // ⛔ Build Guard: Avoid loading the better-sqlite3 native module during static build analysis
    if (process.env.NEXT_PHASE === 'phase-production-build') {
        console.warn('[DB] Bypassing native module loading during build phase');
        // Return a mock object to prevent crashes if a property is accessed
        return {
            prepare: () => ({ run: () => ({}), get: () => ({}), all: () => [], bind: () => ({}) }),
            pragma: () => ({}),
            transaction: (fn: any) => fn,
            exec: () => ({})
        };
    }

    try {
        const Database = require('better-sqlite3');
        const pathStr = getDbPath();
        ensureDir(pathStr);
        
        _db = new Database(pathStr);
        _db.pragma('busy_timeout = 5000');
        _db.pragma('journal_mode = WAL');
        _db.pragma('foreign_keys = ON');

        return _db;
    } catch (err) {
        console.error('[DB] CRITICAL: Failed to load better-sqlite3:', err);
        throw err;
    }
};

// Proxied export to maintain backwards compatibility with existing calls `db.prepare(...)`
export const db = new Proxy({} as any, {
    get: (_, prop) => {
        const target = getDb();
        const value = (target as any)[prop];
        return typeof value === 'function' ? value.bind(target) : value;
    }
});

/**
 * 📑 Idempotent Database Seeding
 * Uses INSERT OR IGNORE to prevent crashes on subsequent server loads.
 */
export function initDb() {
    // 🛡️ Build Guard: Prevent DB initialization during Next.js build/data-collection phase
    if (process.env.NEXT_PHASE === 'phase-production-build') {
        console.log('[DB] Skipping initialization during build phase');
        return;
    }

    console.log(`[DB] Enterprise Initialization — Storage: ${getDbPath()}`);

    // Migrations that are safe to run in a single transaction (CREATE TABLE / INSERT OR IGNORE)
    const txMigrations = ['001_init.sql', '002_seed.sql', '003_rewards_engine.sql', '004_settings.sql', '005_form_builder.sql'];
    // Migrations that contain ALTER TABLE — MUST run outside a transaction, one statement at a time
    const alterMigrations = ['006_vcard.sql', '007_multi_tenancy.sql'];

    // ── Phase 1: Transactional schema migrations ──────────────────────────────
    const migrationTx = db.transaction(() => {
        txMigrations.forEach(file => {
            const migrationPath = path.join(process.cwd(), 'migrations', file);
            if (fs.existsSync(migrationPath)) {
                const migration = fs.readFileSync(migrationPath, 'utf8');
                db.exec(migration);
            }
        });
    });

    try {
        migrationTx();
        console.log(`[DB] Enterprise initialized at ${getDbPath()}`);
    } catch (error) {
        console.error('[DB Error] Initialization failed:', error);
    }

    // ── Phase 2: ALTER TABLE migrations — idempotent, one statement at a time ─
    alterMigrations.forEach(file => {
        const migrationPath = path.join(process.cwd(), 'migrations', file);
        if (!fs.existsSync(migrationPath)) return;
        const sql = fs.readFileSync(migrationPath, 'utf8');
        // Split on semicolons and run each statement independently
        sql.split(';').map(s => s.trim()).filter(Boolean).forEach(stmt => {
            try {
                db.exec(stmt + ';');
            } catch (e: any) {
                // Ignore "duplicate column name" — column already exists from a previous run
                if (!e.message?.includes('duplicate column name')) {
                    console.error(`[DB Migration] Failed: ${stmt}`, e.message);
                }
            }
        });
    });

    // Phase 8.4: Managed QR Locations table
    try {
        db.exec(`CREATE TABLE IF NOT EXISTS kiosk_locations (
            name TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            created_by TEXT
        )`);
    } catch (_) { }

    // Phase 12.5: Form Versioning Migration
    try { db.exec(`ALTER TABLE form_configs ADD COLUMN version INTEGER DEFAULT 1`); } catch (_) { }
    try { db.exec(`ALTER TABLE leads ADD COLUMN form_version INTEGER DEFAULT 1`); } catch (_) { }

    // Phase 13: Mediashow Migration
    try {
        db.exec(`CREATE TABLE IF NOT EXISTS mediashow_assets (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,         -- 'image' | 'video'
            url TEXT NOT NULL,
            order_index INTEGER DEFAULT 0,
            duration INTEGER DEFAULT 10, -- seconds (relevant for images)
            created_at TEXT NOT NULL
        )`);
    } catch (_) { }

    const settingsColumns = (db.pragma('table_info(tenant_settings)') as { name: string }[]).map(c => c.name);
    if (!settingsColumns.includes('mediashow_enabled')) {
        try { db.exec(`ALTER TABLE tenant_settings ADD COLUMN mediashow_enabled INTEGER DEFAULT 0`); } catch (_) { }
    }
    if (!settingsColumns.includes('idle_timeout')) {
        try { db.exec(`ALTER TABLE tenant_settings ADD COLUMN idle_timeout INTEGER DEFAULT 60`); } catch (_) { }
    }

    // Phase 15 (v2): Asynchronous Lead Intelligence & Quality Control
    try {
        const leadsCols = (db.pragma('table_info(leads)') as { name: string }[]).map(c => c.name);
        if (!leadsCols.includes('quality_score')) {
            db.exec(`ALTER TABLE leads ADD COLUMN quality_score INTEGER DEFAULT 100`);
            db.exec(`CREATE INDEX IF NOT EXISTS idx_leads_quality_score ON leads(quality_score)`);
        }
        if (!leadsCols.includes('status')) {
            db.exec(`ALTER TABLE leads ADD COLUMN status TEXT DEFAULT 'active'`);
            db.exec(`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`);
        }
        if (!leadsCols.includes('score')) {
            db.exec(`ALTER TABLE leads ADD COLUMN score INTEGER DEFAULT 0`);
        }
    } catch (_) { }

    // Phase 15 (v3): Git-Style Identity Resolution & Versioning
    try {
        db.exec(`CREATE TABLE IF NOT EXISTS leads_history (
            id TEXT PRIMARY KEY,
            lead_id TEXT NOT NULL,
            version INTEGER NOT NULL,
            metadata TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            updated_by TEXT,
            change_type TEXT, -- 'COMMIT' | 'MERGE_COMMIT'
            FOREIGN KEY(lead_id) REFERENCES leads(id) ON DELETE CASCADE
        )`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_leads_history_lead_id ON leads_history(lead_id)`);
    } catch (_) { }

    try {
        db.exec(`CREATE TABLE IF NOT EXISTS lead_lineage (
            id TEXT PRIMARY KEY,
            parent_id TEXT NOT NULL,
            child_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(parent_id) REFERENCES leads(id) ON DELETE CASCADE,
            FOREIGN KEY(child_id) REFERENCES leads(id) ON DELETE CASCADE
        )`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_lineage_child ON lead_lineage(child_id)`);
    } catch (_) { }

    try {
        db.exec(`CREATE TABLE IF NOT EXISTS lead_intelligence_logs (
            id TEXT PRIMARY KEY,
            lead_id TEXT NOT NULL,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            severity TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(lead_id) REFERENCES leads(id) ON DELETE CASCADE
        )`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_intel_lead_id ON lead_intelligence_logs(lead_id)`);
    } catch (_) { }

    try {
        db.exec(`CREATE TABLE IF NOT EXISTS leads_archive (
            id TEXT PRIMARY KEY,
            metadata TEXT NOT NULL,
            source TEXT,
            created_at TEXT,
            updated_at TEXT,
            synced_at TEXT,
            created_by TEXT,
            team_id TEXT,
            reward_id TEXT,
            reward_status TEXT,
            device_id TEXT,
            form_version INTEGER,
            quality_score INTEGER,
            archived_at TEXT NOT NULL,
            reason TEXT
        )`);
    } catch (_) { }

    try {
        db.prepare(`
            INSERT OR IGNORE INTO users (id, name, email, role, password, created_at, updated_at, active, tenant_id)
            VALUES ('system', 'SYSTEM_ENGINE', 'system@wasla.dz', 'ADMINISTRATOR', 'LOCKED', ?, ?, 1, '00000000-0000-0000-0000-000000000000')
        `).run(new Date().toISOString(), new Date().toISOString());
    } catch (_) { }

    // Phase 15.8: Vault — Encryption toggle column
    try { db.exec(`ALTER TABLE tenant_settings ADD COLUMN encryption_enabled INTEGER DEFAULT 1`); } catch (_) { }

    // 🏆 Rewards Engine Schema (Legacy Bridge)
    try {
        db.exec(`CREATE TABLE IF NOT EXISTS rewards (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            reward_type TEXT NOT NULL,
            value TEXT,
            total_quantity INTEGER DEFAULT -1,
            claimed_count INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            rule_match TEXT,
            reward_code TEXT,
            created_by TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )`);

        const rewardsCols = (db.pragma('table_info(rewards)') as { name: string }[]).map(c => c.name);
        
        // Ensure total_quantity and claimed_count anyway
        if (!rewardsCols.includes('total_quantity')) {
            console.log('[DB Migration] Patching Rewards table: total_quantity');
            try { db.exec(`ALTER TABLE rewards ADD COLUMN total_quantity INTEGER DEFAULT -1`); } catch (_) { }
        }
        if (!rewardsCols.includes('claimed_count')) {
            console.log('[DB Migration] Patching Rewards table: claimed_count');
            try { db.exec(`ALTER TABLE rewards ADD COLUMN claimed_count INTEGER DEFAULT 0`); } catch (_) { }
        }

        // Migrate rule_match from trigger_rule if necessary
        if (!rewardsCols.includes('rule_match')) {
            console.log('[DB Migration] Creating Rewards column: rule_match');
            try { db.exec(`ALTER TABLE rewards ADD COLUMN rule_match TEXT`); } catch (_) { }
            if (rewardsCols.includes('trigger_rule')) {
                console.log('[DB Migration] Syncing rule_match from legacy trigger_rule');
                try { db.exec(`UPDATE rewards SET rule_match = trigger_rule`); } catch (_) { }
            }
        }

        // Migrate is_active from active if necessary
        if (!rewardsCols.includes('is_active')) {
            console.log('[DB Migration] Creating Rewards column: is_active');
            try { db.exec(`ALTER TABLE rewards ADD COLUMN is_active INTEGER DEFAULT 1`); } catch (_) { }
            if (rewardsCols.includes('active')) {
                console.log('[DB Migration] Syncing is_active from legacy active');
                try { db.exec(`UPDATE rewards SET is_active = active`); } catch (_) { }
            }
        }

        if (!rewardsCols.includes('reward_code')) {
            console.log('[DB Migration] Patching Rewards table: reward_code');
            try { db.exec(`ALTER TABLE rewards ADD COLUMN reward_code TEXT`); } catch (_) { }
        }

        db.exec(`CREATE INDEX IF NOT EXISTS idx_rewards_is_active ON rewards(is_active)`);

        const leadsCols = (db.pragma('table_info(leads)') as { name: string }[]).map(c => c.name);
        if (!leadsCols.includes('reward_id')) {
            console.log('[DB Migration] Patching Leads table: reward_id');
            try { db.exec(`ALTER TABLE leads ADD COLUMN reward_id TEXT`); } catch (_) { }
        }
        if (!leadsCols.includes('reward_status')) {
            console.log('[DB Migration] Patching Leads table: reward_status');
            try { db.exec(`ALTER TABLE leads ADD COLUMN reward_status TEXT DEFAULT 'none'`); } catch (_) { }
            db.exec(`CREATE INDEX IF NOT EXISTS idx_leads_reward_status ON leads(reward_status)`);
        }
    } catch (e: any) {
        console.error('[DB] Rewards Bridge Migration Failure:', e.message);
    }

    // Phase 16: Module Registry
    try {
        db.exec(`CREATE TABLE IF NOT EXISTS module_registry (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            is_enabled INTEGER DEFAULT 0,
            description TEXT
        )`);
        
        // Seed initial modules
        const seedModules = [
            ['vault', 'Vault & Security', 1, 'AES-256-GCM Encryption & JSON Backups'],
            ['rewards', 'Rewards Engine', 1, 'Gift attribution and anti-fraud logic'],
            ['mediashow', 'MediaShow Kiosk', 1, 'Dynamic slideshow and asset proxy'],
            ['intelligence', 'Intelligence Leads', 1, 'Lead scoring and analytics']
        ];
        
        const insertModule = db.prepare("INSERT OR IGNORE INTO module_registry (id, name, is_enabled, description) VALUES (?, ?, ?, ?)");
        for (const m of seedModules) {
            insertModule.run(...m);
        }
    } catch (_) { }
}

// Enterprise Audit Logging Utility
export const auditTrail = {
    logAction: (userId: string, action: string, entityType: string, entityId?: string, description?: string, metadata?: any) => {
        const id = uuidv4();
        const timestamp = new Date().toISOString();
        const metadataStr = metadata ? JSON.stringify(metadata) : null;

        try {
            return db.prepare(`
                INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, description, timestamp, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(id, userId, action, entityType, entityId, description, timestamp, metadataStr);
        } catch (error) {
            console.error('[Audit Error] Failed to log action:', error);
        }
    }
};

// Enterprise Data Access Layer (with Ownership & RBAC)
export const leadsDb = {
    /**
     * 📂 Git Principle: Create an immutable version entry
     */
    commitHistory: (leadId: string, metadata: any, updatedBy: string, changeType: 'COMMIT' | 'MERGE_COMMIT' = 'COMMIT') => {
        const lastVersion = db.prepare("SELECT MAX(version) as v FROM leads_history WHERE lead_id = ?").get(leadId) as { v: number } | undefined;
        const nextVersion = (lastVersion?.v || 0) + 1;
        const timestamp = new Date().toISOString();

        db.prepare(`
            INSERT INTO leads_history (id, lead_id, version, metadata, updated_at, updated_by, change_type)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), leadId, nextVersion, JSON.stringify(metadata), timestamp, updatedBy, changeType);

        return nextVersion;
    },

    create: async (id: string, metadata: any, source: string, creatorId: string | null, deviceId?: string, teamId?: string | null, formVersion: number = 1, tenantId?: string, options?: { rewardId?: string | null, rewardStatus?: string | null, syncStatus?: 'pending' | 'synced' }) => {
        const timestamp = new Date().toISOString();
        const encEnabled = settingsDb.isEncryptionEnabled();
        const securedMeta = await securityGate.encryptMetadata(metadata || {}, encEnabled);
        const metadataStr = JSON.stringify(securedMeta);
        
        let finalTeamId = teamId === undefined ? null : teamId;
        let finalTenantId = tenantId || '00000000-0000-0000-0000-000000000000';
        
        if (creatorId && (teamId === undefined || tenantId === undefined)) {
            const user = db.prepare("SELECT team_id, tenant_id FROM users WHERE id = ?").get(creatorId) as { team_id: string, tenant_id: string } | undefined;
            if (teamId === undefined) finalTeamId = user?.team_id || null;
            if (tenantId === undefined) finalTenantId = user?.tenant_id || '00000000-0000-0000-0000-000000000000';
        }

        const insertLead = db.prepare(`
          INSERT INTO leads (id, metadata, source, device_id, created_at, updated_at, created_by, team_id, tenant_id, sync_status, form_version, reward_id, reward_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        try {
            const transaction = db.transaction(() => {
                insertLead.run(
                    id, metadataStr, source, deviceId || 'localhost', 
                    timestamp, timestamp, creatorId, finalTeamId, finalTenantId, 
                    options?.syncStatus || 'pending', formVersion,
                    options?.rewardId || null, options?.rewardStatus || null
                );
                
                if ((options?.syncStatus || 'pending') === 'pending') {
                    db.prepare(`
                        INSERT INTO sync_queue (operation, entity_type, entity_id, payload, created_at, status)
                        VALUES ('CREATE', 'lead', ?, ?, ?, 'pending')
                    `).run(id, metadataStr, timestamp);
                }

                leadsDb.commitHistory(id, metadata, creatorId || 'SYSTEM', 'COMMIT');
                auditTrail.logAction(creatorId || 'SYSTEM', 'CREATE', 'LEAD', id, `Lead created from source: ${source}`, metadata);
            });
            transaction();
        } catch (error) {
            console.error('[DB] Create Error:', error);
            throw error;
        }
    },

    getVisibleLeads: async (userId: string) => {
        const user = db.prepare("SELECT role, team_id, tenant_id FROM users WHERE id = ?").get(userId) as { role: string, team_id: string, tenant_id: string } | undefined;
        if (!user) return [];

        let query = `
            SELECT 
                l.*, 
                u.name as created_by_name 
            FROM leads l
            LEFT JOIN users u ON l.created_by = u.id
            WHERE l.tenant_id = ?
        `;
        const params: any[] = [user.tenant_id || '00000000-0000-0000-0000-000000000000'];

        if (user.role === 'SALES_AGENT') {
            query += " AND l.created_by = ?";
            params.push(userId);
        } else if (user.role === 'TEAM_LEADER' && user.team_id) {
            query += " AND l.team_id = ?";
            params.push(user.team_id);
        }

        query += " ORDER BY l.created_at DESC";
        const rows = db.prepare(query).all(params) as any[];
        
        return Promise.all(rows.map(async r => {
            try { 
                const decryptedMeta = await securityGate.decryptMetadata(JSON.parse(r.metadata || '{}'));
                return { ...r, metadata: JSON.stringify(decryptedMeta) }; 
            }
            catch { return r; }
        }));
    },

    markSynced: (id: string) => {
        const now = new Date().toISOString();
        return db.prepare("UPDATE leads SET sync_status = 'synced', synced_at = ?, updated_at = ? WHERE id = ?").run(now, now, id);
    },

    getStats: (userId: string) => {
        const user = db.prepare("SELECT role, team_id, tenant_id FROM users WHERE id = ?").get(userId) as { role: string, team_id: string, tenant_id: string } | undefined;
        if (!user) return { totalLeads: 0, leadsToday: 0, syncedLeads: 0, recentLeads: [] };

        let filter = " WHERE tenant_id = ?";
        const params: any[] = [user.tenant_id || '00000000-0000-0000-0000-000000000000'];

        if (user.role === 'SALES_AGENT') {
            filter += " AND created_by = ?";
            params.push(userId);
        } else if (user.role === 'TEAM_LEADER' && user.team_id) {
            filter += " AND team_id = ?";
            params.push(user.team_id);
        }

        const totalLeads = db.prepare(`SELECT COUNT(*) as count FROM leads ${filter}`).get(params) as { count: number };
        const todayFilter = `${filter} AND date(created_at) = date('now')`;
        const leadsToday = db.prepare(`SELECT COUNT(*) as count FROM leads ${todayFilter}`).get(params) as { count: number };
        const syncFilter = `${filter} AND sync_status = 'synced'`;
        const syncedLeads = db.prepare(`SELECT COUNT(*) as count FROM leads ${syncFilter}`).get(params) as { count: number };
        const kioskFilter = `${filter} AND source = 'kiosk'`;
        const kioskLeads = db.prepare(`SELECT COUNT(*) as count FROM leads ${kioskFilter}`).get(params) as { count: number };
        const commercialFilter = `${filter} AND source = 'commercial'`;
        const commercialLeads = db.prepare(`SELECT COUNT(*) as count FROM leads ${commercialFilter}`).get(params) as { count: number };

        const recentLeads = db.prepare(`
            SELECT * FROM leads ${filter} 
            ORDER BY created_at DESC 
            LIMIT 5
        `).all(params);

        return {
            totalLeads: totalLeads.count,
            leadsToday: leadsToday.count,
            syncedLeads: syncedLeads.count,
            kioskLeads: kioskLeads.count,
            commercialLeads: commercialLeads.count,
            recentLeads,
            rewardsGiven: 0,
            rewardsGivenToday: 0,
            totalRewards: 0,
            rewardsDistributed: 0,
        };
    },

    checkDuplicate: (email?: string, phone?: string, excludeId?: string) => {
        if (!email || !phone) return false;
        let query = `
            SELECT id FROM leads 
            WHERE json_extract(metadata, '$.email') = ? 
              AND json_extract(metadata, '$.phone') = ?
        `;
        const params: any[] = [email, phone];
        if (excludeId) {
            query += " AND id != ?";
            params.push(excludeId);
        }
        const existing = db.prepare(query + " LIMIT 1").get(params);
        return !!existing;
    },

    restore: async (dataStr: string, type: 'json' | 'sqlite' = 'json') => {
        if (type !== 'json') throw new Error("Only JSON format is supported.");
        const parsed = JSON.parse(dataStr);
        const leads: any[] = parsed.leads || [];

        const tx = db.transaction(() => {
            db.prepare('DELETE FROM leads').run();
            const stmt = db.prepare(`INSERT OR IGNORE INTO leads (id, metadata, source, device_id, created_at, updated_at, created_by, team_id, tenant_id, sync_status, form_version, quality_score, score, reward_status, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            for (const lead of leads) {
                const metadataStr = typeof lead.metadata === 'string' ? lead.metadata : JSON.stringify(lead.metadata || {});
                stmt.run(lead.id, metadataStr, lead.source, lead.device_id, lead.created_at, lead.updated_at, lead.created_by, lead.team_id, lead.tenant_id, lead.sync_status ?? 'synced', lead.form_version ?? 1, lead.quality_score ?? null, lead.score ?? 0, lead.reward_status ?? 'none', lead.status ?? 'active');
            }
        });
        tx();
        return leads.length;
    }
};

// Generic User/Auth helpers
export const userDb = {
    findById: (id: string) => db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any,
    findByEmail: (email: string) => db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any,

    /** 🌐 VCARD: Fetch ONLY public-safe fields — never exposes role, password, pin */
    findPublicProfile: (id: string) => db.prepare(`
        SELECT name, email, phone_number, job_title, company_name, linkedin_url
        FROM users
        WHERE id = ? AND active = 1
    `).get(id) as { name: string; email: string; phone_number: string | null; job_title: string | null; company_name: string | null; linkedin_url: string | null } | undefined,

    // 🛡️ Initial Password Verification (Bcrypt Hashed)
    verifyPassword: (email: string, passwordInput: string) => {
        const user = db.prepare("SELECT * FROM users WHERE email = ? AND active = 1").get(email) as any;
        if (user && bcrypt.compareSync(passwordInput, user.password)) return user;
        return null;
    },

    // 🔑 Session Resumption PIN Verification (Bcrypt Hashed)
    verifyQuickPin: (userId: string, pinInput: string) => {
        const user = db.prepare("SELECT * FROM users WHERE id = ? AND active = 1").get(userId) as any;
        if (user && user.quick_pin && bcrypt.compareSync(pinInput, user.quick_pin)) return true;
        return false;
    },

    // ⚙️ PIN Setup for first-time session (Hashing required)
    setQuickPin: (userId: string, pin: string) => {
        const timestamp = new Date().toISOString();
        const hashedPin = bcrypt.hashSync(pin, 10);
        db.prepare("UPDATE users SET quick_pin = ?, updated_at = ? WHERE id = ?").run(hashedPin, timestamp, userId);
        auditTrail.logAction(userId, 'UPDATE', 'USER', userId, `User defined their quick PIN.`);
    },

    // Management Tool: Admin/Leader reset capability
    resetUserCredentials: (adminId: string, targetUserId: string, updates: { password?: string, quick_pin?: string | null }) => {
        const timestamp = new Date().toISOString();
        const { password, quick_pin } = updates;

        const sets: string[] = [];
        const params: any[] = [];
        if (password) {
            sets.push("password = ?");
            params.push(bcrypt.hashSync(password, 10));
        }
        if (quick_pin === null) {
            sets.push("quick_pin = NULL");
        } else if (quick_pin) {
            sets.push("quick_pin = ?");
            params.push(bcrypt.hashSync(quick_pin, 10));
        }

        if (sets.length === 0) return;

        params.push(timestamp, targetUserId);
        db.prepare(`UPDATE users SET ${sets.join(", ")}, updated_at = ? WHERE id = ?`).run(...params);

        auditTrail.logAction(adminId, 'UPDATE', 'USER', targetUserId, `Admin reset credentials for user ${targetUserId}.`);
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // NEW: Comprehensive User Management CRUD
    // ─────────────────────────────────────────────────────────────────────────────
    list: () => {
        return db.prepare(`
            SELECT u.id, u.name, u.email, u.role, u.team_id, u.tenant_id, u.active, u.created_at, u.quick_pin, t.name as team_name
            FROM users u
            LEFT JOIN teams t ON u.team_id = t.id
            ORDER BY u.created_at DESC
        `).all() as any[];
    },

    create: (payload: { id: string, name: string, email: string, role: string, team_id?: string | null, tenant_id?: string, password_plain: string }, adminId: string) => {
        const now = new Date().toISOString();
        const hashedPassword = bcrypt.hashSync(payload.password_plain, 10);

        // Fallback to admin's tenant if not specified
        let finalTenantId = payload.tenant_id;
        if (!finalTenantId) {
            const admin = db.prepare("SELECT tenant_id FROM users WHERE id = ?").get(adminId) as { tenant_id: string } | undefined;
            finalTenantId = admin?.tenant_id || '00000000-0000-0000-0000-000000000000';
        }

        db.prepare(`
            INSERT INTO users (id, name, email, role, team_id, tenant_id, password, quick_pin, active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 1, ?, ?)
        `).run(payload.id, payload.name, payload.email, payload.role, payload.team_id || null, finalTenantId, hashedPassword, now, now);

        auditTrail.logAction(adminId, 'CREATE', 'USER', payload.id, `Admin created user: ${payload.email} (${payload.role}) for tenant ${finalTenantId}`);
    },

    update: (id: string, fields: { name?: string, email?: string, role?: string, team_id?: string | null, active?: number, phone_number?: string | null, job_title?: string | null, company_name?: string | null, linkedin_url?: string | null }, adminId: string) => {
        const now = new Date().toISOString();
        const sets: string[] = ['updated_at = ?'];
        const params: any[] = [now];

        if (fields.name !== undefined) { sets.push('name = ?'); params.push(fields.name); }
        if (fields.email !== undefined) { sets.push('email = ?'); params.push(fields.email); }
        if (fields.role !== undefined) { sets.push('role = ?'); params.push(fields.role); }
        if (fields.team_id !== undefined) { sets.push('team_id = ?'); params.push(fields.team_id); }
        if (fields.active !== undefined) { sets.push('active = ?'); params.push(fields.active); }
        if (fields.phone_number !== undefined) { sets.push('phone_number = ?'); params.push(fields.phone_number); }
        if (fields.job_title !== undefined) { sets.push('job_title = ?'); params.push(fields.job_title); }
        if (fields.company_name !== undefined) { sets.push('company_name = ?'); params.push(fields.company_name); }
        if (fields.linkedin_url !== undefined) { sets.push('linkedin_url = ?'); params.push(fields.linkedin_url); }

        params.push(id);
        db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...params);

        auditTrail.logAction(adminId, 'UPDATE', 'USER', id, `Admin updated user: ${id}`);
    },

    delete: (id: string, adminId: string) => {
        const now = new Date().toISOString();
        // Soft-delete to preserve FK constraints on leads
        db.prepare('UPDATE users SET active = 0, updated_at = ? WHERE id = ?').run(now, id);
        auditTrail.logAction(adminId, 'DELETE', 'USER', id, `Admin deactivated user: ${id}`);
    }
};

export const teamDb = {
    list: () => {
        return db.prepare('SELECT * FROM teams ORDER BY name ASC').all() as any[];
    }
};

// ── SaaS Multi-Tenancy Helpers ─────────────────────────────────────────────
export const tenantsDb = {
    get: (id: string = '00000000-0000-0000-0000-000000000000') => {
        return db.prepare("SELECT * FROM tenants WHERE id = ?").get(id) as any;
    },
    update: (id: string, fields: { name?: string, logo_url?: string | null }) => {
        const sets: string[] = [];
        const params: any[] = [];
        if (fields.name !== undefined) { sets.push('name = ?'); params.push(fields.name); }
        if (fields.logo_url !== undefined) { sets.push('logo_url = ?'); params.push(fields.logo_url); }
        if (sets.length === 0) return;
        params.push(id);
        db.prepare(`UPDATE tenants SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🎨 GLOBAL SETTINGS (White-Label)
// ─────────────────────────────────────────────────────────────────────────────
export const settingsDb = {
    get: () => {
        // Fetch the global config or fallback defaults if somehow missing
        const settings = db.prepare("SELECT * FROM tenant_settings WHERE id = 'global'").get() as any;
        return settings || {
            event_name: 'Batimatec',
            primary_color: '#4f46e5',
            logo_url: null,
            kiosk_welcome_text: 'Bienvenue',
            encryption_enabled: 1,
        };
    },

    /**
     * Quick read of whether encryption is currently ON (no overhead).
     */
    isEncryptionEnabled: (): boolean => {
        try {
            const row = db.prepare("SELECT encryption_enabled FROM tenant_settings WHERE id = 'global'").get() as any;
            return row ? row.encryption_enabled !== 0 : true; // default ON
        } catch {
            return true;
        }
    },

    update: (fields: {
        event_name?: string,
        primary_color?: string,
        logo_url?: string | null,
        kiosk_welcome_text?: string,
        mediashow_enabled?: number,
        idle_timeout?: number
    }, adminId: string) => {
        const now = new Date().toISOString();
        const sets: string[] = ['updated_at = ?'];
        const params: any[] = [now];

        if (fields.event_name !== undefined) { sets.push('event_name = ?'); params.push(fields.event_name); }
        if (fields.primary_color !== undefined) { sets.push('primary_color = ?'); params.push(fields.primary_color); }
        if (fields.logo_url !== undefined) { sets.push('logo_url = ?'); params.push(fields.logo_url); }
        if (fields.kiosk_welcome_text !== undefined) { sets.push('kiosk_welcome_text = ?'); params.push(fields.kiosk_welcome_text); }
        if (fields.mediashow_enabled !== undefined) { sets.push('mediashow_enabled = ?'); params.push(fields.mediashow_enabled); }
        if (fields.idle_timeout !== undefined) { sets.push('idle_timeout = ?'); params.push(fields.idle_timeout); }
        if ((fields as any).encryption_enabled !== undefined) { sets.push('encryption_enabled = ?'); params.push((fields as any).encryption_enabled); }

        if (sets.length === 1) return; // Only updated_at

        db.prepare(`UPDATE tenant_settings SET ${sets.join(', ')} WHERE id = 'global'`).run(...params);
        auditTrail.logAction(adminId, 'UPDATE', 'SETTINGS', 'global', `Admin updated branding/event settings`);
    }
};

// ── Form Config (Builder) excluded for brevity — stays in core

// ─────────────────────────────────────────────────────────────────────────────
// 📐 FORM CONFIG (Dynamic Form Builder)
// ─────────────────────────────────────────────────────────────────────────────
export const formConfigDb = {
    /**
     * Returns the active form configuration JSON.
     * Falls back to null if the table doesn't exist yet (safe for cold starts).
     */
    get: (): any | null => {
        try {
            const row = db.prepare("SELECT config, version FROM form_configs WHERE id = 'active'").get() as any;
            if (!row) return null;
            return { ...JSON.parse(row.config), _version: row.version };
        } catch (e) {
            console.error('[formConfigDb.get]', e);
            return null;
        }
    },

    /**
     * Saves a new form configuration. Bumps version for cache-busting.
     */
    save: (config: any, adminId: string): number => {
        const now = new Date().toISOString();
        const existing = db.prepare("SELECT version FROM form_configs WHERE id = 'active'").get() as any;
        const newVersion = existing ? existing.version + 1 : 1;
        const { _version, ...configData } = config; // strip internal __version if re-submitted
        const configStr = JSON.stringify({ ...configData, version: newVersion });

        db.prepare(`
            INSERT INTO form_configs (id, version, config, updated_at, updated_by)
            VALUES ('active', ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                version    = excluded.version,
                config     = excluded.config,
                updated_at = excluded.updated_at,
                updated_by = excluded.updated_by
        `).run(newVersion, configStr, now, adminId);

        auditTrail.logAction(adminId, 'UPDATE', 'FORM_CONFIG', 'active', `Form schema updated to v${newVersion}`);
        return newVersion;
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// 🧩 MODULE REGISTRY (Modular Architecture)
// ─────────────────────────────────────────────────────────────────────────────
export { moduleDb, isModuleEnabled } from './module-registry';

// Initialize database
initDb();

export default db;
