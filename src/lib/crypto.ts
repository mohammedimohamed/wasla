import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// Derive a stable 32-byte key from the env variable using SHA-256.
// This handles any length of ENCRYPTION_KEY safely.
const RAW_KEY = process.env.ENCRYPTION_KEY || 'wasla-default-insecure-key-change-me';
const KEY_BUFFER: Buffer = crypto.createHash('sha256').update(RAW_KEY).digest();

// ─────────────────────────────────────────────────────────────────────────────
// 🔑 Core encrypt / decrypt
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Encrypts a plain-text string using AES-256-GCM.
 * Returns a string in the format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export function encrypt(text: string): string {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(12); // 96-bit IV for GCM
        const cipher = crypto.createCipheriv(ALGORITHM, KEY_BUFFER, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        const result = `${iv.toString('hex')}:${authTag}:${encrypted}`;

        if (process.env.NODE_ENV === 'development') {
            console.log(`[Crypto Debug] ENCRYPT: "${text.slice(0, 20)}" -> "${result.slice(0, 20)}..."`);
        }

        return result;
    } catch (err) {
        console.error('[Crypto] encrypt() failed:', err);
        return text; // Fail open — return plain text so data isn't lost
    }
}

/**
 * Decrypts a cipher string produced by encrypt().
 * Handles plain-text input gracefully (returns as-is if not valid cipher format).
 */
export function decrypt(encryptedText: string): string {
    if (!encryptedText) return encryptedText;

    // Fast bail-out: if it doesn't look like our format, it's plain text
    if (!isCipherFormat(encryptedText)) return encryptedText;

    try {
        const [ivHex, authTagHex, encryptedHex] = encryptedText.split(':');
        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            KEY_BUFFER,
            Buffer.from(ivHex, 'hex')
        );
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        if (process.env.NODE_ENV === 'development') {
            console.log(`[Crypto Debug] DECRYPT: "${encryptedText.slice(0, 20)}..." -> "${decrypted.slice(0, 20)}"`);
        }

        return decrypted;
    } catch {
        // GCM auth tag check failed = wrong key OR corrupted data
        // Return original — caller will see gibberish, which is correct behaviour
        return encryptedText;
    }
}

/**
 * Like decrypt() but returns null on failure instead of returning the input.
 * Used by the Key Guard to distinguish "wrong key" from "plain text".
 */
export function tryDecrypt(encryptedText: string): string | null {
    if (!encryptedText || !isCipherFormat(encryptedText)) return null;
    try {
        const [ivHex, authTagHex, encryptedHex] = encryptedText.split(':');
        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            KEY_BUFFER,
            Buffer.from(ivHex, 'hex')
        );
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch {
        return null; // definitive: wrong key
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔍 Detection helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks if a string is in iv:authTag:cipher hex format.
 * Does NOT verify the key — use tryDecrypt() for that.
 */
function isCipherFormat(value: string): boolean {
    const parts = value.split(':');
    if (parts.length !== 3) return false;
    // IV = 12 bytes = 24 hex chars, AuthTag = 16 bytes = 32 hex chars
    return (
        parts[0].length === 24 &&
        parts[1].length === 32 &&
        /^[0-9a-f]+$/i.test(parts[0]) &&
        /^[0-9a-f]+$/i.test(parts[1]) &&
        /^[0-9a-f]*$/i.test(parts[2]) // cipher may be empty for empty string
    );
}

/**
 * Returns true ONLY if the value is valid cipher text that can be
 * successfully decrypted with the CURRENT key.
 * This is the CORRECT way to check "is this field already encrypted?"
 */
export function isActuallyEncrypted(value: string): boolean {
    if (!value || typeof value !== 'string') return false;
    if (!isCipherFormat(value)) return false;
    return tryDecrypt(value) !== null; // null = decryption failed = not encrypted with our key
}

/**
 * Legacy shape-check (kept for the Key Guard in /api/restore).
 * Prefer isActuallyEncrypted() for migration logic.
 */
export function isEncrypted(value: string): boolean {
    return isCipherFormat(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔒 Metadata-level helpers
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 🔒 Metadata-level helpers with Dynamic Governance
// ─────────────────────────────────────────────────────────────────────────────

let _cachedSensitiveFields: string[] | null = null;
let _lastCacheTime = 0;

/**
 * Dynamically retrieves user-defined sensitive fields from the active form schema.
 * Implements a 60-second in-memory cache to prevent DB spam on bulk operations.
 */
export function getSensitiveFields(): string[] {
    const defaultFields = ['email', 'phone', 'phone_number', 'telephone'];
    
    if (_cachedSensitiveFields && (Date.now() - _lastCacheTime < 60000)) {
        return _cachedSensitiveFields;
    }

    try {
        const { db } = require('@/lib/db');
        const row = db.prepare("SELECT config FROM form_configs WHERE id = 'active'").get() as { config: string };
        if (!row) return defaultFields;

        const config = JSON.parse(row.config);
        const sensitive: string[] = [];

        for (const page of config.pages || []) {
            for (const section of page.sections || []) {
                for (const field of section.fields || []) {
                    if (field.isSensitive) {
                        sensitive.push(field.name);
                    }
                }
            }
        }

        // If no sensitive fields defined, fallback to defaults to avoid breaking existing setups
        _cachedSensitiveFields = sensitive.length > 0 ? sensitive : defaultFields;
        _lastCacheTime = Date.now();
        return _cachedSensitiveFields;
    } catch {
        return _cachedSensitiveFields || defaultFields;
    }
}

function applyToField(val: any, fn: (s: string) => string): any {
    if (!val) return val;
    if (Array.isArray(val)) return val.map(v => (typeof v === 'string' ? fn(v) : v));
    if (typeof val === 'string') return fn(val);
    return val;
}

/**
 * Encrypt sensitive fields dynamically fetched from schema, respecting the global toggle.
 */
export function encryptMetadata(
    meta: Record<string, any>,
    encryptionEnabled: boolean = true
): Record<string, any> {
    if (!meta) return meta;
    if (!encryptionEnabled) return meta;

    const secured = { ...meta };
    for (const field of getSensitiveFields()) {
        if (secured[field] !== undefined) {
            secured[field] = applyToField(secured[field], encrypt);
        }
    }
    return secured;
}

/**
 * Always decrypt dynamic sensitive fields.
 */
export function decryptMetadata(meta: Record<string, any>): Record<string, any> {
    if (!meta) return meta;
    const readable = { ...meta };
    for (const field of getSensitiveFields()) {
        if (readable[field] !== undefined) {
            readable[field] = applyToField(readable[field], decrypt);
        }
    }
    return readable;
}

/**
 * Force-encrypt on dynamic fields regardless of toggle (used by bulk migration).
 */
export function forceEncryptMetadata(meta: Record<string, any>): Record<string, any> {
    if (!meta) return meta;
    const secured = { ...meta };
    for (const field of getSensitiveFields()) {
        if (secured[field] !== undefined) {
            secured[field] = applyToField(secured[field], (val: string) => {
                if (isActuallyEncrypted(val)) {
                    if (process.env.NODE_ENV === 'development') {
                        console.log(`[Crypto Migration] Field "${field}" already encrypted — skipping.`);
                    }
                    return val;
                }
                return encrypt(val);
            });
        }
    }
    return secured;
}
