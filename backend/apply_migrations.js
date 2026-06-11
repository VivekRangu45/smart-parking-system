/**
 * Direct SQLite migration runner - applies only the changes not yet in the DB.
 * Run: node apply_migrations.js
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.resolve('./smart_parking.sqlite'), (err) => {
  if (err) { console.error('DB open error:', err); process.exit(1); }
  console.log('Connected to SQLite.');
});

function run(sql, label) {
  return new Promise((resolve, reject) => {
    db.run(sql, function(err) {
      if (err) {
        console.error(`❌ ${label}:`, err.message);
        reject(err);
      } else {
        console.log(`✅ ${label}`);
        resolve();
      }
    });
  });
}

function ignoreIfExists(promise) {
  return promise.catch(err => {
    if (err.message && (err.message.includes('duplicate column') || err.message.includes('already exists'))) {
      console.log('   (already applied, skipping)');
    } else {
      throw err;
    }
  });
}

(async () => {
  try {
    // Add full_name to users
    await ignoreIfExists(run(
      "ALTER TABLE users ADD COLUMN full_name VARCHAR(255)",
      "Add full_name to users"
    ));

    // Add qr_code to bookings
    await ignoreIfExists(run(
      "ALTER TABLE bookings ADD COLUMN qr_code TEXT",
      "Add qr_code to bookings"
    ));

    // Create occupancy table
    await run(
      `CREATE TABLE IF NOT EXISTS occupancy (
        slot_id     INTEGER PRIMARY KEY,
        occupied    INTEGER NOT NULL DEFAULT 0,
        last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (slot_id) REFERENCES parking_slots(id) ON DELETE CASCADE
      )`,
      "Create occupancy table"
    );

    // Seed occupancy rows for all 30 parking slots (if not already seeded)
    await run(
      `INSERT OR IGNORE INTO occupancy (slot_id, occupied)
       SELECT id, 0 FROM parking_slots`,
      "Seed occupancy rows"
    );

    // Ensure test accounts exist with correct roles
    await run(
      `INSERT OR IGNORE INTO users (id, firebase_uid, email, role) 
       VALUES (99, 'test_uid_admin', 'admin_test@example.com', 'admin')`,
      "Seed admin test account"
    );
    await run(
      `INSERT OR IGNORE INTO users (id, firebase_uid, email, role) 
       VALUES (100, 'test_uid_user', 'user_test@example.com', 'user')`,
      "Seed user test account"
    );
    await run(
      `INSERT OR IGNORE INTO users (id, firebase_uid, email, role) 
       VALUES (101, 'test_uid_user2', 'user2_test@example.com', 'user')`,
      "Seed user2 test account"
    );

    console.log('\n✅ All migrations applied successfully!');
    db.close();
  } catch (err) {
    console.error('Migration failed:', err);
    db.close();
    process.exit(1);
  }
})();
