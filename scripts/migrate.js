const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'data.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const sqlDir = path.join(__dirname, '..', 'sql');
const files = fs.readdirSync(sqlDir).filter(f => f.endsWith('.sql')).sort();

for (const file of files) {
  const full = path.join(sqlDir, file);
  console.log('Applying', file);
  db.exec(fs.readFileSync(full, 'utf8'));
}

console.log('Database ready at', dbPath);