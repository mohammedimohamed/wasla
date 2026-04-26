import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, '.next', 'standalone');
const standaloneNextDir = path.join(standaloneDir, '.next');
const staticDir = path.join(rootDir, '.next', 'static');
const publicDir = path.join(rootDir, 'public');

console.log('🔄 Running cross-platform post-build script...');

try {
    // Ensure the destination directory exists
    if (!fs.existsSync(standaloneNextDir)) {
        fs.mkdirSync(standaloneNextDir, { recursive: true });
        console.log('✅ Created .next/standalone/.next directory');
    }

    // Copy .next/static to standalone folder
    if (fs.existsSync(staticDir)) {
        fs.cpSync(staticDir, path.join(standaloneNextDir, 'static'), { recursive: true });
        console.log('✅ Copied .next/static to standalone');
    } else {
        console.warn('⚠️ .next/static not found');
    }

    // Copy public directory to standalone folder
    if (fs.existsSync(publicDir)) {
        fs.cpSync(publicDir, path.join(standaloneDir, 'public'), { recursive: true });
        console.log('✅ Copied public directory to standalone');
    } else {
        console.warn('⚠️ public directory not found');
    }

    console.log('🎉 Post-build completed successfully!');
} catch (error) {
    console.error('❌ Error during post-build copy:', error);
    process.exit(1);
}
