const { initDb, getDb } = require('../lib/db');
const path = require('path');

// Mock env for initialization
process.env.DATABASE_NAME = 'wasla_production.db';
process.env.ENCRYPTION_KEY = '5d2f8e1a9b3c4d7e6f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e';

try {
    console.log('--- Initializing Database ---');
    initDb();
    
    const db = getDb();
    console.log('--- Disabling All Modules ---');
    db.prepare("UPDATE module_registry SET is_enabled = 0").run();
    
    const modules = db.prepare("SELECT id, is_enabled FROM module_registry").all();
    console.log('Current Module Status:', JSON.stringify(modules, null, 2));
    
    console.log('--- Done ---');
} catch (err) {
    console.error('Error:', err);
    process.exit(1);
}
