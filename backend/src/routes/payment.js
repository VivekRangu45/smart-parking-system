const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const { BOOKING_AMOUNT } = require('../config/pricing');

router.use(authenticate);

// Create payment — validates amount matches booking pricing
router.post('/', async (req, res) => {
  const { booking_id, amount } = req.body;

  if (!booking_id || amount === undefined) {
    return res.status(400).json({ error: 'booking_id and amount are required' });
  }

  try {
    const bookingCheck = await pool.query('SELECT * FROM bookings WHERE id = ?', [booking_id]);
    if (bookingCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Booking not found' });
    }

    const booking = bookingCheck.rows[0];
    if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (Number(amount) !== BOOKING_AMOUNT) {
      return res.status(400).json({
        error: `Invalid payment amount. Expected ₹${BOOKING_AMOUNT}.`,
      });
    }

    const existing = await pool.query('SELECT id FROM payments WHERE booking_id = ?', [booking_id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Payment already recorded for this booking.' });
    }

    const result = await pool.query(
      'INSERT INTO payments (booking_id, amount) VALUES (?, ?) RETURNING *',
      [booking_id, BOOKING_AMOUNT]
    );

    res.status(201).json({ payment: result.rows[0] });
  } catch (err) {
    console.error('Payment error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get payments by booking — owner or admin only
router.get('/booking/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const bookingCheck = await pool.query('SELECT user_id FROM bookings WHERE id = ?', [id]);
    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (bookingCheck.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const result = await pool.query('SELECT * FROM payments WHERE booking_id = ?', [id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get payments error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
