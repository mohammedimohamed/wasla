import fs from 'fs';
import path from 'path';

const dbDir = path.join(process.cwd(), 'database');
const dbFile = path.join(dbDir, 'wasla.sqlite');

console.log('🔄 Running pre-build database backup...');

try {
    if (fs.existsSync(dbFile)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(dbDir, `wasla.backup.${timestamp}.sqlite`);
        
        // Backup the database
        fs.cpSync(dbFile, backupFile);
        console.log(`✅ Database backed up successfully to: ${backupFile}`);
        
        // If WAL (Write-Ahead Logging) mode is enabled in SQLite, we should also backup the -wal and -shm files if they exist
        const walFile = path.join(dbDir, 'wasla.sqlite-wal');
        if (fs.existsSync(walFile)) {
            fs.cpSync(walFile, path.join(dbDir, `wasla.backup.${timestamp}.sqlite-wal`));
        }

        const shmFile = path.join(dbDir, 'wasla.sqlite-shm');
        if (fs.existsSync(shmFile)) {
            fs.cpSync(shmFile, path.join(dbDir, `wasla.backup.${timestamp}.sqlite-shm`));
        }
        
    } else {
        console.warn('⚠️ No database found to backup at:', dbFile);
    }
} catch (error) {
    console.error('❌ Error during pre-build backup:', error);
    process.exit(1);
}
