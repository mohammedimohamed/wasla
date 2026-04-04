/**
 * ☁️ Wasla Sync-Cloud Engine — Server-Side Exponential Backoff Worker
 *
 * Responsibilities:
 *  1. Read pending rows from `sync_queue` (SQLite)
 *  2. POST them to the configured webhook_url (n8n, Zapier, etc.)
 *  3. Apply Exponential Backoff on failure (max configurable retries)
 *  4. Update status: 'synced' | 'failed' with full error_log
 *  5. Never block the request thread — all calls are fire-and-forget
 *  6. 100% idempotent — safe to call concurrently
 */

import { getDb, auditTrail } from '@/lib/db';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SyncQueueRow {
    id: number;
    operation: string;
    entity_type: string;
    entity_id: string;
    payload: string;
    status: 'pending' | 'failed' | 'synced';
    error_message?: string;
    error_log?: string;
    target_url?: string;
    attempts: number;
    last_attempt_at?: string;
    created_at: string;
}

export interface SyncCloudConfig {
    id: string;
    webhook_url: string | null;
    is_active: number;
    max_retries: number;
    updated_at: string;
    updated_by?: string;
}

export interface SyncEngineResult {
    processed: number;
    succeeded: number;
    failed: number;
    skipped: number;
}

// ── Config Accessor ──────────────────────────────────────────────────────────

export function getSyncCloudConfig(): SyncCloudConfig | null {
    try {
        const db = getDb();
        return db.prepare("SELECT * FROM sync_cloud_config WHERE id = 'global'").get() as SyncCloudConfig | null;
    } catch {
        return null;
    }
}

export function updateSyncCloudConfig(fields: {
    webhook_url?: string | null;
    is_active?: number;
    max_retries?: number;
}, updatedBy: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    const sets: string[] = ['updated_at = ?', 'updated_by = ?'];
    const params: any[] = [now, updatedBy];

    if (fields.webhook_url !== undefined) { sets.push('webhook_url = ?'); params.push(fields.webhook_url); }
    if (fields.is_active !== undefined) { sets.push('is_active = ?'); params.push(fields.is_active); }
    if (fields.max_retries !== undefined) { sets.push('max_retries = ?'); params.push(fields.max_retries); }

    params.push('global');
    db.prepare(`UPDATE sync_cloud_config SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    auditTrail.logAction(updatedBy, 'UPDATE', 'SYNC_CLOUD_CONFIG', 'global', 'Admin updated webhook configuration');
}

// ── Queue Accessors ──────────────────────────────────────────────────────────

export function getPendingQueueCount(): number {
    try {
        const db = getDb();
        const row = db
            .prepare("SELECT COUNT(*) as c FROM sync_queue WHERE status IN ('pending', 'failed')")
            .get() as { c: number };
        return row?.c ?? 0;
    } catch {
        return 0;
    }
}

export function getQueueStats(): { pending: number; failed: number; synced: number; total: number } {
    try {
        const db = getDb();
        const rows = db
            .prepare("SELECT status, COUNT(*) as c FROM sync_queue GROUP BY status")
            .all() as { status: string; c: number }[];
        const stat = { pending: 0, failed: 0, synced: 0, total: 0 };
        for (const r of rows) {
            if (r.status === 'pending') stat.pending = r.c;
            else if (r.status === 'failed') stat.failed = r.c;
            else if (r.status === 'synced') stat.synced = r.c;
            stat.total += r.c;
        }
        return stat;
    } catch {
        return { pending: 0, failed: 0, synced: 0, total: 0 };
    }
}

export function getQueueItems(limit = 50): SyncQueueRow[] {
    try {
        const db = getDb();
        return db
            .prepare("SELECT * FROM sync_queue ORDER BY created_at DESC LIMIT ?")
            .all(limit) as SyncQueueRow[];
    } catch {
        return [];
    }
}

export function forceRequeue(): number {
    try {
        const db = getDb();
        const result = db
            .prepare("UPDATE sync_queue SET status = 'pending', attempts = 0, error_message = NULL, last_attempt_at = NULL WHERE status = 'failed'")
            .run();
        return result.changes;
    } catch {
        return 0;
    }
}

// ── Exponential Backoff Helper ───────────────────────────────────────────────

function getBackoffDelay(attempts: number): number {
    // 1s, 2s, 4s, 8s, 16s, 32s... capped at 5 minutes
    return Math.min(1000 * Math.pow(2, attempts), 300_000);
}

// ── Core Engine ──────────────────────────────────────────────────────────────

let _isRunning = false;

/**
 * 🔄 flushSyncQueue
 * Processes all pending items from sync_queue and POSTs them to the webhook.
 * Uses Exponential Backoff on failure. 100% non-blocking.
 *
 * @param options.webhookUrl Override the stored webhook URL (for force-sync from admin)
 * @param options.triggeredBy User ID for audit logging
 */
export async function flushSyncQueue(options?: {
    webhookUrl?: string;
    triggeredBy?: string;
}): Promise<SyncEngineResult> {
    if (_isRunning) {
        console.log('[SyncEngine] Already running — skipping duplicate flush');
        return { processed: 0, succeeded: 0, failed: 0, skipped: 1 };
    }

    _isRunning = true;
    const result: SyncEngineResult = { processed: 0, succeeded: 0, failed: 0, skipped: 0 };

    try {
        const config = getSyncCloudConfig();
        const webhookUrl = options?.webhookUrl || config?.webhook_url;
        const maxRetries = config?.max_retries ?? 5;

        if (!webhookUrl) {
            console.log('[SyncEngine] No webhook URL configured — skipping cloud push');
            _isRunning = false;
            return result;
        }

        if (!config?.is_active && !options?.webhookUrl) {
            console.log('[SyncEngine] Sync cloud is disabled — skipping');
            _isRunning = false;
            return result;
        }

        const db = getDb();

        // Fetch pending + failed items that haven't exceeded max retries
        const items = db
            .prepare(`
                SELECT * FROM sync_queue 
                WHERE status IN ('pending', 'failed') 
                  AND attempts < ?
                ORDER BY created_at ASC
                LIMIT 100
            `)
            .all(maxRetries) as SyncQueueRow[];

        if (items.length === 0) {
            _isRunning = false;
            return result;
        }

        console.log(`[SyncEngine] Processing ${items.length} queue items → ${webhookUrl}`);

        for (const item of items) {
            result.processed++;
            const now = new Date().toISOString();

            // Apply exponential backoff delay if this is a retry
            if (item.attempts > 0) {
                const delay = getBackoffDelay(item.attempts - 1);
                const lastAttempt = item.last_attempt_at ? new Date(item.last_attempt_at).getTime() : 0;
                const timeSinceLast = Date.now() - lastAttempt;
                if (timeSinceLast < delay) {
                    result.skipped++;
                    continue;
                }
            }

            try {
                const payload = {
                    id: item.id,
                    operation: item.operation,
                    entity_type: item.entity_type,
                    entity_id: item.entity_id,
                    payload: JSON.parse(item.payload),
                    created_at: item.created_at,
                    sent_at: now,
                };

                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Wasla-Source': 'sync-cloud-engine',
                        'X-Wasla-Entity': item.entity_type,
                    },
                    body: JSON.stringify(payload),
                    signal: AbortSignal.timeout(15000), // 15s timeout per item
                });

                if (response.ok) {
                    db.prepare(`
                        UPDATE sync_queue 
                        SET status = 'synced', last_attempt_at = ?, target_url = ?, attempts = attempts + 1
                        WHERE id = ?
                    `).run(now, webhookUrl, item.id);
                    result.succeeded++;
                } else {
                    const errText = await response.text().catch(() => `HTTP ${response.status}`);
                    db.prepare(`
                        UPDATE sync_queue 
                        SET status = 'failed', 
                            last_attempt_at = ?, 
                            attempts = attempts + 1,
                            error_message = ?,
                            error_log = COALESCE(error_log, '') || ? || '\n',
                            target_url = ?
                        WHERE id = ?
                    `).run(
                        now,
                        errText.slice(0, 255),
                        `[${now}] HTTP ${response.status}: ${errText.slice(0, 200)}`,
                        webhookUrl,
                        item.id
                    );
                    result.failed++;
                }
            } catch (networkErr: any) {
                const errMsg = networkErr?.message || 'Network error';
                db.prepare(`
                    UPDATE sync_queue 
                    SET status = 'failed',
                        last_attempt_at = ?,
                        attempts = attempts + 1,
                        error_message = ?,
                        error_log = COALESCE(error_log, '') || ? || '\n',
                        target_url = ?
                    WHERE id = ?
                `).run(
                    now,
                    errMsg.slice(0, 255),
                    `[${now}] ${errMsg.slice(0, 200)}`,
                    webhookUrl,
                    item.id
                );
                result.failed++;
                // If network is down, stop processing further items
                if (errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('ECONNREFUSED')) {
                    break;
                }
            }
        }

        // Audit log the batch result
        if (result.processed > 0) {
            auditTrail.logAction(
                options?.triggeredBy || 'system',
                'SYNC_CLOUD',
                'SYNC_QUEUE',
                'batch',
                `SyncEngine: ${result.succeeded} sent, ${result.failed} failed, ${result.skipped} skipped`
            );
        }
    } catch (err) {
        console.error('[SyncEngine] Fatal error:', err);
    } finally {
        _isRunning = false;
    }

    return result;
}

/**
 * 🚀 triggerSyncAsync
 * Fire-and-forget wrapper. Safe to call from API routes without awaiting.
 */
export function triggerSyncAsync(options?: { webhookUrl?: string; triggeredBy?: string }): void {
    flushSyncQueue(options).catch(err => console.error('[SyncEngine] Async flush error:', err));
}
