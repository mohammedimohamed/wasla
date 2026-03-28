/**
 * 🛡️ THE SECURITY GATE (Unified Vault Access Layer)
 * ===============================================
 * This gate manages the dynamic handoff between the Core application
 * and the Vault & Security module. It ensures the system can operate
 * in 'Plaintext Mode' if the Vault module is disabled or missing.
 */
import { isModuleEnabled } from '@/lib/module-registry';

/**
 * 🔒 Dynamically handles metadata encryption with modular fallback.
 */
export async function encryptMetadata(meta: any, enabled: boolean = true) {
    if (!meta) return meta;

    if (!isModuleEnabled('vault')) {
        console.log('[SECURITY] Vault module disabled. Processing metadata as plaintext.');
        return meta; 
    }

    try {
        // 🧪 Dynamic Import: Physically decouples the vault dependency from core
        const { encryptMetadata: vaultEncrypt } = await import('@/src/modules/vault/lib/crypto');
        return vaultEncrypt(meta, enabled);
    } catch (error) {
        console.error('[SECURITY GATE] Failed to load Vault module. Falling back to plaintext.', error);
        return meta;
    }
}

/**
 * 🔓 Dynamically handles metadata decryption with modular fallback.
 */
export async function decryptMetadata(meta: any) {
    if (!meta) return meta;

    if (!isModuleEnabled('vault')) {
        // If Vault is off, we treat data as plaintext.
        // NOTE: If data was previously encrypted, it will appear as cipher text.
        return meta;
    }

    try {
        const { decryptMetadata: vaultDecrypt } = await import('@/src/modules/vault/lib/crypto');
        return vaultDecrypt(meta);
    } catch (error) {
        return meta;
    }
}

/**
 * 🆔 Secure Hashing (Pass-through when Vault is disabled)
 */
export async function hashEmail(email: string) {
    if (!email) return email;

    if (!isModuleEnabled('vault')) {
        return email; // Plaintext "hash" for indexing
    }

    try {
        const { encrypt } = await import('@/src/modules/vault/lib/crypto');
        // We use standard encryption as the "hash" for matching in this context
        return encrypt(email.toLowerCase().trim());
    } catch {
        return email;
    }
}

/**
 * 🛡️ Direct encryption/decryption exposure for specific cases (like login hashes)
 */
export async function encrypt(text: string) {
    if (!text || !isModuleEnabled('vault')) return text;
    try {
        const { encrypt: vaultEncrypt } = await import('@/src/modules/vault/lib/crypto');
        return vaultEncrypt(text);
    } catch {
        return text;
    }
}

export async function decrypt(text: string) {
    if (!text || !isModuleEnabled('vault')) return text;
    try {
        const { decrypt: vaultDecrypt } = await import('@/src/modules/vault/lib/crypto');
        return vaultDecrypt(text);
    } catch {
        return text;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔍 Module-Aware Detection
// ─────────────────────────────────────────────────────────────────────────────
export async function isActuallyEncrypted(value: string): Promise<boolean> {
    if (!value || !isModuleEnabled('vault')) return false;
    try {
        const { isActuallyEncrypted: vaultCheck } = await import('@/src/modules/vault/lib/crypto');
        return vaultCheck(value);
    } catch {
        return false;
    }
}
