/**
 * Migration runner – executes SQL files in db/migrations/ in order.
 * Run: node scripts/migrate.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const pool = require('../src/config/db');
const fs = require('fs');

(async () => {

  const migrationsDir = path.resolve(__dirname, '..', '..', 'db', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration(s)`);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Running ${file}...`);
    try {
      await new Promise((resolve, reject) => {
        pool.db.exec(sql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log(`  ✅ ${file} completed`);
    } catch (err) {
      console.error(`  ❌ ${file} failed:`, err.message);
      process.exit(1);
    }
  }

  console.log('All migrations completed successfully.');
  await pool.end();
})();
