import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.SQLITE_DB_PATH || './data/batimatec2026.db';

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Simple migration runner
export function initDb() {
    const migrationPath = path.join(process.cwd(), 'migrations', '001_init.sql');
    if (fs.existsSync(migrationPath)) {
        const migration = fs.readFileSync(migrationPath, 'utf8');
        db.exec(migration);
        console.log('Database initialized successfully.');
    } else {
        console.error('Migration file not found:', migrationPath);
    }
}

// Initialize database
initDb();

export default db;
