-- Migration 006: vCard / Digital Business Card — User Profile Extension
-- Uses ALTER TABLE with IF NOT EXISTS checks (SQLite 3.37+)

ALTER TABLE users ADD COLUMN phone_number TEXT;
ALTER TABLE users ADD COLUMN job_title    TEXT;
ALTER TABLE users ADD COLUMN company_name TEXT DEFAULT 'Wasla';
ALTER TABLE users ADD COLUMN linkedin_url TEXT;

-- Phase 16: Digital Profile & NFC Engine
ALTER TABLE users ADD COLUMN profile_slug TEXT;
ALTER TABLE users ADD COLUMN profile_is_active INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN profile_config TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_profile_slug ON users(profile_slug);
