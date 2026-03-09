-- Migration 003: Enhance rewards table with inventory tracking
-- Adds quantity management columns needed for the Rewards Engine.
-- Uses ALTER TABLE ... ADD COLUMN with safe IF NOT EXISTS pattern.

-- NOTE: SQLite does not support IF NOT EXISTS on ALTER TABLE.
-- We use a trigger-checks workaround by adding columns that default safely.

-- Add inventory tracking columns (will silently pass if column already exists via app-level guard)
-- (ALTER TABLE ADD COLUMN statements have been removed from this SQL migration)
-- (They are automatically/dynamically handled in lib/db.ts to avoid crashing on restarts)

-- Create an index for fast active reward lookups
CREATE INDEX IF NOT EXISTS idx_rewards_is_active ON rewards(is_active);
CREATE INDEX IF NOT EXISTS idx_leads_reward_status ON leads(reward_status);
