export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { leadsDb, rewardsDb, auditTrail, formConfigDb, db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * 🎁 POST /api/kiosk/submit
 * Public endpoint to save a lead from the Kiosk mode and compute instant rewards.
 * Supports idempotency via `client_uuid` to prevent duplicate records from
 * offline-first background retries.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // ── IDEMPOTENCY CHECK ─────────────────────────────────────────────────────
    // If the offline-first client repeats this request, we return the original
    // result rather than duplicating the record.
    if (body.client_uuid) {
      const existing = db.prepare(
        `SELECT id FROM leads WHERE json_extract(metadata, '$.client_uuid') = ? LIMIT 1`
      ).get(body.client_uuid) as { id: string } | undefined;

      if (existing) {
        console.log(`[Kiosk Submit] Idempotent repeat for client_uuid ${body.client_uuid} — returning existing.`);
        return NextResponse.json({ success: true, lead_id: existing.id, reward: null }, { status: 200 });
      }
    }

    const id = uuidv4();

    // ─────────────────────────────────────────────────────────────────
    // 🎁 1. INSTANT REWARD MATCHING ENGINE
    // ─────────────────────────────────────────────────────────────────
    let wonReward: any = null;

    // Wrap the assignment in an exclusive transaction to prevent race conditions on stock
    const assignReward = db.transaction(() => {
      // Fetch all ACTIVE rewards with remaining stock
      const availableRewards = db.prepare(`
                SELECT * FROM rewards 
                WHERE is_active = 1 
                    AND (total_quantity = -1 OR (total_quantity - claimed_count) > 0)
            `).all() as any[];

      if (availableRewards.length > 0) {
        // 1. Separate rewards into rule-based and universal (no rules)
        const ruleBased: any[] = [];
        const universal: any[] = [];

        for (const reward of availableRewards) {
          if (reward.rule_match) {
            try {
              ruleBased.push({ ...reward, ruleObj: JSON.parse(reward.rule_match) });
            } catch (e) { /* ignore invalid rules */ console.error("Invalid rule JSON", reward.rule_match); }
          } else {
            universal.push(reward);
          }
        }

        // 2. Try to find a matching rule
        let matchedRewards = ruleBased.filter(r => {
          const { field, value } = r.ruleObj;
          if (!field || !value) return false;

          const metaValue = body[field];
          if (Array.isArray(metaValue)) {
            return metaValue.includes(value);
          }
          return String(metaValue) === String(value);
        });

        // 3. If no rules match, fallback to universal pool
        let selectionPool = matchedRewards.length > 0 ? matchedRewards : universal;

        // If even universal is empty, pick anything to avoid breaking (failsafe)
        if (selectionPool.length === 0) selectionPool = availableRewards;

        // Randomly pick one reward from the final valid pool
        const randomIndex = Math.floor(Math.random() * selectionPool.length);
        wonReward = selectionPool[randomIndex];

        // Increment its claimed_count to reserve it immediately 
        rewardsDb.incrementClaimed(wonReward.id);

        return wonReward;
      }
      return null;
    });

    // Execute transaction
    assignReward();

    // ─────────────────────────────────────────────────────────────────
    // 2. FAST LEAD PERSISTENCE
    // ─────────────────────────────────────────────────────────────────
    const metadataStr = JSON.stringify(body);

    // Grab active form version
    const config = formConfigDb.get();
    const formVersion = config ? config._version : 1;

    // 🛡️ Data Sanitization
    const rawDevice = body.device_id ? String(body.device_id) : 'Generic_QR';
    const cleanDevice = rawDevice.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50) || 'Generic_QR';

    const newLead = {
      id,
      metadata: metadataStr,
      source: 'kiosk',
      sync_status: 'synced',
      created_by: null,
      reward_id: wonReward ? wonReward.id : null,
      reward_status: wonReward ? 'sent' : 'pending',
      device_id: cleanDevice,
    };

    db.prepare(`
            INSERT INTO leads (id, source, metadata, sync_status, created_by, reward_id, reward_status, device_id, form_version, tenant_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
      newLead.id,
      newLead.source,
      newLead.metadata,
      newLead.sync_status,
      null,
      newLead.reward_id,
      newLead.reward_status,
      newLead.device_id,
      formVersion,
      body.tenant_id || '00000000-0000-0000-0000-000000000000',
      new Date().toISOString(),
      new Date().toISOString()
    );

    // System-level Audit
    auditTrail.logAction('system', 'CREATE', 'LEAD(KIOSK)', id, `Public Kiosk registration.`);

    // ─────────────────────────────────────────────────────────────────
    // ⚡ 3. ASYNCHRONOUS INTELLIGENCE LAYER (Non-Blocking)
    // ─────────────────────────────────────────────────────────────────
    // We trigger the analysis in the background. In a serverless env, we'd use a queue.
    // In this Node environment, we just start the promise.
    leadsDb.analyzeLead(id).catch(err => console.error('[Intel Error]', err));

    // ─────────────────────────────────────────────────────────────────
    // 4. RESPOND TO CLIENT (FAST)
    // ─────────────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      lead_id: id,
      reward: wonReward ? {
        id: wonReward.id,
        name: wonReward.name,
        type: wonReward.reward_type,
        value: wonReward.value,
        description: wonReward.description
      } : null
    }, { status: 201 });

  } catch (e) {
    console.error('[Kiosk Submit Error]', e);
    return NextResponse.json({ error: 'Failed to process kiosk registration.' }, { status: 500 });
  }
}
