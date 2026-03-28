import { db, leadsDb, formConfigDb } from '@/lib/db';
import * as securityGate from '@/src/lib/security-gate';
import { v4 as uuidv4 } from 'uuid';

export const intelligenceLogic = {
    calculateQualityScore: (metadata: any) => {
        let score = 100;
        const reasons: string[] = [];
        const { client_uuid, created_at, ...cleanMetadata } = metadata;

        const garbageLiterals = [
            { r: /12345/i, name: 'Sequence 12345' },
            { r: /abcde/i, name: 'Sequence ABCDE' },
            { r: /test/i, name: 'Test Keyword' },
            { r: /fake/i, name: 'Fake Keyword' },
            { r: /dummy/i, name: 'Dummy Keyword' },
            { r: /none/i, name: 'None/Blank Expression' }
        ];

        const repeatPattern = /(.)\1{3,}/;
        const consonantMash = /[bcdfghjklmnpqrstvwxyz]{5,}/i;
        const rowMash = /asdf|sdfg|dfgh|fghj|ghjk|hjkl|qwert|werty|ertyu|rtyui|tyuio|yuiop|zxcv|xcvb|cvbn|vbnm/i;

        for (const [key, value] of Object.entries(cleanMetadata)) {
            if (key === 'agent_id' || key.includes('timestamp') || key === 'location_context' || key === 'device_id') continue;
            const strVal = String(value).toLowerCase();
            
            garbageLiterals.forEach(p => {
                if (p.r.test(strVal)) {
                    score -= 40;
                    reasons.push(`Garbage Literal: ${p.name} in field [${key}]`);
                }
            });

            if (repeatPattern.test(strVal)) {
                score -= 30;
                reasons.push(`Repeating Chars: [${strVal.match(repeatPattern)?.[0]}] in field [${key}]`);
            }
            if (consonantMash.test(strVal)) {
                score -= 40;
                reasons.push(`Consonant Mash in field [${key}]`);
            }
            if (rowMash.test(strVal)) {
                score -= 50;
                reasons.push(`Keyboard Row Mash in field [${key}]`);
            }
        }

        const email = String(metadata.email || '').toLowerCase();
        if (email.includes('test@') || email.endsWith('@example.com') || email.endsWith('@test.com')) {
            score -= 50;
            reasons.push(`Invalid Email Domain: [${email}]`);
        }

        const phone = String(metadata.phone || '');
        if (/^0+$/.test(phone)) {
            score -= 60;
            reasons.push('Phone is all zeros');
        } else if (/^1234/.test(phone)) {
            score -= 40;
            reasons.push('Phone starts with 1234 sequence');
        } else if (phone.length > 0 && phone.length < 8) {
            score -= 30;
            reasons.push(`Phone too short: ${phone.length} chars`);
        }

        return { score: Math.max(0, score), reasons };
    },

    analyzeLead: async (leadId: string) => {
        const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(leadId) as any;
        if (!lead) return;

        const metadataRaw = JSON.parse(lead.metadata);
        const metadata = await securityGate.decryptMetadata(metadataRaw);
        const { score: qualityScore, reasons } = intelligenceLogic.calculateQualityScore(metadata);
        
        let leadScore = 0;
        try {
            const formConfig = formConfigDb.get();
            if (formConfig && formConfig.pages) {
                formConfig.pages.forEach((p: any) => p.sections?.forEach((s: any) => s.fields?.forEach((f: any) => {
                    const val = metadata[f.name];
                    if (val && f.weight) {
                        if (Array.isArray(val) && val.length > 0) leadScore += Number(f.weight);
                        else if (typeof val === 'string' && val.trim() !== '') leadScore += Number(f.weight);
                    }
                })));
            }
        } catch (e) { }
        
        const logs: any[] = [];
        const timestamp = new Date().toISOString();

        const existingDuplicate = db.prepare(`
            SELECT id FROM leads 
            WHERE id != ? AND 
                  json_extract(metadata, '$.email') = ? AND 
                  json_extract(metadata, '$.phone') = ?
            LIMIT 1
        `).get(leadId, metadata.email, metadata.phone) as { id: string } | undefined;

        if (existingDuplicate) {
            logs.push({ type: 'POTENTIAL_DUPLICATE', message: `Same Email+Phone already registered (Lead ID: ${existingDuplicate.id})`, severity: 'WARNING' });
        }

        reasons.forEach(reason => {
            logs.push({ type: 'FRAUD_DETECTION', message: reason, severity: qualityScore < 30 ? 'CRITICAL' : 'WARNING' });
        });

        const tx = db.transaction(() => {
            db.prepare("UPDATE leads SET quality_score = ?, score = ? WHERE id = ?").run(qualityScore, leadScore, leadId);
            if (qualityScore < 20 && lead.reward_status !== 'none') {
                db.prepare("UPDATE leads SET reward_status = 'pending_qc' WHERE id = ?").run(leadId);
            }
            for (const log of logs) {
                db.prepare(`
                    INSERT INTO lead_intelligence_logs (id, lead_id, type, message, severity, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(uuidv4(), leadId, log.type, log.message, log.severity, timestamp);
            }
        });
        tx();
    },

    getSuggestedMerges: async (tenantId: string) => {
        const rows = db.prepare(`
            SELECT 
                l1.id as id1, l1.metadata as meta1, l1.quality_score as score1,
                l2.id as id2, l2.metadata as meta2, l2.quality_score as score2,
                json_extract(l1.metadata, '$.email') as email,
                json_extract(l1.metadata, '$.phone') as phone
            FROM leads l1
            JOIN leads l2 ON l1.id < l2.id
            WHERE l1.tenant_id = ? AND l2.tenant_id = ?
              AND (l1.status = 'active' OR l1.status IS NULL)
              AND (l2.status = 'active' OR l2.status IS NULL)
              AND (
                (json_extract(l1.metadata, '$.email') = json_extract(l2.metadata, '$.email') AND json_extract(l1.metadata, '$.email') IS NOT NULL AND json_extract(l1.metadata, '$.email') != '')
                OR 
                (json_extract(l1.metadata, '$.phone') = json_extract(l2.metadata, '$.phone') AND json_extract(l1.metadata, '$.phone') IS NOT NULL AND json_extract(l1.metadata, '$.phone') != '')
              )
            LIMIT 50
        `).all(tenantId, tenantId) as any[];

        return Promise.all(rows.map(async r => ({
            ...r,
            meta1: JSON.stringify(await securityGate.decryptMetadata(JSON.parse(r.meta1 || '{}'))),
            meta2: JSON.stringify(await securityGate.decryptMetadata(JSON.parse(r.meta2 || '{}'))),
            email: (await securityGate.decryptMetadata({ email: r.email })).email,
            phone: (await securityGate.decryptMetadata({ phone: r.phone })).phone
        })));
    },

    mergeLeads: async (primaryId: string, secondaryId: string, resolvedChoices: any, adminId: string) => {
        const primary = db.prepare("SELECT * FROM leads WHERE id = ?").get(primaryId) as any;
        const secondary = db.prepare("SELECT * FROM leads WHERE id = ?").get(secondaryId) as any;
        if (!primary || !secondary) throw new Error("Leads not found");

        const m1 = await securityGate.decryptMetadata(JSON.parse(primary.metadata || '{}'));
        const m2 = await securityGate.decryptMetadata(JSON.parse(secondary.metadata || '{}'));
        const mergedMetadata: any = { ...resolvedChoices };

        const phones: string[] = [];
        const addPhone = (v: any) => {
            if (!v) return;
            const arr = Array.isArray(v) ? v : [v];
            arr.forEach(p => { if (p && !phones.includes(p)) phones.push(p); });
        };
        addPhone(m1.phone); addPhone(m2.phone);
        mergedMetadata.phone = phones;

        const emails: string[] = [];
        const addEmail = (v: any) => {
            if (!v) return;
            const arr = Array.isArray(v) ? v : [v];
            arr.forEach(e => { if (e && !emails.includes(e)) emails.push(e); });
        };
        addEmail(m1.email); addEmail(m2.email);
        mergedMetadata.email = emails;

        const { settingsDb, auditTrail } = await import('@/lib/db');
        const encEnabled = settingsDb.isEncryptionEnabled();
        const encryptedMerged = await securityGate.encryptMetadata(mergedMetadata, encEnabled);

        const tx = db.transaction(() => {
            const timestamp = new Date().toISOString();
            db.prepare("UPDATE leads SET status = 'archived', updated_at = ? WHERE id = ?").run(timestamp, secondaryId);
            db.prepare("UPDATE leads SET metadata = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(encryptedMerged), timestamp, primaryId);
            leadsDb.commitHistory(primaryId, mergedMetadata, adminId, 'COMMIT'); 
            db.prepare(`INSERT INTO lead_lineage (id, parent_id, child_id, created_at) VALUES (?, ?, ?, ?)`).run(uuidv4(), secondaryId, primaryId, timestamp);
            auditTrail.logAction(adminId, 'UPDATE', 'LEAD(MERGE)', primaryId, `Accumulative merge with ${secondaryId}.`);
        });
        tx();
        return true;
    },

    revertMerge: async (childId: string, adminId: string) => {
        const lineage = db.prepare("SELECT parent_id FROM lead_lineage WHERE child_id = ?").all(childId) as { parent_id: string }[];
        if (lineage.length === 0) throw new Error("No lineage found for this lead");

        const { auditTrail } = await import('@/lib/db');
        const tx = db.transaction(() => {
            const timestamp = new Date().toISOString();
            for (const { parent_id } of lineage) {
                db.prepare("UPDATE leads SET status = 'active', updated_at = ? WHERE id = ?").run(timestamp, parent_id);
            }
            const history = db.prepare(`SELECT metadata FROM leads_history WHERE lead_id = ? AND change_type != 'MERGE_COMMIT' ORDER BY version DESC LIMIT 1`).get(childId) as { metadata: string } | undefined;
            if (history) {
                db.prepare("UPDATE leads SET metadata = ?, updated_at = ? WHERE id = ?").run(history.metadata, timestamp, childId);
            }
            db.prepare("DELETE FROM lead_lineage WHERE child_id = ?").run(childId);
            auditTrail.logAction(adminId, 'UPDATE', 'LEAD(REVERT)', childId, 'Merge reverted.');
        });
        tx();
        return true;
    },

    getLineage: async (leadId: string) => {
        const rows = db.prepare(`SELECT l.id, l.metadata, l.status, lin.created_at FROM lead_lineage lin JOIN leads l ON lin.parent_id = l.id WHERE lin.child_id = ?`).all(leadId) as any[];
        return Promise.all(rows.map(async r => ({ 
            ...r, 
            metadata: JSON.stringify(await securityGate.decryptMetadata(JSON.parse(r.metadata || '{}'))) 
        })));
    },

    getAgentQualityRanking: (tenantId: string) => {
        return db.prepare(`SELECT u.name as agent_name, COUNT(l.id) as total_leads, AVG(l.quality_score) as avg_score FROM leads l JOIN users u ON l.created_by = u.id WHERE l.tenant_id = ? GROUP BY u.id ORDER BY avg_score DESC`).all(tenantId);
    },

    getFlaggedLeads: async (tenantId: string) => {
        const rows = db.prepare(`SELECT l.id, l.metadata, l.quality_score, l.reward_status, l.source, GROUP_CONCAT(i.message, ' | ') as risk_messages FROM leads l JOIN lead_intelligence_logs i ON l.id = i.lead_id WHERE l.tenant_id = ? AND (l.status = 'active' OR l.status IS NULL) GROUP BY l.id ORDER BY l.created_at DESC LIMIT 100`).all(tenantId) as any[];
        return Promise.all(rows.map(async r => ({ ...r, metadata: JSON.stringify(await securityGate.decryptMetadata(JSON.parse(r.metadata || '{}'))) })));
    },

    getCleanLeads: async (tenantId: string) => {
        const rows = db.prepare(`SELECT id, metadata, quality_score, reward_status, source, created_at FROM leads WHERE tenant_id = ? AND (status = 'active' OR status IS NULL) AND quality_score >= 80 AND id NOT IN (SELECT lead_id FROM lead_intelligence_logs) ORDER BY created_at DESC LIMIT 50`).all(tenantId) as any[];
        return Promise.all(rows.map(async r => ({ ...r, metadata: JSON.stringify(await securityGate.decryptMetadata(JSON.parse(r.metadata || '{}'))) })));
    }
};
