const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../../smart_parking.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("SQLite connection error:", err.message);
  else console.log("Connected to SQLite database.");
});

// Emulate pg Pool API
const pool = {
  query: (text, params = []) => {
    return new Promise((resolve, reject) => {
      // For SELECT queries, use db.all. For INSERT/UPDATE/DELETE, use db.run.
      // But sqlite3 doesn't automatically return the inserted row on db.run with RETURNING in older versions,
      // though modern sqlite3 supports RETURNING if the query uses it.
      if (text.trim().toUpperCase().startsWith('SELECT') || text.toUpperCase().includes('RETURNING')) {
        db.all(text, params, function(err, rows) {
          if (err) reject(err);
          else resolve({ rows: rows || [] });
        });
      } else {
        db.run(text, params, function(err) {
          if (err) reject(err);
          else resolve({ rows: [] });
        });
      }
    });
  },
  connect: async () => {
    // Simple mock for transactions
    return {
      query: pool.query,
      release: () => {}
    };
  },
  end: () => {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  db: db // Export raw sqlite3 database object
};

module.exports = pool;