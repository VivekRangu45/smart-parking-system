const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const authorizeAdmin = require('../middleware/admin');

router.use(authenticate);
router.use(authorizeAdmin);

// ✅ Full parking statistics (for admin dashboard)
router.get('/stats', async (req, res) => {
  try {
    const [slotsRes, bookingsRes, revenueRes, todayRes] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total_slots,
          SUM(CASE WHEN is_occupied = 1 THEN 1 ELSE 0 END) AS occupied_slots,
          SUM(CASE WHEN is_occupied = 0 THEN 1 ELSE 0 END) AS available_slots
        FROM parking_slots
      `),
      pool.query(`
        SELECT
          COUNT(*) AS total_bookings,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_bookings,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_bookings,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_bookings
        FROM bookings
      `),
      pool.query(`
        SELECT COALESCE(SUM(amount), 0) AS lifetime_revenue
        FROM payments
      `),
      pool.query(`
        SELECT COALESCE(SUM(amount), 0) AS today_revenue
        FROM payments
        WHERE date(paid_at) = date('now')
      `),
    ]);

    const slots = slotsRes.rows[0];
    const bookings = bookingsRes.rows[0];
    const totalSlots = Number(slots.total_slots) || 0;
    const occupiedSlots = Number(slots.occupied_slots) || 0;

    res.json({
      // Slot stats
      total_slots: totalSlots,
      occupied_slots: occupiedSlots,
      available_slots: Number(slots.available_slots) || 0,
      occupancy_percentage: totalSlots > 0 ? ((occupiedSlots / totalSlots) * 100).toFixed(1) : '0.0',
      // Booking stats
      total_bookings: Number(bookings.total_bookings) || 0,
      active_bookings: Number(bookings.active_bookings) || 0,
      completed_bookings: Number(bookings.completed_bookings) || 0,
      cancelled_bookings: Number(bookings.cancelled_bookings) || 0,
      // Revenue stats
      lifetime_revenue: Number(revenueRes.rows[0].lifetime_revenue) || 0,
      today_revenue: Number(todayRes.rows[0].today_revenue) || 0,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch statistics.' });
  }
});

// ✅ Zone occupancy report (per-zone slot breakdown)
router.get('/occupancy', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        z.name AS zone_name,
        COUNT(ps.id) AS total_slots,
        SUM(CASE WHEN ps.is_occupied = 1 THEN 1 ELSE 0 END) AS occupied_slots,
        SUM(CASE WHEN ps.is_occupied = 0 THEN 1 ELSE 0 END) AS available_slots
      FROM zones z
      JOIN parking_slots ps ON ps.zone_id = z.id
      GROUP BY z.id, z.name
      ORDER BY z.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ Revenue report (total lifetime revenue from payments)
router.get('/revenue', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(SUM(amount), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN date(paid_at) = date('now') THEN amount ELSE 0 END), 0) AS today_revenue
      FROM payments
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ Daily bookings report (last 7 days)
router.get('/daily-bookings', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        date(start_time) AS booking_date,
        COUNT(*) AS booking_count
      FROM bookings
      WHERE start_time >= date('now', '-6 days')
      GROUP BY date(start_time)
      ORDER BY booking_date ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
