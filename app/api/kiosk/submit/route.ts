import { NextResponse } from 'next/server';
import { leadsDb, rewardsDb, auditTrail } from '@/lib/db';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * 🎁 POST /api/kiosk/submit
 * Public endpoint to save a lead from the Kiosk mode and compute instant rewards.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = uuidv4();

    // ─────────────────────────────────────────────────────────────────
    // 1. REWARD MATCHING ENGINE (Transaction isolation)
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
                } catch(e) { /* ignore invalid rules */ console.error("Invalid rule JSON", reward.rule_match); }
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
    // 2. LEAD PERSISTENCE
    // ─────────────────────────────────────────────────────────────────
    const metadataStr = JSON.stringify(body);

    const newLead = {
      id,
      metadata: metadataStr,
      source: 'kiosk',                      // Tagged strictly as a Kiosk Lead
      sync_status: 'synced',                // Saved directly to DB, so it's instantly synced
      created_by: null,                     // No Agent assigned
      reward_id: wonReward ? wonReward.id : null,
      reward_status: wonReward ? 'sent' : 'pending',
      device_id: body.device_id || null,    // Multi-iPad tracking
    };

    // Insert using existing leadsDb function setup. Kiosk leads have no session.userId.
    // We'll insert it manually since `leadsDb.create` requires a `session.userId` parameter normally, or we mock one.
    // Looking at `leadsDb.create`, let's just use raw insertion if `create` fails due to no auth.
    // Wait, `create` might just use a string.
    db.prepare(`
            INSERT INTO leads (id, source, metadata, sync_status, created_by, reward_id, reward_status, device_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
      newLead.id,
      newLead.source,
      newLead.metadata,
      newLead.sync_status,
      null, // Kiosk has no agent
      newLead.reward_id,
      newLead.reward_status,
      newLead.device_id,
      new Date().toISOString(),
      new Date().toISOString()
    );

    // System-level Audit explicitly marking KIOSK submission
    auditTrail.logAction('system', 'CREATE', 'LEAD(KIOSK)', id, `Public Kiosk registration. Reward given: ${wonReward ? wonReward.name : 'None'}`);

    // ─────────────────────────────────────────────────────────────────
    // 3. RESPOND TO CLIENT
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
