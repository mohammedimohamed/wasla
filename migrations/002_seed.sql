-- Seed data for Wasla Enterprise
-- Default Credentials for immediate use after architecture refactor

-- 🛡️ SECURITY: Using pre-hashed Bcrypt strings for default accounts.
-- admin123  -> $2b$10$zJV0EPE.YcV3fQ/61Lwwn.45vTJQycGt.MA6CDlFCfJ5AFd.YylQe
-- leader123 -> $2b$10$YjQn29yBhlyO7Ly7lNhASOD7ZYMMf0IyFE3OETDjGTMtZaqE7W.h.
-- agent123  -> $2b$10$k2Yf1Kq4u/drDWyFfGJlf.I/ZDN7qCxGx8vXjplUt48SVyKgzLYoC

INSERT OR IGNORE INTO teams (id, name, created_at, updated_at) 
VALUES ('team-alpha', 'Alpha Sales Team', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Default Administrator
INSERT OR IGNORE INTO users (id, name, email, role, team_id, password, quick_pin, created_at, updated_at, active)
VALUES (
  'user-admin-01', 
  'Wasla Admin', 
  'admin@wasla.dz', 
  'ADMINISTRATOR', 
  NULL, 
  '$2b$10$zJV0EPE.YcV3fQ/61Lwwn.45vTJQycGt.MA6CDlFCfJ5AFd.YylQe', 
  NULL,
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP, 
  1
);

-- Default Team Leader
INSERT OR IGNORE INTO users (id, name, email, role, team_id, password, quick_pin, created_at, updated_at, active)
VALUES (
  'user-leader-01', 
  'Chef d''Equipe', 
  'leader@wasla.dz', 
  'TEAM_LEADER', 
  'team-alpha', 
  '$2b$10$YjQn29yBhlyO7Ly7lNhASOD7ZYMMf0IyFE3OETDjGTMtZaqE7W.h.', 
  NULL,
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP, 
  1
);

-- Default Agent
INSERT OR IGNORE INTO users (id, name, email, role, team_id, password, quick_pin, created_at, updated_at, active)
VALUES (
  'user-agent-01', 
  'Commercial Agent', 
  'agent@wasla.dz', 
  'SALES_AGENT', 
  'team-alpha', 
  '$2b$10$k2Yf1Kq4u/drDWyFfGJlf.I/ZDN7qCxGx8vXjplUt48SVyKgzLYoC', 
  NULL,
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP, 
  1
);
