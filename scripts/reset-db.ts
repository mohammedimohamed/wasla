import Database from 'better-sqlite3';
import path from 'path';
import 'dotenv/config';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'database', 'wasla.sqlite');

try {
    const db = new Database(dbPath);

    console.log('🧹 Beginning Database Reset...');

    db.transaction(() => {
        // Clear Leads
        const clrLeads = db.prepare('DELETE FROM leads').run();
        console.log(`✅ Deleted ${clrLeads.changes} leads`);

        // Reset Rewards counts specifically
        const rstRewards = db.prepare('UPDATE rewards SET claimed_count = 0').run();
        console.log(`✅ Reset Claim Counts for ${rstRewards.changes} rewards`);

        // Record Reset in Audit Log
        db.prepare(`
            INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            crypto.randomUUID(),
            'system',
            'RESET',
            'DATABASE',
            'all',
            'Administrator wiped all lead data and reset reward claimed counters ahead of a new event.',
            new Date().toISOString()
        );
    })();

    console.log('🚀 Reset Complete! Users, Teams, and Settings were preserved.');
    db.close();
} catch (error) {
    console.error('❌ Failed to reset database:', error);
}
