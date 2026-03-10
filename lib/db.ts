import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { dynamicConfig } from '@/src/config/dynamic';
import { v4 as uuidv4 } from 'uuid';

/**
 * 🛠️ Enterprise Singleton Pattern for SQLite
 * Prevents multiple connections during Next.js Fast Refresh/HMR
 */
const globalForDb = global as unknown as { db: Database.Database };

// Use configurable path from environment variables for enterprise readiness
const DB_PATH = dynamicConfig.dbPath;

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

export const db = globalForDb.db || new Database(DB_PATH);

if (process.env.NODE_ENV !== 'production') globalForDb.db = db;

// Connection-level settings
db.pragma('journal_mode = WAL'); // Performance boost for concurrent reads/writes
db.pragma('foreign_keys = ON');  // Enforce data integrity for enterprise grade

/**
 * 📑 Idempotent Database Seeding
 * Uses INSERT OR IGNORE to prevent crashes on subsequent server loads.
 */
export function initDb() {
    const migrations = ['001_init.sql', '002_seed.sql', '003_rewards_engine.sql', '004_settings.sql', '005_form_builder.sql'];

    // Wrap in a transaction for atomicity
    const migrationTx = db.transaction(() => {
        migrations.forEach(file => {
            const migrationPath = path.join(process.cwd(), 'migrations', file);
            if (fs.existsSync(migrationPath)) {
                const migration = fs.readFileSync(migrationPath, 'utf8');
                db.exec(migration);
            }
        });
    });

    try {
        migrationTx();
        console.log(`[DB] Enterprise initialized at ${DB_PATH}`);
    } catch (error) {
        console.error('[DB Error] Initialization failed:', error);
    }

    // 🔄 Safe Rewards Engine Migration (ALTER TABLE is not transactional in SQLite)
    // Only run if the rewards table exists (migrations may have partially failed)
    const rewardsTableExists = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='rewards'`
    ).get();

    if (rewardsTableExists) {
        const rewardsColumns = (db.pragma('table_info(rewards)') as { name: string }[]).map(c => c.name);
        const rewardsMigrations: [string, string][] = [
            ['total_quantity', 'ALTER TABLE rewards ADD COLUMN total_quantity INTEGER DEFAULT -1'],
            ['claimed_count', 'ALTER TABLE rewards ADD COLUMN claimed_count INTEGER DEFAULT 0'],
            ['is_active', 'ALTER TABLE rewards ADD COLUMN is_active INTEGER DEFAULT 1'],
            ['rule_match', 'ALTER TABLE rewards ADD COLUMN rule_match TEXT'],
            ['reward_code', 'ALTER TABLE rewards ADD COLUMN reward_code TEXT'],
        ];
        for (const [col, stmt] of rewardsMigrations) {
            if (!rewardsColumns.includes(col)) {
                try { db.exec(stmt); } catch (e) { /* Column may have been added by another process */ }
            }
        }
        // Indexes (idempotent, deferred here because they depend on columns added above)
        try { db.exec(`CREATE INDEX IF NOT EXISTS idx_rewards_is_active ON rewards(is_active)`); } catch (_) { }
        try { db.exec(`CREATE INDEX IF NOT EXISTS idx_leads_reward_status ON leads(reward_status)`); } catch (_) { }

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
    }
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
    create: (id: string, metadata: any, source: string, creatorId: string, deviceId?: string, teamId?: string | null, formVersion: number = 1) => {
        const timestamp = new Date().toISOString();
        const metadataStr = JSON.stringify(metadata || {});

        // 🛡️ RBAC Attribution: Respect passed teamId (from Session) or fallback to DB lookup
        let finalTeamId = teamId;
        if (finalTeamId === undefined) {
            const user = db.prepare("SELECT team_id FROM users WHERE id = ?").get(creatorId) as { team_id: string } | undefined;
            finalTeamId = user?.team_id || null;
        }

        const insertLead = db.prepare(`
          INSERT INTO leads (id, metadata, source, device_id, created_at, updated_at, created_by, team_id, sync_status, form_version)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        `);

        const insertQueue = db.prepare(`
          INSERT INTO sync_queue (operation, entity_type, entity_id, payload, created_at, status)
          VALUES ('CREATE', 'lead', ?, ?, ?, 'pending')
        `);

        try {
            const transaction = db.transaction(() => {
                insertLead.run(id, metadataStr, source, deviceId || 'localhost', timestamp, timestamp, creatorId, finalTeamId, formVersion);
                insertQueue.run(id, JSON.stringify({ metadata, source, device_id: deviceId, created_by: creatorId, team_id: finalTeamId, form_version: formVersion }), timestamp);
                auditTrail.logAction(creatorId, 'CREATE', 'LEAD', id, `Lead created from source: ${source}`, metadata);
            });
            transaction();
            return { success: true, id };
        } catch (error) {
            console.error('[DB Error] Failed to create lead:', error);
            throw error;
        }
    },

    getVisibleLeads: (userId: string) => {
        const user = db.prepare("SELECT role, team_id FROM users WHERE id = ?").get(userId) as { role: string, team_id: string } | undefined;
        if (!user) return [];

        let query = `
            SELECT 
                l.*, 
                u.name as created_by_name 
            FROM leads l
            LEFT JOIN users u ON l.created_by = u.id
        `;
        const params: any[] = [];

        if (user.role === 'SALES_AGENT') {
            query += " WHERE l.created_by = ?";
            params.push(userId);
        } else if (user.role === 'TEAM_LEADER' && user.team_id) {
            query += " WHERE l.team_id = ?";
            params.push(user.team_id);
        }
        // ADMINISTRATOR gets everything (no WHERE clause)

        query += " ORDER BY l.created_at DESC";
        return db.prepare(query).all(params);
    },

    markSynced: (id: string) => {
        const now = new Date().toISOString();
        return db.prepare("UPDATE leads SET sync_status = 'synced', synced_at = ?, updated_at = ? WHERE id = ?").run(now, now, id);
    },

    /**
     * 📊 Enterprise Dashboard Statistics
     * Calculates real-time metrics based on RBAC ownership.
     */
    getStats: (userId: string) => {
        const user = db.prepare("SELECT role, team_id FROM users WHERE id = ?").get(userId) as { role: string, team_id: string } | undefined;
        if (!user) return { totalLeads: 0, leadsToday: 0, syncedLeads: 0, recentLeads: [] };

        let filter = "";
        const params: any[] = [];

        if (user.role === 'SALES_AGENT') {
            filter = " WHERE created_by = ?";
            params.push(userId);
        } else if (user.role === 'TEAM_LEADER' && user.team_id) {
            filter = " WHERE team_id = ?";
            params.push(user.team_id);
        }

        const totalLeads = db.prepare(`SELECT COUNT(*) as count FROM leads ${filter}`).get(params) as { count: number };

        const todayFilter = filter ? `${filter} AND date(created_at) = date('now')` : " WHERE date(created_at) = date('now')";
        const leadsToday = db.prepare(`SELECT COUNT(*) as count FROM leads ${todayFilter}`).get(params) as { count: number };

        const syncFilter = filter ? `${filter} AND sync_status = 'synced'` : " WHERE sync_status = 'synced'";
        const syncedLeads = db.prepare(`SELECT COUNT(*) as count FROM leads ${syncFilter}`).get(params) as { count: number };

        const kioskFilter = filter ? `${filter} AND source = 'kiosk'` : " WHERE source = 'kiosk'";
        const kioskLeads = db.prepare(`SELECT COUNT(*) as count FROM leads ${kioskFilter}`).get(params) as { count: number };

        const commercialFilter = filter ? `${filter} AND source = 'commercial'` : " WHERE source = 'commercial'";
        const commercialLeads = db.prepare(`SELECT COUNT(*) as count FROM leads ${commercialFilter}`).get(params) as { count: number };

        const recentLeads = db.prepare(`
            SELECT * FROM leads ${filter} 
            ORDER BY created_at DESC 
            LIMIT 5
        `).all(params);

        // 🏆 Rewards Claimed: leads with an active reward association
        let rewardsGiven = { count: 0 };
        let rewardsGivenToday = { count: 0 };
        try {
            const rewardsFilter = filter
                ? `${filter} AND reward_status = 'sent'`
                : " WHERE reward_status = 'sent'";
            rewardsGiven = db.prepare(`SELECT COUNT(*) as count FROM leads ${rewardsFilter}`).get(params) as { count: number };

            const rewardsTodayFilter = filter
                ? `${filter} AND reward_status = 'sent' AND date(updated_at) = date('now')`
                : " WHERE reward_status = 'sent' AND date(updated_at) = date('now')";
            rewardsGivenToday = db.prepare(`SELECT COUNT(*) as count FROM leads ${rewardsTodayFilter}`).get(params) as { count: number };
        } catch (rewardErr) {
            console.error('[DB] Rewards stats query failed (non-critical):', rewardErr);
        }

        return {
            totalLeads: totalLeads.count,
            leadsToday: leadsToday.count,
            syncedLeads: syncedLeads.count,
            kioskLeads: kioskLeads.count,
            commercialLeads: commercialLeads.count,
            rewardsGiven: rewardsGiven.count,
            rewardsGivenToday: rewardsGivenToday.count,
            recentLeads
        };
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🏆 REWARDS DATA ACCESS LAYER
// ─────────────────────────────────────────────────────────────────────────────
export const rewardsDb = {
    /** List all rewards, optionally filtered to active only */
    list: (onlyActive = false) => {
        const filter = onlyActive ? 'WHERE is_active = 1' : '';
        return db.prepare(`
            SELECT r.*, u.name as created_by_name,
                   CASE WHEN r.total_quantity = -1 THEN -1
                        ELSE r.total_quantity - r.claimed_count
                   END as remaining
            FROM rewards r
            LEFT JOIN users u ON r.created_by = u.id
            ${filter}
            ORDER BY r.created_at DESC
        `).all() as any[];
    },

    getById: (id: string) => {
        return db.prepare(`
            SELECT r.*, u.name as created_by_name,
                   CASE WHEN r.total_quantity = -1 THEN -1
                        ELSE r.total_quantity - r.claimed_count
                   END as remaining
            FROM rewards r
            LEFT JOIN users u ON r.created_by = u.id
            WHERE r.id = ?
        `).get(id) as any;
    },

    create: (payload: {
        id: string;
        name: string;
        description?: string;
        reward_type: string;
        value?: string;
        total_quantity: number;
        rule_match?: string;
        reward_code?: string;
        created_by: string;
    }) => {
        const now = new Date().toISOString();
        db.prepare(`
            INSERT INTO rewards
                (id, name, description, reward_type, value, total_quantity, claimed_count, is_active, rule_match, reward_code, created_by, created_at, updated_at)
            VALUES
                (?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?, ?, ?)
        `).run(
            payload.id,
            payload.name,
            payload.description || null,
            payload.reward_type,
            payload.value || null,
            payload.total_quantity,
            payload.rule_match || null,
            payload.reward_code || null,
            payload.created_by,
            now, now
        );
    },

    update: (id: string, fields: {
        name?: string;
        description?: string;
        reward_type?: string;
        value?: string;
        total_quantity?: number;
        is_active?: number;
        rule_match?: string;
        reward_code?: string;
    }) => {
        const now = new Date().toISOString();
        const sets: string[] = ['updated_at = ?'];
        const params: any[] = [now];

        if (fields.name !== undefined) { sets.push('name = ?'); params.push(fields.name); }
        if (fields.description !== undefined) { sets.push('description = ?'); params.push(fields.description); }
        if (fields.reward_type !== undefined) { sets.push('reward_type = ?'); params.push(fields.reward_type); }
        if (fields.value !== undefined) { sets.push('value = ?'); params.push(fields.value); }
        if (fields.total_quantity !== undefined) { sets.push('total_quantity = ?'); params.push(fields.total_quantity); }
        if (fields.is_active !== undefined) { sets.push('is_active = ?'); params.push(fields.is_active); }
        if (fields.rule_match !== undefined) { sets.push('rule_match = ?'); params.push(fields.rule_match); }
        if (fields.reward_code !== undefined) { sets.push('reward_code = ?'); params.push(fields.reward_code); }

        params.push(id);
        db.prepare(`UPDATE rewards SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    },

    delete: (id: string) => {
        // Soft delete: just deactivate — preserves FK integrity with leads
        db.prepare(`UPDATE rewards SET is_active = 0, updated_at = ? WHERE id = ?`)
            .run(new Date().toISOString(), id);
    },

    incrementClaimed: (id: string) => {
        db.prepare(`UPDATE rewards SET claimed_count = claimed_count + 1, updated_at = ? WHERE id = ?`)
            .run(new Date().toISOString(), id);
    },
};

// Generic User/Auth helpers
export const userDb = {
    findById: (id: string) => db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any,
    findByEmail: (email: string) => db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any,

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
            SELECT u.id, u.name, u.email, u.role, u.team_id, u.active, u.created_at, u.quick_pin, t.name as team_name
            FROM users u
            LEFT JOIN teams t ON u.team_id = t.id
            ORDER BY u.created_at DESC
        `).all() as any[];
    },

    create: (payload: { id: string, name: string, email: string, role: string, team_id?: string | null, password_plain: string }, adminId: string) => {
        const now = new Date().toISOString();
        const hashedPassword = bcrypt.hashSync(payload.password_plain, 10);

        db.prepare(`
            INSERT INTO users (id, name, email, role, team_id, password, quick_pin, active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NULL, 1, ?, ?)
        `).run(payload.id, payload.name, payload.email, payload.role, payload.team_id || null, hashedPassword, now, now);

        auditTrail.logAction(adminId, 'CREATE', 'USER', payload.id, `Admin created user: ${payload.email} (${payload.role})`);
    },

    update: (id: string, fields: { name?: string, email?: string, role?: string, team_id?: string | null, active?: number }, adminId: string) => {
        const now = new Date().toISOString();
        const sets: string[] = ['updated_at = ?'];
        const params: any[] = [now];

        if (fields.name !== undefined) { sets.push('name = ?'); params.push(fields.name); }
        if (fields.email !== undefined) { sets.push('email = ?'); params.push(fields.email); }
        if (fields.role !== undefined) { sets.push('role = ?'); params.push(fields.role); }
        if (fields.team_id !== undefined) { sets.push('team_id = ?'); params.push(fields.team_id); }
        if (fields.active !== undefined) { sets.push('active = ?'); params.push(fields.active); }

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
        };
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

        if (sets.length === 1) return; // Only updated_at

        db.prepare(`UPDATE tenant_settings SET ${sets.join(', ')} WHERE id = 'global'`).run(...params);
        auditTrail.logAction(adminId, 'UPDATE', 'SETTINGS', 'global', `Admin updated branding/event settings`);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 📺 MEDIASHOW (Digital Signage)
// ─────────────────────────────────────────────────────────────────────────────
export const mediashowDb = {
    list: () => {
        return db.prepare("SELECT * FROM mediashow_assets ORDER BY order_index ASC, created_at DESC").all() as any[];
    },

    add: (asset: { type: string, url: string, duration?: number }) => {
        const id = uuidv4();
        const now = new Date().toISOString();
        const lastOrder = db.prepare("SELECT MAX(order_index) as maxOrder FROM mediashow_assets").get() as { maxOrder: number | null };
        const nextOrder = (lastOrder?.maxOrder ?? -1) + 1;

        return db.prepare(`
            INSERT INTO mediashow_assets (id, type, url, order_index, duration, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, asset.type, asset.url, nextOrder, asset.duration || 10, now);
    },

    updateOrder: (orders: { id: string, order_index: number }[]) => {
        const stmt = db.prepare("UPDATE mediashow_assets SET order_index = ? WHERE id = ?");
        const transaction = db.transaction((items) => {
            for (const item of items) {
                stmt.run(item.order_index, item.id);
            }
        });
        transaction(orders);
    },

    delete: (id: string) => {
        return db.prepare("DELETE FROM mediashow_assets WHERE id = ?").run(id);
    }
};

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

// Initialize database
initDb();

export default db;
