const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authenticate = require("../middleware/auth");
const authorizeAdmin = require("../middleware/admin");

router.use(authenticate);

// ✅ Create booking
router.post("/", async (req, res) => {
  const user_id = req.user.id;
  const { zone_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Check if user already has an active booking
    const activeCheck = await client.query(
      "SELECT id FROM bookings WHERE user_id=? AND status='active'",
      [user_id]
    );
    if (activeCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "You already have an active booking." });
    }

    const slotResult = await client.query(
      "SELECT id FROM parking_slots WHERE zone_id=? AND is_occupied=false LIMIT 1",
      [zone_id]
    );
    if (slotResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "No slots available in this zone" });
    }
    const slot_id = slotResult.rows[0].id;
    await client.query("UPDATE parking_slots SET is_occupied=true WHERE id=?", [slot_id]);
    
    // Auto-calculate expiration (2 hours from now)
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    
    const bookingResult = await client.query(
      "INSERT INTO bookings (user_id, zone_id, slot_id, expires_at) VALUES (?, ?, ?, ?) RETURNING *",
      [user_id, zone_id, slot_id, expiresAt]
    );
    await client.query("COMMIT");
    
    const io = req.app.get("io");
    if (io) {
      io.emit("booking_created", bookingResult.rows[0]);
      io.emit("slot_update", { slot_id: slot_id, status: true });
    }
    res.status(201).json({ booking: bookingResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Database error" });
  } finally {
    client.release();
  }
});

// ✅ Cancel booking
router.put("/cancel/:id", async (req, res) => {
  const booking_id = req.params.id;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const bookingResult = await pool.query("SELECT * FROM bookings WHERE id=?", [booking_id]);
    if (bookingResult.rows.length === 0) return res.status(404).json({ error: "Booking not found" });

    const booking = bookingResult.rows[0];
    
    // User can only cancel their own booking, Admin can cancel any
    if (role !== "admin" && booking.user_id !== userId) {
      return res.status(403).json({ error: "Access denied. You can only cancel your own bookings." });
    }

    const slot_id = booking.slot_id;

    await pool.query("UPDATE bookings SET status='cancelled', end_time=CURRENT_TIMESTAMP WHERE id=?", [booking_id]);
    await pool.query("UPDATE parking_slots SET is_occupied=false WHERE id=?", [slot_id]);

    const io = req.app.get("io");
    if (io) {
      io.emit("slot_update", { slot_id: slot_id, status: false });
      io.emit("bookings_updated");
    }

    res.status(200).json({ message: "Booking cancelled successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Active booking
router.get("/active/:user_id", async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      "SELECT * FROM bookings WHERE user_id=? AND status='active'",
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Booking history
router.get("/history/:user_id", async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      "SELECT * FROM bookings WHERE user_id=? ORDER BY start_time DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ All bookings (admin only)
router.get('/all', authorizeAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT b.*, u.email as user_email FROM bookings b LEFT JOIN users u ON b.user_id = u.id ORDER BY b.start_time DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ Manual trigger cleanup route
router.post('/cleanup', async (req, res) => {
  const { runCleanup } = require('../services/cleanupService');
  const io = req.app.get('io');
  try {
    const count = await runCleanup(io);
    res.json({ message: 'Cleanup complete', count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

module.exports = router;
