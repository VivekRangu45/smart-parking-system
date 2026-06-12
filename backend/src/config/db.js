const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.SQLITE_PATH
  ? path.resolve(process.env.SQLITE_PATH)
  : path.resolve(__dirname, '../../smart_parking.sqlite');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('SQLite connection error:', err.message);
  else console.log(`Connected to SQLite database at ${dbPath}`);
});

function runQuery(dbConn, text, params = []) {
  return new Promise((resolve, reject) => {
    const trimmed = text.trim().toUpperCase();
    if (trimmed.startsWith('SELECT') || trimmed.includes('RETURNING')) {
      dbConn.all(text, params, function (err, rows) {
        if (err) reject(err);
        else resolve({ rows: rows || [] });
      });
    } else {
      dbConn.run(text, params, function (err) {
        if (err) reject(err);
        else resolve({ rows: [], lastID: this.lastID, changes: this.changes });
      });
    }
  });
}

function handleTransactionCommand(dbConn, text) {
  const upper = text.trim().toUpperCase();
  if (upper === 'BEGIN' || upper.startsWith('BEGIN')) {
    return new Promise((resolve, reject) => {
      dbConn.run('BEGIN IMMEDIATE', (err) => (err ? reject(err) : resolve({ rows: [] })));
    });
  }
  if (upper === 'COMMIT') {
    return new Promise((resolve, reject) => {
      dbConn.run('COMMIT', (err) => (err ? reject(err) : resolve({ rows: [] })));
    });
  }
  if (upper === 'ROLLBACK') {
    return new Promise((resolve, reject) => {
      dbConn.run('ROLLBACK', (err) => (err ? reject(err) : resolve({ rows: [] })));
    });
  }
  return null;
}

const pool = {
  query: (text, params = []) => {
    const txCmd = handleTransactionCommand(db, text);
    if (txCmd) return txCmd;
    return runQuery(db, text, params);
  },

  connect: async () => ({
    query: async (text, params = []) => {
      const txCmd = handleTransactionCommand(db, text);
      if (txCmd) return txCmd;
      return runQuery(db, text, params);
    },
    release: () => {},
  }),

  end: () =>
    new Promise((resolve, reject) => {
      db.close((err) => (err ? reject(err) : resolve()));
    }),

  db,
};

module.exports = pool;
