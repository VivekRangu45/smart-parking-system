const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authenticate = require("../middleware/auth");

router.use(authenticate);

// ✅ Create payment
router.post("/", async (req, res) => {
  const { booking_id, amount } = req.body;

  try {
    // Ensure booking exists
    const bookingCheck = await pool.query("SELECT * FROM bookings WHERE id=?", [booking_id]);
    if (bookingCheck.rows.length === 0) {
      return res.status(400).json({ error: "Booking not found" });
    }

    // Insert payment
    const result = await pool.query(
      "INSERT INTO payments (booking_id, amount) VALUES (?, ?) RETURNING *",
      [booking_id, amount]
    );

    res.status(201).json({ payment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Get payments by booking
router.get("/booking/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM payments WHERE booking_id=?", [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
