import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const standaloneDataDir = path.join(rootDir, '.next', 'standalone', 'data');
const safeBackupDir = path.join(rootDir, '.wasla_db_backup');

console.log('🔄 Running pre-build database backup...');

try {
    if (fs.existsSync(standaloneDataDir)) {
        // Ensure backup directory exists
        if (!fs.existsSync(safeBackupDir)) {
            fs.mkdirSync(safeBackupDir, { recursive: true });
        }

        // Copy the entire data directory to the safe backup location outside .next
        fs.cpSync(standaloneDataDir, safeBackupDir, { recursive: true });
        
        console.log(`✅ Production database safely backed up to: ${safeBackupDir}`);
    } else {
        console.warn('⚠️ No existing production database found to backup at:', standaloneDataDir);
    }
} catch (error) {
    console.error('❌ Error during pre-build backup:', error);
    process.exit(1);
}
