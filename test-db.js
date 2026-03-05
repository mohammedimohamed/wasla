try {
    const Database = require('better-sqlite3');
    const db = new Database(':memory:');
    console.log('Better-sqlite3 is WORKING');
} catch (e) {
    console.error('Better-sqlite3 is NOT working:', e.message);
}
