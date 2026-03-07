-- Migration 001: Enterprise White-Label Schema with RBAC & Audit Trail

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,           -- UUID
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  role            TEXT NOT NULL,              -- 'SALES_AGENT' | 'TEAM_LEADER' | 'ADMINISTRATOR'
  team_id         TEXT,                       -- ID of the team (optional)
  password        TEXT NOT NULL,              -- Hashed strong password
  quick_pin       TEXT,                       -- Hashed 6-digit PIN for session resumption
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  active          INTEGER DEFAULT 1
);

-- Table: teams
CREATE TABLE IF NOT EXISTS teams (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

-- Table: leads
CREATE TABLE IF NOT EXISTS leads (
  id              TEXT PRIMARY KEY,           -- Client-side generated UUID v4
  sync_status     TEXT DEFAULT 'pending',     -- 'pending' | 'synced' | 'failed'
  source          TEXT DEFAULT 'kiosk',       -- 'kiosk' | 'commercial' | 'qrcode'
  created_at      TEXT NOT NULL,              -- ISO 8601 timestamp
  updated_at      TEXT NOT NULL,              -- ISO 8601 timestamp
  synced_at       TEXT,                       -- ISO 8601 timestamp, NULL if not yet synced

  -- RBAC & Ownership
  created_by      TEXT,                       -- FK to users.id
  team_id         TEXT,                       -- Ownership by team (FK to teams.id)

  -- The heart of the generic system
  metadata        TEXT NOT NULL,              -- JSON string: stores all dynamic form data
  
  -- Reward association
  reward_id       TEXT,                       -- Optional FK to rewards.id
  reward_status   TEXT DEFAULT 'none',        -- 'none' | 'sent' | 'pending' | 'failed'

  -- Device info
  device_id       TEXT,                       -- Tracking the source device
  
  FOREIGN KEY(created_by) REFERENCES users(id),
  FOREIGN KEY(team_id) REFERENCES teams(id)
);

-- Table: rewards
CREATE TABLE IF NOT EXISTS rewards (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  trigger_rule    TEXT,                       -- JSON string: rule to match against lead metadata
  reward_type     TEXT NOT NULL,              -- 'digital_catalog' | 'promo_code' | 'physical_gift'
  value           TEXT,                       -- URL, code, or description
  active          INTEGER DEFAULT 1,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  created_by      TEXT,
  FOREIGN KEY(created_by) REFERENCES users(id)
);

-- Table: sync_queue
CREATE TABLE IF NOT EXISTS sync_queue (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  operation       TEXT NOT NULL,              -- 'CREATE' | 'UPDATE' | 'DELETE'
  entity_type     TEXT NOT NULL,              -- 'lead' | 'reward'
  entity_id       TEXT NOT NULL,
  payload         TEXT NOT NULL,              -- Full JSON snapshot of the entity
  status          TEXT DEFAULT 'pending',     -- 'pending' | 'failed' | 'synced'
  error_message   TEXT,
  attempts        INTEGER DEFAULT 0,
  last_attempt_at TEXT,
  created_at      TEXT NOT NULL
);

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id              TEXT PRIMARY KEY,           -- UUID
  user_id         TEXT NOT NULL,              -- FK to users.id
  action          TEXT NOT NULL,              -- 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT'
  entity_type     TEXT NOT NULL,              -- 'LEAD' | 'REWARD' | 'USER'
  entity_id       TEXT,
  description     TEXT,
  timestamp       TEXT NOT NULL,
  metadata        TEXT,                       -- Optional JSON details
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Indexes for performance & security
CREATE INDEX IF NOT EXISTS idx_leads_sync_status ON leads(sync_status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_team_id ON leads(team_id);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_rewards_active ON rewards(active);
