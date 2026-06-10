const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authenticate = require("../middleware/auth");
const authorizeAdmin = require("../middleware/admin");

router.use(authenticate);
router.use(authorizeAdmin);

// ✅ Occupancy report: slots occupied per zone
router.get("/occupancy", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT z.name AS zone_name,
             SUM(CASE WHEN ps.is_occupied = 1 THEN 1 ELSE 0 END) AS occupied_slots,
             COUNT(*) AS total_slots
      FROM zones z
      JOIN parking_slots ps ON ps.zone_id = z.id
      GROUP BY z.name
      ORDER BY z.name;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Revenue report: total payments collected
router.get("/revenue", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT SUM(amount) AS total_revenue
      FROM payments;
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Daily bookings report
router.get("/daily-bookings", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT date(start_time) AS booking_date, COUNT(*) AS booking_count
      FROM bookings
      GROUP BY booking_date
      ORDER BY booking_date ASC
      LIMIT 7;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
