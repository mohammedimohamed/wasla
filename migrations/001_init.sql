-- Migration 001: Initial Schema

-- Table: leads
CREATE TABLE IF NOT EXISTS leads (
  id              TEXT PRIMARY KEY,           -- UUID v4 généré côté client
  sync_status     TEXT DEFAULT 'pending',     -- 'pending' | 'synced' | 'error'
  source          TEXT DEFAULT 'commercial',  -- 'commercial' | 'kiosk' | 'qrcode'
  created_at      TEXT NOT NULL,              -- ISO 8601 timestamp
  synced_at       TEXT,                       -- ISO 8601 timestamp, NULL si pas encore synced

  -- Informations contact
  societe         TEXT,
  contact         TEXT NOT NULL,              -- OBLIGATOIRE
  telephone       TEXT,
  email           TEXT,
  ville           TEXT,
  fonction        TEXT,

  -- Type de client (valeur unique)
  type_client     TEXT NOT NULL,
  -- ENUM: 'Promoteur' | 'Hôtel' | 'Architecte' | 'Particulier' | 'Revendeur' | 'Installateur/Plombier' | 'Autre'

  -- Produits d'intérêt (JSON array, min 1)
  produits        TEXT NOT NULL,
  -- JSON: ["Baignoire"] | ["Baignoire avec tablier"] | ["Jacuzzi"] | combinaisons

  -- Détails projet (optionnels)
  projet          TEXT,
  quantite        TEXT,
  delai           TEXT,
  budget          TEXT,

  -- Actions commerciales à suivre (JSON array, optionnel)
  actions         TEXT,
  -- JSON: ["Envoyer devis", "Envoyer catalogue", "RDV", "Rappel téléphonique"]

  -- Notes libres
  note            TEXT,

  -- Récompense attribuée (pour les leads auto-enregistrés)
  reward_id       TEXT,                       -- FK vers rewards.id
  reward_sent     INTEGER DEFAULT 0,          -- 0 | 1 (boolean)

  -- Métadonnées
  commercial      TEXT,                       -- Nom du commercial (NULL si kiosk/qrcode)
  qualified_by    TEXT,                       -- Nom du commercial qui a enrichi le lead (NULL si pas enrichi)
  device_id       TEXT,                       -- Identifiant unique du device

  -- Conformité Loi 18-07
  consent_given    INTEGER NOT NULL DEFAULT 0,  -- 1 = accepté, 0 = refus (ne doit jamais être 0 en base)
  consent_at       TEXT,                          -- ISO 8601 timestamp du moment du consentement
  consent_source   TEXT                           -- 'kiosk' | 'qrcode' (NULL si saisie commerciale)
);

-- Table: rewards
CREATE TABLE IF NOT EXISTS rewards (
  id              TEXT PRIMARY KEY,           -- UUID v4
  type_client     TEXT NOT NULL,
  -- ENUM: 'Promoteur' | 'Hôtel' | 'Architecte' | 'Particulier' | 'Revendeur' | 'Installateur/Plombier' | 'Autre' | 'ALL'
  -- 'ALL' = s'applique à tous les types

  reward_type     TEXT NOT NULL,
  -- ENUM: 'catalogue_pdf' | 'promo_code' | 'guide_technique' | 'cadeau_physique'

  title           TEXT NOT NULL,              -- Ex: "Catalogue Produits <Client> 2026"
  description     TEXT,                       -- Description affichée au prospect
  value           TEXT,                       -- Ex: code promo "BATI2026", URL PDF, texte bon cadeau

  produit_filter  TEXT,
  -- NULL = s'applique à tous les produits
  -- JSON array: ["Jacuzzi"] = uniquement si le prospect a sélectionné Jacuzzi

  active          INTEGER DEFAULT 1,          -- 0 | 1
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

-- Table: sync_log
CREATE TABLE IF NOT EXISTS sync_log (
  id              TEXT PRIMARY KEY,
  synced_at       TEXT NOT NULL,
  leads_count     INTEGER NOT NULL,
  status          TEXT NOT NULL,              -- 'success' | 'partial' | 'error'
  error_message   TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_sync_status ON leads(sync_status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_telephone ON leads(telephone);
CREATE INDEX IF NOT EXISTS idx_rewards_type_client ON rewards(type_client);
CREATE INDEX IF NOT EXISTS idx_rewards_active ON rewards(active);
