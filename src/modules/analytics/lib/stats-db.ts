import { db } from '@/lib/db';
import * as securityGate from '@/src/lib/security-gate';

export const statsDb = {
    getStats: async (userId: string) => {
        const user = db.prepare("SELECT role, team_id, tenant_id FROM users WHERE id = ?").get(userId) as { role: string, team_id: string, tenant_id: string } | undefined;
        if (!user) return { totalLeads: 0, leadsToday: 0, syncedLeads: 0, recentLeads: [], kioskLeads: 0, commercialLeads: 0 };

        let filter = " WHERE tenant_id = ?";
        const params: any[] = [user.tenant_id || '00000000-0000-0000-0000-000000000000'];

        if (user.role === 'SALES_AGENT') {
            filter += " AND created_by = ?";
            params.push(userId);
        } else if (user.role === 'TEAM_LEADER' && user.team_id) {
            filter += " AND team_id = ?";
            params.push(user.team_id);
        }

        const totalLeads = db.prepare(`SELECT COUNT(*) as count FROM leads ${filter}`).get(params) as { count: number };
        const todayFilter = `${filter} AND date(created_at) = date('now')`;
        const leadsToday = db.prepare(`SELECT COUNT(*) as count FROM leads ${todayFilter}`).get(params) as { count: number };
        const syncFilter = `${filter} AND sync_status = 'synced'`;
        const syncedLeads = db.prepare(`SELECT COUNT(*) as count FROM leads ${syncFilter}`).get(params) as { count: number };
        const kioskFilter = `${filter} AND source = 'kiosk'`;
        const kioskLeads = db.prepare(`SELECT COUNT(*) as count FROM leads ${kioskFilter}`).get(params) as { count: number };
        const commercialFilter = `${filter} AND source = 'commercial'`;
        const commercialLeads = db.prepare(`SELECT COUNT(*) as count FROM leads ${commercialFilter}`).get(params) as { count: number };

        const recentLeadsRows = db.prepare(`
            SELECT * FROM leads ${filter} 
            ORDER BY created_at DESC 
            LIMIT 5
        `).all(params) as any[];

        const recentLeads = await Promise.all(recentLeadsRows.map(async r => {
            try { 
                const decryptedMeta = await securityGate.decryptMetadata(JSON.parse(r.metadata || '{}'));
                return { ...r, metadata: JSON.stringify(decryptedMeta) }; 
            }
            catch { return r; }
        }));

        // Optionnel: On peut rajouter les stats par heure pour le dashboard avancé
        const hourlyStatsRows = db.prepare(`
            SELECT strftime('%H', created_at) as hour, COUNT(*) as count
            FROM leads
            ${filter} AND date(created_at) = date('now')
            GROUP BY hour
            ORDER BY hour ASC
        `).all(params) as { hour: string, count: number }[];

        const hourlyStats = hourlyStatsRows.map(r => ({
            hour: `${r.hour}:00`,
            count: r.count
        }));

        // Optionnel: Stats par agent de vente dans la team
        let agentStats: any[] = [];
        if (user.role === 'TEAM_LEADER' || user.role === 'ADMINISTRATOR') {
            const agentStatsQuery = user.role === 'TEAM_LEADER' 
                ? `SELECT u.name as agent_name, COUNT(l.id) as conversion_count FROM leads l JOIN users u ON l.created_by = u.id WHERE l.team_id = ? GROUP BY u.id ORDER BY conversion_count DESC`
                : `SELECT u.name as agent_name, COUNT(l.id) as conversion_count FROM leads l JOIN users u ON l.created_by = u.id WHERE l.tenant_id = ? GROUP BY u.id ORDER BY conversion_count DESC`;
            
            const agentParams = user.role === 'TEAM_LEADER' ? [user.team_id] : [user.tenant_id];
            agentStats = db.prepare(agentStatsQuery).all(agentParams) as any[];
        }

        return {
            totalLeads: totalLeads.count,
            leadsToday: leadsToday.count,
            syncedLeads: syncedLeads.count,
            kioskLeads: kioskLeads.count,
            commercialLeads: commercialLeads.count,
            recentLeads,
            hourlyStats,
            agentStats,
            rewardsGiven: 0,
            rewardsGivenToday: 0,
            totalRewards: 0,
            rewardsDistributed: 0,
        };
    }
};
