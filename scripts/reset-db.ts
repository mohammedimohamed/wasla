import Database from 'better-sqlite3';

const DB_PATH = process.env.SQLITE_DB_PATH || './data/batimatec2026.db';
const db = new Database(DB_PATH);

function resetDb() {
    console.log('Resetting leads database...');

    try {
        // We only delete leads, keeping rewards and logs if necessary
        // or we can purge everything if requested.
        // The spec says "purge tous les leads, remet les compteurs à zéro"
        db.prepare('DELETE FROM leads').run();
        db.prepare('DELETE FROM sync_log').run();

        // Vacuum to free space
        db.prepare('VACUUM').run();

        console.log('Database leads purged successfully.');
    } catch (error) {
        console.error('Error resetting database:', error);
    }
}

resetDb();
