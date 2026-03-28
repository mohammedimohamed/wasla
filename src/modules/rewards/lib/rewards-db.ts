import { db, auditTrail } from '@/lib/db';

// ─────────────────────────────────────────────────────────────────────────────
// 🏆 REWARDS MODULE: DATA ACCESS LAYER
// ─────────────────────────────────────────────────────────────────────────────
export const rewardsDb = {
    /** List all rewards, optionally filtered to active only */
    list: (onlyActive = false) => {
        const filter = onlyActive ? 'WHERE is_active = 1' : '';
        return db.prepare(`
            SELECT r.*, u.name as created_by_name,
                   CASE WHEN r.total_quantity = -1 THEN -1
                        ELSE r.total_quantity - r.claimed_count
                   END as remaining
            FROM rewards r
            LEFT JOIN users u ON r.created_by = u.id
            ${filter}
            ORDER BY r.created_at DESC
        `).all() as any[];
    },

    getById: (id: string) => {
        return db.prepare(`
            SELECT r.*, u.name as created_by_name,
                   CASE WHEN r.total_quantity = -1 THEN -1
                        ELSE r.total_quantity - r.claimed_count
                   END as remaining
            FROM rewards r
            LEFT JOIN users u ON r.created_by = u.id
            WHERE r.id = ?
        `).get(id) as any;
    },

    create: (payload: {
        id: string;
        name: string;
        description?: string;
        reward_type: string;
        value?: string;
        total_quantity: number;
        rule_match?: string;
        reward_code?: string;
        created_by: string;
    }) => {
        const now = new Date().toISOString();
        db.prepare(`
            INSERT INTO rewards
                (id, name, description, reward_type, value, total_quantity, claimed_count, is_active, rule_match, reward_code, created_by, created_at, updated_at)
            VALUES
                (?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?, ?, ?)
        `).run(
            payload.id,
            payload.name,
            payload.description || null,
            payload.reward_type,
            payload.value || null,
            payload.total_quantity,
            payload.rule_match || null,
            payload.reward_code || null,
            payload.created_by,
            now, now
        );
    },

    update: (id: string, fields: {
        name?: string;
        description?: string;
        reward_type?: string;
        value?: string;
        total_quantity?: number;
        is_active?: number;
        rule_match?: string;
        reward_code?: string;
    }) => {
        const now = new Date().toISOString();
        const sets: string[] = ['updated_at = ?'];
        const params: any[] = [now];

        if (fields.name !== undefined) { sets.push('name = ?'); params.push(fields.name); }
        if (fields.description !== undefined) { sets.push('description = ?'); params.push(fields.description); }
        if (fields.reward_type !== undefined) { sets.push('reward_type = ?'); params.push(fields.reward_type); }
        if (fields.value !== undefined) { sets.push('value = ?'); params.push(fields.value); }
        if (fields.total_quantity !== undefined) { sets.push('total_quantity = ?'); params.push(fields.total_quantity); }
        if (fields.is_active !== undefined) { sets.push('is_active = ?'); params.push(fields.is_active); }
        if (fields.rule_match !== undefined) { sets.push('rule_match = ?'); params.push(fields.rule_match); }
        if (fields.reward_code !== undefined) { sets.push('reward_code = ?'); params.push(fields.reward_code); }

        params.push(id);
        db.prepare(`UPDATE rewards SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    },

    delete: (id: string) => {
        // Soft delete: just deactivate
        db.prepare(`UPDATE rewards SET is_active = 0, updated_at = ? WHERE id = ?`)
            .run(new Date().toISOString(), id);
    },

    incrementClaimed: (id: string) => {
        db.prepare(`UPDATE rewards SET claimed_count = claimed_count + 1, updated_at = ? WHERE id = ?`)
            .run(new Date().toISOString(), id);
    },

    /**
     * 🎁 Assign a reward to a lead based on matching rules
     */
    assignReward: (leadId: string, metadata: any) => {
        const activeRewards = rewardsDb.list(true);
        for (const reward of activeRewards) {
            try {
                if (!reward.rule_match) continue;
                const rule = JSON.parse(reward.rule_match);
                const val = metadata[rule.field];
                
                let match = false;
                if (rule.operator === 'equals') match = String(val) === String(rule.value);
                else if (rule.operator === 'contains') match = String(val).includes(String(rule.value));
                // Add more operators as needed...

                if (match && (reward.total_quantity === -1 || reward.claimed_count < reward.total_quantity)) {
                    db.transaction(() => {
                        db.prepare("UPDATE leads SET reward_id = ?, reward_status = 'sent' WHERE id = ?").run(reward.id, leadId);
                        rewardsDb.incrementClaimed(reward.id);
                    })();
                    return reward;
                }
            } catch (e) {
                console.error('[Rewards Error] Failed rule match:', e);
            }
        }
        return null;
    },

    approveReward: (leadId: string, adminId: string) => {
        const tx = db.transaction(() => {
            db.prepare("UPDATE leads SET reward_status = 'sent' WHERE id = ? AND reward_status = 'pending_qc'").run(leadId);
            auditTrail.logAction(adminId, 'UPDATE', 'LEAD(QC_APPROVE)', leadId, 'Reward manually approved after quality check.');
        });
        tx();
        return true;
    }
};
