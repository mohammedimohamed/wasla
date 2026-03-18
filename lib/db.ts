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
const DB_PATH = process.env.NODE_ENV === 'production' 
    ? '/app/data/batimatec2026.db' 
    : dynamicConfig.dbPath;

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

                // 📂 Phase 15 v3: Initial Commit
                leadsDb.commitHistory(id, metadata, creatorId, 'COMMIT');

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

        // 🏆 Rewards Intelligence
        let rewardsGiven = { count: 0 };
        let rewardsGivenToday = { count: 0 };
        let totalRewards = 0;
        let rewardsDistributed = 0;
        
        try {
            // Count unique active reward configurations
            const rewardTypes = db.prepare("SELECT COUNT(*) as count FROM rewards WHERE is_active = 1").get() as { count: number };
            totalRewards = rewardTypes?.count || 0;

            // Sum of all items actually distributed
            const distributed = db.prepare("SELECT SUM(claimed_count) as count FROM rewards WHERE is_active = 1").get() as { count: number };
            rewardsDistributed = distributed?.count || 0;

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
            rewardsGiven: rewardsGiven.count, // Leads with reward_status = 'sent'
            rewardsGivenToday: rewardsGivenToday.count,
            totalRewards, // Count of active reward rows 
            rewardsDistributed, // Sum of claimed_count
            recentLeads
        };
    },

    /**
     * 🛡️ Identity Resolution: Check if Email+Phone pair exists (Internal use)
     */
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

    /**
     * 🚫 Fraud Engine v2: Advanced Pattern Detection
     */
    calculateQualityScore: (metadata: any) => {
        let score = 100;

        // 1. Detect Garbage Literals
        const garbageLiterals = [/12345/i, /abcde/i, /test/i, /fake/i, /dummy/i, /none/i];

        // 2. Keyboard Mashing / Repeating Chars
        const repeatPattern = /(.)\1{3,}/;           // Same char repeated 4+ times (e.g. aaaa)
        const consonantMash = /[bcdfghjklmnpqrstvwxyz]{5,}/i; // 5 consonants in a row
        const rowMash = /asdf|sdfg|dfgh|fghj|ghjk|hjkl|qwert|werty|ertyu|rtyui|tyuio|yuiop|zxcv|xcvb|cvbn|vbnm/i;

        for (const value of Object.values(metadata)) {
            const strVal = String(value).toLowerCase();
            if (garbageLiterals.some(p => p.test(strVal))) score -= 40;
            if (repeatPattern.test(strVal)) score -= 30;
            if (consonantMash.test(strVal)) score -= 40;
            if (rowMash.test(strVal)) score -= 50;
        }

        // 3. Email Validation Patterns
        const email = String(metadata.email || '').toLowerCase();
        if (email.includes('test@') || email.endsWith('@example.com') || email.endsWith('@test.com')) {
            score -= 50;
        }

        // 4. Fake Phone Patterns
        const phone = String(metadata.phone || '');
        if (/^0+$/.test(phone) || /^1234/.test(phone) || phone.length < 8) {
            score -= 60;
        }

        return Math.max(0, score);
    },

    /**
     * ⚡ Asynchronous Intelligence Engine: Analyzes a lead post-submission
     */
    analyzeLead: async (leadId: string) => {
        const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(leadId) as any;
        if (!lead) return;

        const metadata = JSON.parse(lead.metadata);
        const score = leadsDb.calculateQualityScore(metadata);
        const logs: any[] = [];
        const timestamp = new Date().toISOString();

        // Check for duplicates
        const existingDuplicate = db.prepare(`
            SELECT id FROM leads 
            WHERE id != ? AND 
                  json_extract(metadata, '$.email') = ? AND 
                  json_extract(metadata, '$.phone') = ?
            LIMIT 1
        `).get(leadId, metadata.email, metadata.phone) as { id: string } | undefined;

        if (existingDuplicate) {
            logs.push({
                type: 'POTENTIAL_DUPLICATE',
                message: `Same Email+Phone already registered (Lead ID: ${existingDuplicate.id})`,
                severity: 'WARNING'
            });
        }

        if (score < 50) {
            logs.push({
                type: 'FRAUD_DETECTION',
                message: `Suspect activity detected (Score: ${score}%)`,
                severity: score < 20 ? 'CRITICAL' : 'WARNING'
            });
        }

        // Apply findings
        const tx = db.transaction(() => {
            db.prepare("UPDATE leads SET quality_score = ? WHERE id = ?").run(score, leadId);

            // If high fraud score, flag reward for QC
            if (score < 20 && lead.reward_status !== 'none') {
                db.prepare("UPDATE leads SET reward_status = 'pending_qc' WHERE id = ?").run(leadId);
            }

            for (const log of logs) {
                db.prepare(`
                    INSERT INTO lead_intelligence_logs (id, lead_id, type, message, severity, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(uuidv4(), leadId, log.type, log.message, log.severity, timestamp);
            }
        });
        tx();
    },

    /**
     * 📋 Intelligence: Suggested Merges
     */
    getSuggestedMerges: () => {
        return db.prepare(`
            SELECT 
                l1.id as id1, l1.metadata as meta1, l1.quality_score as score1,
                l2.id as id2, l2.metadata as meta2, l2.quality_score as score2,
                json_extract(l1.metadata, '$.email') as email,
                json_extract(l1.metadata, '$.phone') as phone
            FROM leads l1
            JOIN leads l2 ON l1.id < l2.id
            WHERE (l1.status = 'active' OR l1.status IS NULL)
              AND (l2.status = 'active' OR l2.status IS NULL)
              AND (
                (json_extract(l1.metadata, '$.email') = json_extract(l2.metadata, '$.email') AND json_extract(l1.metadata, '$.email') IS NOT NULL AND json_extract(l1.metadata, '$.email') != '')
                OR 
                (json_extract(l1.metadata, '$.phone') = json_extract(l2.metadata, '$.phone') AND json_extract(l1.metadata, '$.phone') IS NOT NULL AND json_extract(l1.metadata, '$.phone') != '')
              )
            LIMIT 50
        `).all();
    },

    /**
     * 🧬 Consolidation v3: The "Merge Commit" Strategy
     * No deletion. Secondary is archived, Primary is updated with selected metadata.
     */
    mergeLeads: (primaryId: string, secondaryId: string, resolvedChoices: any, adminId: string) => {
        const primary = db.prepare("SELECT * FROM leads WHERE id = ?").get(primaryId) as any;
        const secondary = db.prepare("SELECT * FROM leads WHERE id = ?").get(secondaryId) as any;
        if (!primary || !secondary) throw new Error("Leads not found");

        const m1 = JSON.parse(primary.metadata || '{}');
        const m2 = JSON.parse(secondary.metadata || '{}');

        // ── Phase 15.6: ACCUMULATIVE UNION LOGIC ──────────────────────────────
        const mergedMetadata: any = { ...resolvedChoices };

        // 1. Accumulate phone array (dedupe)
        const phones: string[] = [];
        const addPhone = (v: any) => {
            if (!v) return;
            const arr = Array.isArray(v) ? v : [v];
            arr.forEach(p => { if (p && !phones.includes(p)) phones.push(p); });
        };
        addPhone(m1.phone); addPhone(m2.phone);
        mergedMetadata.phone = phones;

        // 2. Accumulate email array (dedupe)
        const emails: string[] = [];
        const addEmail = (v: any) => {
            if (!v) return;
            const arr = Array.isArray(v) ? v : [v];
            arr.forEach(e => { if (e && !emails.includes(e)) emails.push(e); });
        };
        addEmail(m1.email); addEmail(m2.email);
        mergedMetadata.email = emails;

        // 3. Accumulate associated entities (company names)
        const existingEntities: string[] = Array.isArray(m1.associated_entities) ? m1.associated_entities : [];
        const secondaryCompany = m2.company || m2.companyName || m2.organisation;
        if (secondaryCompany && !existingEntities.includes(secondaryCompany)) {
            existingEntities.push(secondaryCompany);
        }
        mergedMetadata.associated_entities = existingEntities;

        // 4. Concatenate free-text fields with Version separator
        const textFields = ['comment', 'description', 'projectDescription', 'notes', 'note'];
        for (const field of textFields) {
            const v1 = m1[field]; const v2 = m2[field];
            if (v1 && v2 && v1 !== v2) {
                const company1 = m1.company || m1.companyName || 'Lead A';
                const company2 = m2.company || m2.companyName || 'Lead B';
                mergedMetadata[field] = `--- Version: ${company1} ---\n${v1}\n--- Version: ${company2} ---\n${v2}`;
            }
        }

        const tx = db.transaction(() => {
            const timestamp = new Date().toISOString();
            const dateStr = new Date().toLocaleDateString('en-GB');

            // 1. Archive secondary lead
            db.prepare("UPDATE leads SET status = 'archived', updated_at = ? WHERE id = ?")
                .run(timestamp, secondaryId);

            // 2. Update primary with accumulated merged data
            db.prepare("UPDATE leads SET metadata = ?, updated_at = ? WHERE id = ?")
                .run(JSON.stringify(mergedMetadata), timestamp, primaryId);

            // 3. Commit to version history
            leadsDb.commitHistory(primaryId, mergedMetadata, adminId, 'MERGE_COMMIT');

            // 4. Record lineage pointer
            db.prepare(`INSERT INTO lead_lineage (id, parent_id, child_id, created_at) VALUES (?, ?, ?, ?)`)
                .run(uuidv4(), secondaryId, primaryId, timestamp);

            // 5. Phase 15.7: Generate Sales Intel Memo
            const secondaryName = m2.name || m2.fullName || 'Unknown';
            const secondaryOrg = m2.company || m2.companyName || '';
            const intelNote = `💡 SALES INTEL: Contact also associated with ${secondaryOrg ? secondaryOrg + ' (' + secondaryName + ')' : secondaryName}. Linked on ${dateStr} via Identity Merge.`;
            db.prepare(`INSERT INTO lead_intelligence_logs (id, lead_id, type, message, severity, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
                .run(uuidv4(), primaryId, 'SALES_INTEL', intelNote, 'info', timestamp);

            auditTrail.logAction(adminId, 'UPDATE', 'LEAD(MERGE)', primaryId,
                `Accumulative merge with ${secondaryId}. Phones: ${phones.join(', ')}. Entities: ${existingEntities.join(', ')}.`);
        });
        tx();
        return true;
    },

    /**
     * ⏪ Git Rollback: Restore parents and cleanup lineage
     */
    revertMerge: (childId: string, adminId: string) => {
        const lineage = db.prepare("SELECT parent_id FROM lead_lineage WHERE child_id = ?").all(childId) as { parent_id: string }[];
        if (lineage.length === 0) throw new Error("No lineage found for this lead");

        const tx = db.transaction(() => {
            const timestamp = new Date().toISOString();

            // Restore all parents
            for (const { parent_id } of lineage) {
                db.prepare("UPDATE leads SET status = 'active', updated_at = ? WHERE id = ?")
                    .run(timestamp, parent_id);
            }

            // Restore primary metadata to previous version (before Merge Commit)
            const history = db.prepare(`
                SELECT metadata FROM leads_history 
                WHERE lead_id = ? AND change_type != 'MERGE_COMMIT' 
                ORDER BY version DESC LIMIT 1
            `).get(childId) as { metadata: string } | undefined;

            if (history) {
                db.prepare("UPDATE leads SET metadata = ?, updated_at = ? WHERE id = ?")
                    .run(history.metadata, timestamp, childId);
            }

            // Cleanup lineage
            db.prepare("DELETE FROM lead_lineage WHERE child_id = ?").run(childId);

            auditTrail.logAction(adminId, 'UPDATE', 'LEAD(REVERT)', childId, 'Merge reverted. Parent leads restored.');
        });
        tx();
        return true;
    },

    getLineage: (leadId: string) => {
        return db.prepare(`
            SELECT l.id, l.metadata, l.status, lin.created_at
            FROM lead_lineage lin
            JOIN leads l ON lin.parent_id = l.id
            WHERE lin.child_id = ?
        `).all(leadId);
    },

    /**
     * 📊 Agent Performance: Ranking by Quality Score
     */
    getAgentQualityRanking: () => {
        return db.prepare(`
            SELECT 
                u.name as agent_name,
                COUNT(l.id) as total_leads,
                AVG(l.quality_score) as avg_score,
                SUM(CASE WHEN l.quality_score < 50 THEN 1 ELSE 0 END) as low_quality_count
            FROM leads l
            JOIN users u ON l.created_by = u.id
            WHERE l.status = 'active' OR l.status IS NULL
            GROUP BY u.id
            ORDER BY avg_score DESC
        `).all();
    },

    /**
     * 🚩 Intelligence: Fetch Leads with suspected issues (logs)
     */
    getFlaggedLeads: () => {
        return db.prepare(`
            SELECT 
                l.id, l.metadata, l.quality_score, l.reward_status, l.source,
                GROUP_CONCAT(i.message, ' | ') as risk_messages
            FROM leads l
            JOIN lead_intelligence_logs i ON l.id = i.lead_id
            WHERE l.status = 'active' OR l.status IS NULL
            GROUP BY l.id
            ORDER BY l.created_at DESC
            LIMIT 100
        `).all();
    },

    /**
     * ✅ Intelligence: Fetch Leads with NO suspected issues
     */
    getCleanLeads: () => {
        return db.prepare(`
            SELECT id, metadata, quality_score, reward_status, source, created_at
            FROM leads 
            WHERE (status = 'active' OR status IS NULL)
              AND quality_score >= 80 
              AND id NOT IN (SELECT lead_id FROM lead_intelligence_logs)
            ORDER BY created_at DESC
            LIMIT 50
        `).all();
    },

    /**
     * ✅ Quality Control: Manually approve a reward that was blocked
     */
    approveReward: (leadId: string, adminId: string) => {
        const tx = db.transaction(() => {
            db.prepare("UPDATE leads SET reward_status = 'sent' WHERE id = ? AND reward_status = 'pending_qc'").run(leadId);
            auditTrail.logAction(adminId, 'UPDATE', 'LEAD(QC_APPROVE)', leadId, 'Reward manually approved after quality check.');
        });
        tx();
        return true;
    }
}
    ;

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
