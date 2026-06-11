/**
 * Migration runner – executes SQL files in db/migrations/ in order.
 * Run: node scripts/migrate.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const pool = require('../src/config/db');
const fs = require('fs');

(async () => {
  const migrationsDir = fs.existsSync(path.resolve(__dirname, '../db/migrations'))
    ? path.resolve(__dirname, '../db/migrations')
    : path.resolve(__dirname, '../../db/migrations');

  await new Promise((resolve, reject) => {
    pool.db.run(
      'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
      (err) => (err ? reject(err) : resolve())
    );
  });

  const applied = await pool.query('SELECT name FROM schema_migrations');
  const appliedSet = new Set(applied.rows.map((r) => r.name));

  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration(s) in ${migrationsDir}`);

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`Skipping ${file} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Running ${file}...`);
    try {
      await new Promise((resolve, reject) => {
        pool.db.exec(sql, (err) => (err ? reject(err) : resolve()));
      });
      await pool.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      console.log(`  ✅ ${file} completed`);
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('duplicate column') || msg.includes('already exists')) {
        await pool.query('INSERT OR IGNORE INTO schema_migrations (name) VALUES (?)', [file]);
        console.log(`  ⚠️ ${file} skipped (already applied)`);
        continue;
      }
      console.error(`  ❌ ${file} failed:`, err.message);
      process.exit(1);
    }
  }

  console.log('All migrations completed successfully.');
  if (process.env.NODE_ENV !== 'production') {
    await pool.end();
  }
})();
