/**
 * 🗄️ Wasla Offline Engine v2 — IndexedDB-Backed Queue
 *
 * Uses the `idb` library for a Promise-based IndexedDB interface.
 * Features:
 *  - `sync_status`: 'pending' | 'synced' | 'failed'
 *  - `client_uuid`: Stable UUID persisted from localStorage so the server
 *    can reject duplicates on re-submission (idempotency key).
 *  - Zero data loss: records are never deleted until server confirms.
 *  - localStorage migration: reads and migrates any legacy queued records.
 */

import { openDB, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface OfflineLead {
    /** Stable client-side UUID used as idempotency key on the server */
    client_uuid: string;
    type: 'kiosk' | 'commercial';
    payload: any;
    timestamp: number;
    sync_status: 'pending' | 'synced' | 'failed';
    /** ISO string of last sync attempt */
    last_attempt?: string;
    /** Error message from last failed attempt */
    last_error?: string;
}

// ── DB Setup ──────────────────────────────────────────────────────────────────
const DB_NAME = 'wasla_offline_db';
const DB_VERSION = 1;
const STORE = 'offline_leads';
const LEGACY_KEY = 'wasla_offline_queue';

let _db: IDBPDatabase | null = null;

async function getDb(): Promise<IDBPDatabase> {
    if (_db) return _db;
    _db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE)) {
                const store = db.createObjectStore(STORE, { keyPath: 'client_uuid' });
                store.createIndex('by_status', 'sync_status');
            }
        },
    });

    // One-time migration from legacy localStorage queue
    await migrateLegacyQueue(_db);

    return _db;
}

async function migrateLegacyQueue(db: IDBPDatabase) {
    if (typeof window === 'undefined') return;
    try {
        const raw = localStorage.getItem(LEGACY_KEY);
        if (!raw) return;
        const legacy: any[] = JSON.parse(raw);
        if (!Array.isArray(legacy) || legacy.length === 0) return;

        const tx = db.transaction(STORE, 'readwrite');
        for (const item of legacy) {
            const lead: OfflineLead = {
                client_uuid: item.id || uuidv4(), // re-use the old temp id as uuid
                type: item.type || 'kiosk',
                payload: item.payload,
                timestamp: item.timestamp || Date.now(),
                sync_status: 'pending',
            };
            await tx.store.put(lead);
        }
        await tx.done;
        localStorage.removeItem(LEGACY_KEY);
        console.log(`[Offline Engine] Migrated ${legacy.length} legacy localStorage records to IndexedDB.`);
    } catch (e) {
        console.error('[Offline Engine] Legacy migration failed:', e);
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Saves a new lead to IndexedDB with status 'pending'.
 * Non-blocking — returns immediately after scheduling the write.
 */
export async function saveLeadOffline(payload: any, type: 'kiosk' | 'commercial'): Promise<OfflineLead> {
    const lead: OfflineLead = {
        client_uuid: uuidv4(),
        type,
        payload,
        timestamp: Date.now(),
        sync_status: 'pending',
    };

    // Fire-and-forget so it never blocks the UI thread
    getDb().then(db => db.put(STORE, lead)).catch(err => {
        console.error('[Offline Engine] IndexedDB write failed, falling back to localStorage:', err);
        // Emergency fallback: localStorage
        try {
            const raw = localStorage.getItem(LEGACY_KEY) || '[]';
            const arr = JSON.parse(raw);
            arr.push({ id: lead.client_uuid, type: lead.type, payload: lead.payload, timestamp: lead.timestamp });
            localStorage.setItem(LEGACY_KEY, JSON.stringify(arr));
        } catch (_) { /* absolute last resort — nothing works */ }
    });

    console.log(`[Offline Engine] Queued 1 lead (client_uuid: ${lead.client_uuid})`);
    return lead;
}

/** Returns all leads matching the given status (default: all pending) */
export async function getOfflineLeads(status: OfflineLead['sync_status'] = 'pending'): Promise<OfflineLead[]> {
    if (typeof window === 'undefined') return [];
    try {
        const db = await getDb();
        return await db.getAllFromIndex(STORE, 'by_status', status);
    } catch (e) {
        console.error('[Offline Engine] Failed to read from IndexedDB:', e);
        return [];
    }
}

/** Returns the total count of pending records (for UI badge) */
export async function getPendingCount(): Promise<number> {
    if (typeof window === 'undefined') return 0;
    try {
        const db = await getDb();
        return await db.countFromIndex(STORE, 'by_status', 'pending');
    } catch (e) {
        return 0;
    }
}

/** Marks a record as synced — called after server confirms receipt */
export async function markLeadSynced(client_uuid: string): Promise<void> {
    try {
        const db = await getDb();
        const lead = await db.get(STORE, client_uuid);
        if (lead) {
            await db.put(STORE, { ...lead, sync_status: 'synced', last_attempt: new Date().toISOString() });
        }
    } catch (e) {
        console.error('[Offline Engine] markLeadSynced failed:', e);
    }
}

/** Marks a record as failed with an error message */
export async function markLeadFailed(client_uuid: string, error: string): Promise<void> {
    try {
        const db = await getDb();
        const lead = await db.get(STORE, client_uuid);
        if (lead) {
            await db.put(STORE, {
                ...lead,
                sync_status: 'failed',
                last_attempt: new Date().toISOString(),
                last_error: error,
            });
        }
    } catch (e) {
        console.error('[Offline Engine] markLeadFailed failed:', e);
    }
}

/** Resets all failed records back to pending for retry */
export async function retryFailedLeads(): Promise<void> {
    try {
        const db = await getDb();
        const failed = await db.getAllFromIndex(STORE, 'by_status', 'failed');
        const tx = db.transaction(STORE, 'readwrite');
        for (const lead of failed) {
            await tx.store.put({ ...lead, sync_status: 'pending', last_error: undefined });
        }
        await tx.done;
        console.log(`[Offline Engine] Reset ${failed.length} failed leads to pending.`);
    } catch (e) {
        console.error('[Offline Engine] retryFailedLeads failed:', e);
    }
}

// ── Legacy shim — kept for backward compatibility with old import sites ───────
/** @deprecated Use markLeadSynced instead */
export function clearOfflineLeads(idsToRemove: string[]) {
    for (const id of idsToRemove) {
        markLeadSynced(id).catch(() => { });
    }
}
