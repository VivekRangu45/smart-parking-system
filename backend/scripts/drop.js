/**
 * Drop all application tables (SQLite).
 * Run: node scripts/drop.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.SQLITE_PATH
  ? path.resolve(process.env.SQLITE_PATH)
  : path.resolve(__dirname, '../smart_parking.sqlite');

const db = new sqlite3.Database(dbPath);

(async () => {
  try {
    await new Promise((resolve, reject) => {
      db.exec(`
        DROP TABLE IF EXISTS detection_runs;
        DROP TABLE IF EXISTS detection_logs;
        DROP TABLE IF EXISTS payments;
        DROP TABLE IF EXISTS occupancy;
        DROP TABLE IF EXISTS occupancy_logs;
        DROP TABLE IF EXISTS bookings;
        DROP TABLE IF EXISTS parking_slots;
        DROP TABLE IF EXISTS zones;
        DROP TABLE IF EXISTS users;
      `, (err) => (err ? reject(err) : resolve()));
    });
    console.log('All tables dropped');
  } catch (err) {
    console.error(err);
  } finally {
    db.close();
  }
})();
