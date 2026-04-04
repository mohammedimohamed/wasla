-- Migration 008: Sync Cloud Intelligent Module
-- Adds target_url + error_log columns to sync_queue (ALTER TABLE, safe idempotent)
-- Adds sync_cloud_config table for webhook URL management

-- 🔧 sync_queue enhanced columns are added via ALTER TABLE in initDb (idempotent pattern)
-- This file is intentionally minimal — see initDb() for the ALTER statements.

-- 📡 Webhook Config table (one row per tenant)
CREATE TABLE IF NOT EXISTS sync_cloud_config (
    id              TEXT PRIMARY KEY DEFAULT 'global',
    webhook_url     TEXT,                           -- n8n / Zapier / custom webhook
    is_active       INTEGER DEFAULT 0,              -- master on/off switch
    max_retries     INTEGER DEFAULT 5,              -- max exponential backoff attempts
    updated_at      TEXT NOT NULL,
    updated_by      TEXT
);

-- Seed default row (safe to run multiple times)
INSERT OR IGNORE INTO sync_cloud_config (id, webhook_url, is_active, max_retries, updated_at)
VALUES ('global', NULL, 0, 5, CURRENT_TIMESTAMP);
