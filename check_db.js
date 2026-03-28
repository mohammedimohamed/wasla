const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(), 'data', 'wasla_production.db'); // assuming this is the name
const db = new Database(dbPath);
const info = db.pragma('table_info(rewards)');
console.log(JSON.stringify(info, null, 2));
const leadsInfo = db.pragma('table_info(leads)');
console.log(JSON.stringify(leadsInfo, null, 2));
