import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const standaloneDataDir = path.join(rootDir, '.next', 'standalone', 'data');
const safeBackupDir = path.join(rootDir, '.wasla_db_backup');
const latestBackupDir = path.join(safeBackupDir, 'latest');

console.log('Running pre-build database backup...');

try {
    if (fs.existsSync(standaloneDataDir)) {
        // Check specifically for database files
        const files = fs.readdirSync(standaloneDataDir);
        const hasDbFiles = files.some(f => f.endsWith('.db') || f.endsWith('.sqlite') || f.endsWith('-wal') || f.endsWith('-shm'));

        if (hasDbFiles) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const archiveBackupDir = path.join(safeBackupDir, 'archives', `backup_${timestamp}`);

            // Ensure backup directories exist
            if (!fs.existsSync(latestBackupDir)) fs.mkdirSync(latestBackupDir, { recursive: true });
            if (!fs.existsSync(archiveBackupDir)) fs.mkdirSync(archiveBackupDir, { recursive: true });

            // 1. Create a timestamped archive to preserve history
            fs.cpSync(standaloneDataDir, archiveBackupDir, { recursive: true });
            console.log(`Archived old database safely to: ${archiveBackupDir}`);

            // 2. Update the 'latest' folder for the post-build restore
            fs.cpSync(standaloneDataDir, latestBackupDir, { recursive: true });
            console.log(`Updated latest backup for restoration.`);
        } else {
            console.log('No database files (.db, .db-wal) found, skipping backup.');
        }
    } else {
        console.warn('No existing production data folder found to backup at:', standaloneDataDir);
    }
} catch (error) {
    console.error('Error during pre-build backup:', error);
    process.exit(1);
}
