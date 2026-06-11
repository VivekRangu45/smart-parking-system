const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.resolve('./smart_parking.sqlite'));

db.all('SELECT name FROM sqlite_master WHERE type="table"', (e, r) => {
  console.log('tables:', JSON.stringify(r));
});
db.all('PRAGMA table_info(users)', (e, r) => {
  console.log('users columns:', JSON.stringify(r));
});
db.all('PRAGMA table_info(bookings)', (e, r) => {
  console.log('bookings columns:', JSON.stringify(r));
});
db.all('PRAGMA table_info(parking_slots)', (e, r) => {
  console.log('slots columns:', JSON.stringify(r));
  db.close();
});
