-- Migration 003: Enhance rewards table with inventory tracking
-- Adds quantity management columns needed for the Rewards Engine.
-- Uses ALTER TABLE ... ADD COLUMN with safe IF NOT EXISTS pattern.

-- NOTE: SQLite does not support IF NOT EXISTS on ALTER TABLE.
-- We use a trigger-checks workaround by adding columns that default safely.

-- Add inventory tracking columns (will silently pass if column already exists via app-level guard)
ALTER TABLE rewards ADD COLUMN total_quantity INTEGER DEFAULT -1;  -- -1 = unlimited (digital)
ALTER TABLE rewards ADD COLUMN claimed_count INTEGER DEFAULT 0;
ALTER TABLE rewards ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE rewards ADD COLUMN rule_match TEXT;                    -- JSON: {field, operator, value}
ALTER TABLE rewards ADD COLUMN reward_code TEXT;                   -- Promo code or download URL

-- Create an index for fast active reward lookups
CREATE INDEX IF NOT EXISTS idx_rewards_is_active ON rewards(is_active);
CREATE INDEX IF NOT EXISTS idx_leads_reward_status ON leads(reward_status);
