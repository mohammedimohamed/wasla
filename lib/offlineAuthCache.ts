/**
 * 🔐 Wasla Offline Auth Cache
 *
 * Implements offline PIN validation per the Phase 13.6 spec:
 *  1. After a successful online session, this module caches a snapshot in IndexedDB.
 *  2. When the agent opens the app offline (e.g. at the convention stand), we validate
 *     the PIN against the locally-stored hash without network calls.
 *  3. Sessions are valid for SESSION_TTL_MS (3 hours) offline.
 *  4. On next online heartbeat, the middleware triggers a full server re-auth.
 *
 * ⚠️  SECURITY POSTURE: This uses a PBKDF2-derived key stored only in IndexedDB.
 *      The raw PIN is never persisted. On a rooted device, a local IndexedDB snapshot
 *      could technically be read. This is an ACCEPTABLE trade-off for an event stand
 *      context — the same trade-off Gmail makes for offline compose.
 */

import { openDB, IDBPDatabase } from 'idb';

const DB_NAME   = 'wasla_auth_cache';
const DB_VER    = 1;
const STORE     = 'auth_snapshot';
const SESSION_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

export interface AuthSnapshot {
    userId: string;
    name: string;
    role: 'SALES_AGENT' | 'TEAM_LEADER' | 'ADMINISTRATOR';
    teamId?: string | null;
    /** PBKDF2 hash of the PIN — never the raw PIN */
    pinHash: string;
    /** Salt for PBKDF2 — stored alongside hash */
    pinSalt: string;
    /** ISO timestamp of when the snapshot was cached */
    cachedAt: string;
    /** ISO timestamp of when a full re-auth is required */
    needsReauthAfter: string;
}

// ── WebCrypto Helpers ─────────────────────────────────────────────────────────

function bufToHex(buf: ArrayBuffer): string {
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBuf(hex: string): ArrayBuffer {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes.buffer;
}

async function deriveKey(pin: string, saltHex: string): Promise<string> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(pin),
        'PBKDF2',
        false,
        ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: hexToBuf(saltHex),
            iterations: 100_000,
            hash: 'SHA-256',
        },
        keyMaterial,
        256
    );
    return bufToHex(bits);
}

async function generateSalt(): Promise<string> {
    const buf = crypto.getRandomValues(new Uint8Array(16));
    return bufToHex(buf.buffer);
}

// ── IndexedDB Accessor ────────────────────────────────────────────────────────

let _db: IDBPDatabase | null = null;

async function getDb(): Promise<IDBPDatabase> {
    if (_db) return _db;
    _db = await openDB(DB_NAME, DB_VER, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'userId' });
            }
        },
    });
    return _db;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Called after a SUCCESSFUL online login + PIN verification.
 * Stores a local auth snapshot so the agent can work offline.
 */
export async function cacheAuthSession(
    userId: string,
    name: string,
    role: AuthSnapshot['role'],
    teamId: string | null | undefined,
    pin: string
): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        const salt = await generateSalt();
        const hash = await deriveKey(pin, salt);
        const now = new Date();
        const snapshot: AuthSnapshot = {
            userId,
            name,
            role,
            teamId: teamId ?? null,
            pinHash: hash,
            pinSalt: salt,
            cachedAt: now.toISOString(),
            needsReauthAfter: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
        };
        const db = await getDb();
        await db.put(STORE, snapshot);
        console.log(`[OfflineAuth] Auth snapshot cached for user ${name} (valid 3 h).`);
    } catch (e) {
        console.error('[OfflineAuth] Failed to cache auth snapshot:', e);
    }
}

/**
 * Validates a PIN offline against the cached snapshot.
 * Returns the snapshot if valid and within TTL, null otherwise.
 */
export async function validateOfflinePin(
    userId: string,
    pin: string
): Promise<AuthSnapshot | null> {
    if (typeof window === 'undefined') return null;
    try {
        const db = await getDb();
        const snapshot: AuthSnapshot | undefined = await db.get(STORE, userId);
        if (!snapshot) return null;

        // TTL check
        if (new Date() > new Date(snapshot.needsReauthAfter)) {
            console.warn('[OfflineAuth] Cached session expired — full re-auth required.');
            return null;
        }

        // PIN check via PBKDF2
        const derivedHash = await deriveKey(pin, snapshot.pinSalt);
        if (derivedHash !== snapshot.pinHash) {
            console.warn('[OfflineAuth] PIN mismatch for userId:', userId);
            return null;
        }

        return snapshot;
    } catch (e) {
        console.error('[OfflineAuth] Offline PIN validation failed:', e);
        return null;
    }
}

/**
 * Returns the cached snapshot for a userId without PIN verification.
 * Useful for pre-filling the login screen with the last known name.
 */
export async function getCachedSession(userId?: string): Promise<AuthSnapshot | null> {
    if (typeof window === 'undefined') return null;
    try {
        const db = await getDb();
        if (userId) {
            return (await db.get(STORE, userId)) ?? null;
        }
        // Return the most recently cached snapshot
        const all = await db.getAll(STORE);
        if (!all.length) return null;
        return all.sort((a, b) =>
            new Date(b.cachedAt).getTime() - new Date(a.cachedAt).getTime()
        )[0];
    } catch (e) {
        return null;
    }
}

/**
 * Checks if the cached session has expired and needs full re-auth.
 * Called by the heartbeat when connectivity is restored.
 */
export async function needsFullReauth(userId: string): Promise<boolean> {
    const snapshot = await getCachedSession(userId);
    if (!snapshot) return true;
    return new Date() > new Date(snapshot.needsReauthAfter);
}

/**
 * Clears the cached auth for a specific user (called on explicit logout).
 */
export async function clearCachedAuth(userId: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        const db = await getDb();
        await db.delete(STORE, userId);
    } catch (_) { }
}
