-- Phase 15: The SaaS Leap (Multi-Tenancy Isolation)

-- 1. Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    created_at TEXT NOT NULL
);

-- 2. Add tenant_id to users and leads (ALTER TABLE)
-- We'll add columns without NOT NULL at first to allow existing data migration
-- better-sqlite3 initDb handles duplicate column errors gracefully in Stage 2 (alterMigrations)
ALTER TABLE users ADD COLUMN tenant_id TEXT;
ALTER TABLE leads ADD COLUMN tenant_id TEXT;

-- 3. Create Default Tenant
-- UUID: 00000000-0000-0000-0000-000000000000
INSERT OR IGNORE INTO tenants (id, name, slug, created_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'Wasla Main', 'wasla-main', CURRENT_TIMESTAMP);

-- 4. Assign existing data to Default Tenant
UPDATE users SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE leads SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;

-- 5. Add Indexes for performance isolation
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
