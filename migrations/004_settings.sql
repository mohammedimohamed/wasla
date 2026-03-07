-- Migration 004: Tenant Settings (White-Label)
-- Adds a settings table to store global branding and event configuration.

CREATE TABLE IF NOT EXISTS tenant_settings (
  id TEXT PRIMARY KEY, -- 'global'
  event_name TEXT NOT NULL DEFAULT 'Batimatec 2026',
  primary_color TEXT NOT NULL DEFAULT '#4f46e5',
  logo_url TEXT,
  kiosk_welcome_text TEXT NOT NULL DEFAULT 'Bienvenue sur notre stand',
  updated_at TEXT NOT NULL
);

-- Seed default global settings if not exists
INSERT OR IGNORE INTO tenant_settings (id, event_name, primary_color, logo_url, kiosk_welcome_text, updated_at)
VALUES ('global', 'Batimatec 2026', '#4f46e5', NULL, 'Bienvenue sur notre stand', datetime('now'));
