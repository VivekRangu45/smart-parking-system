/**
 * Migration runner – executes SQL files in db/migrations/ in order.
 * Run: node scripts/migrate.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', 'backend', '.env') });
const fs = require('fs');
const sqlite3 = require(path.join(__dirname, '..', 'backend', 'node_modules', 'sqlite3')).verbose();

const dbPath = process.env.SQLITE_PATH
  ? path.resolve(process.env.SQLITE_PATH)
  : path.resolve(__dirname, '..', 'backend', 'smart_parking.sqlite');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

(async () => {
  const migrationsDir = path.resolve(__dirname, '..', 'db', 'migrations');

  await new Promise((resolve, reject) => {
    db.run(
      'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
      (err) => (err ? reject(err) : resolve())
    );
  });

  const applied = await new Promise((resolve, reject) => {
    db.all('SELECT name FROM schema_migrations', (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
  const appliedSet = new Set(applied.map((r) => r.name));

  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`SQLite database: ${dbPath}`);
  console.log(`Found ${files.length} migration(s)`);

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`Skipping ${file} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Running ${file}...`);
    try {
      await new Promise((resolve, reject) => {
        db.exec(sql, (err) => (err ? reject(err) : resolve()));
      });
      await new Promise((resolve, reject) => {
        db.run('INSERT INTO schema_migrations (name) VALUES (?)', [file], (err) => (err ? reject(err) : resolve()));
      });
      console.log(`  ✅ ${file} completed`);
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('duplicate column') || msg.includes('already exists')) {
        await new Promise((resolve) => {
          db.run('INSERT OR IGNORE INTO schema_migrations (name) VALUES (?)', [file], () => resolve());
        });
        console.log(`  ⚠️ ${file} skipped (already applied)`);
        continue;
      }
      console.error(`  ❌ ${file} failed:`, err.message);
      process.exit(1);
    }
  }

  console.log('All migrations completed successfully.');
  db.close();
})();
