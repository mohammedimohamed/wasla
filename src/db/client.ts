import Dexie, { Table } from 'dexie';

// ─── Lead Interface ────────────────────────────────────────────────────────────
// Mirrors the shape expected by the existing /api/sync route:
//   { leads: [{ client_uuid, type, payload, timestamp }] }
// so the SyncManager can flush to the server unchanged.

export interface Lead {
  /** Client-generated UUID v4 — also the indexedDB key and idempotency key */
  client_uuid: string;
  /** Logical source of the lead */
  type: 'kiosk' | 'commercial';
  /** All form fields stored as a flexible JSON object (schema-driven) */
  payload: Record<string, unknown>;
  /** Unix epoch ms — used for ordering and sync conflict resolution */
  timestamp: number;
  /** Sync lifecycle state */
  sync_status: 'pending' | 'synced' | 'failed';
  /** ISO string of last sync attempt */
  last_attempt?: string;
  /** Error message from last failed attempt */
  last_error?: string;
}

export interface Reward {
  id: string;
  type_client: string;
  reward_type: 'catalogue_pdf' | 'promo_code' | 'guide_technique' | 'cadeau_physique';
  title: string;
  description?: string;
  value?: string;
  produit_filter?: string[];
  active: boolean | number;
}

// ─── Dexie Database class ───────────────────────────────────────────────────────
class WaslaDB extends Dexie {
  leads!: Table<Lead>;
  rewards!: Table<Reward>;

  constructor() {
    super('wasla_db');
    this.version(1).stores({
      // Only indexed fields go here — all other fields are stored automatically
      leads: 'client_uuid, sync_status, type, timestamp',
      rewards: 'id, type_client, active',
    });
  }
}

export const db = new WaslaDB();

// ─── Device ID ────────────────────────────────────────────────────────────────
export function getDeviceId(): string {
  const key = 'wasla_device_id';
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

// ─── Lead CRUD ────────────────────────────────────────────────────────────────

/** Save a new lead to IndexedDB with status 'pending' */
export async function createLead(
  type: Lead['type'],
  payload: Record<string, unknown>
): Promise<Lead> {
  const lead: Lead = {
    client_uuid: crypto.randomUUID(),
    type,
    payload: { ...payload, device_id: getDeviceId() },
    timestamp: Date.now(),
    sync_status: 'pending',
  };
  await db.leads.add(lead);
  return lead;
}

/** Return all leads ordered newest-first */
export async function getLeads(): Promise<Lead[]> {
  return db.leads.orderBy('timestamp').reverse().toArray();
}

/** Return a single lead by client_uuid */
export async function getLead(client_uuid: string): Promise<Lead | undefined> {
  return db.leads.get(client_uuid);
}

/** Update fields on a lead */
export async function updateLead(
  client_uuid: string,
  changes: Partial<Lead>
): Promise<void> {
  await db.leads.update(client_uuid, changes);
}

/** Return all pending leads (to flush to the server) */
export async function getPendingLeads(): Promise<Lead[]> {
  return db.leads.where('sync_status').equals('pending').toArray();
}

/** Return count of pending leads (for badge) */
export async function getPendingCount(): Promise<number> {
  return db.leads.where('sync_status').equals('pending').count();
}

/** Mark a lead as synced (after server confirms) */
export async function markLeadSynced(client_uuid: string): Promise<void> {
  await db.leads.update(client_uuid, {
    sync_status: 'synced',
    last_attempt: new Date().toISOString(),
  });
}

/** Mark a lead as failed with an error reason */
export async function markLeadFailed(
  client_uuid: string,
  error: string
): Promise<void> {
  await db.leads.update(client_uuid, {
    sync_status: 'failed',
    last_attempt: new Date().toISOString(),
    last_error: error,
  });
}

/** Reset all failed leads back to pending for retry */
export async function retryFailedLeads(): Promise<void> {
  const failed = await db.leads.where('sync_status').equals('failed').toArray();
  for (const lead of failed) {
    await db.leads.update(lead.client_uuid, {
      sync_status: 'pending',
      last_error: undefined,
    });
  }
}

// ─── Rewards ──────────────────────────────────────────────────────────────────

/** Fetch rewards from server and cache in IndexedDB (call on app mount) */
export async function refreshRewards(): Promise<void> {
  try {
    const res = await fetch('/api/rewards');
    if (res.ok) {
      const rewards: Reward[] = await res.json();
      await db.rewards.clear();
      await db.rewards.bulkAdd(rewards);
    }
  } catch {
    // Offline — use cached rewards already in IndexedDB (no-op)
  }
}

/** Client-side reward matching (mirrors server lib/rewards.ts logic) */
export async function matchReward(
  type_client: string,
  produits: string[]
): Promise<Reward | null> {
  const all = await db.rewards.where('active').equals(1).toArray();

  // Priority 1: exact type + matching produit filter
  let match = all.find(
    (r) =>
      r.type_client === type_client &&
      r.produit_filter?.some((p) => produits.includes(p))
  );
  if (match) return match;

  // Priority 2: exact type + no produit filter
  match = all.find(
    (r) => r.type_client === type_client && !r.produit_filter?.length
  );
  if (match) return match;

  // Priority 3: ALL type + matching produit filter
  match = all.find(
    (r) =>
      r.type_client === 'ALL' &&
      r.produit_filter?.some((p) => produits.includes(p))
  );
  if (match) return match;

  // Priority 4: ALL type fallback
  return (
    all.find((r) => r.type_client === 'ALL' && !r.produit_filter?.length) ??
    null
  );
}
