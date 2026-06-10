const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authenticate = require("../middleware/auth");

const authorizeAdmin = require("../middleware/admin");

// Get all slots
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM parking_slots ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// Get slots by zone
router.get("/zone/:zone_id", async (req, res) => {
  const { zone_id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM parking_slots WHERE zone_id=?", [zone_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// Update slot status (admin use)
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const { is_occupied } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Update parking slot
    await client.query("UPDATE parking_slots SET is_occupied=? WHERE id=?", [is_occupied, id]);
    
    // If releasing slot (is_occupied = false), auto-complete active bookings
    if (!is_occupied) {
      await client.query(
        "UPDATE bookings SET status='completed', end_time=CURRENT_TIMESTAMP WHERE slot_id=? AND status='active'",
        [id]
      );
    }
    
    await client.query("COMMIT");
    
    const io = req.app.get("io");
    if (io) {
      io.emit("slot_update", { slot_id: id, status: is_occupied });
      io.emit("bookings_updated");
    }
    
    res.json({ message: "Slot updated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Database error" });
  } finally {
    client.release();
  }
});

module.exports = router;
