const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const http = require('http');

const dbPath = path.resolve(__dirname, 'smart_parking.sqlite');
const db = new sqlite3.Database(dbPath);

function queryDB(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function runDB(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api${endpoint}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test_token'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTest() {
  try {
    console.log("--- E2E TEST START ---\n");

    // 1. Create a Test User
    console.log("[1] Creating Test User...");
    let userId;
    try {
      const userResult = await runDB("INSERT INTO users (firebase_uid, email) VALUES (?, ?)", ['test_uid_999', 'e2e@example.com']);
      userId = userResult.lastID;
    } catch (e) {
      if (e.code === 'SQLITE_CONSTRAINT') {
        const existingUser = await queryDB("SELECT id FROM users WHERE email = ?", ['e2e@example.com']);
        userId = existingUser[0].id;
      } else {
        throw e;
      }
    }
    console.log(`✅ User available with ID: ${userId}\n`);

    // 2. Initial State (Slots & Analytics)
    console.log("[2] Checking Initial State...");
    const initialSlots = await makeRequest('GET', '/slots/zone/1');
    const freeSlotsBefore = initialSlots.filter(s => !s.is_occupied).length;
    console.log(`   Zone 1 Free Slots: ${freeSlotsBefore}`);

    // 3. Create a Booking
    console.log("\n[3] Creating Booking via API...");
    const bookingRes = await makeRequest('POST', '/bookings', { user_id: userId, zone_id: 1 });
    console.log("   API Response:", bookingRes);
    const bookingId = bookingRes.booking.id;
    const slotId = bookingRes.booking.slot_id;
    console.log(`✅ Booking created successfully. Booking ID: ${bookingId}, Slot ID: ${slotId}\n`);

    // 4. Create a Payment
    console.log("[4] Recording Payment via API...");
    const paymentRes = await makeRequest('POST', '/payments', { booking_id: bookingId, amount: 50.0 });
    console.log("   API Response:", paymentRes);
    console.log(`✅ Payment recorded successfully.\n`);

    // 5. Verify Database Records
    console.log("[5] Verifying Database Records...");
    const dbBookings = await queryDB("SELECT * FROM bookings WHERE id=?", [bookingId]);
    console.log("   Bookings Table:", dbBookings[0]);
    
    const dbPayments = await queryDB("SELECT * FROM payments WHERE booking_id=?", [bookingId]);
    console.log("   Payments Table:", dbPayments[0]);
    
    const dbSlot = await queryDB("SELECT * FROM parking_slots WHERE id=?", [slotId]);
    console.log("   Parking Slots Table (is_occupied should be 1):", dbSlot[0]);

    // 6. Verify Admin Dashboard Analytics
    console.log("\n[6] Verifying Admin Dashboard Analytics...");
    const analyticsOccupancy = await makeRequest('GET', '/analytics/occupancy');
    console.log("   Occupancy Report:", analyticsOccupancy.find(z => z.zone_name === 'A'));
    
    const analyticsRevenue = await makeRequest('GET', '/analytics/revenue');
    console.log("   Total Revenue Report:", analyticsRevenue);

    console.log("\n--- E2E TEST COMPLETE ---");
  } catch (err) {
    console.error("Test Failed:", err);
  } finally {
    db.close();
  }
}

runTest();
