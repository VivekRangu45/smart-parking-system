const express = require('express');
const router = express.Router();
const qr = require('qr-image');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const authorizeAdmin = require('../middleware/admin');
const { BOOKING_AMOUNT, BOOKING_HOURS } = require('../config/pricing');

router.use(authenticate);

// Create booking (single-active-booking + atomic slot claim)
router.post('/', async (req, res) => {
  const user_id = req.user.id;
  const { zone_id } = req.body;

  if (!zone_id) {
    return res.status(400).json({ error: 'zone_id is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const activeCheck = await client.query(
      "SELECT id FROM bookings WHERE user_id = ? AND status = 'active'",
      [user_id]
    );
    if (activeCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'You already have an active booking. Complete or wait for expiry before creating another booking.',
      });
    }

    const slotResult = await client.query(
      "SELECT id FROM parking_slots WHERE zone_id = ? AND is_occupied = 0 LIMIT 1",
      [zone_id]
    );
    if (slotResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No available slots in this zone.' });
    }
    const slot_id = slotResult.rows[0].id;

    const claimResult = await client.query(
      'UPDATE parking_slots SET is_occupied = 1 WHERE id = ? AND is_occupied = 0 RETURNING id',
      [slot_id]
    );
    if (claimResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Slot was just taken. Please try again.' });
    }

    const expiresAt = new Date(Date.now() + BOOKING_HOURS * 60 * 60 * 1000).toISOString();
    const startTime = new Date().toISOString();

    const bookingResult = await client.query(
      "INSERT INTO bookings (user_id, zone_id, slot_id, start_time, expires_at) VALUES (?, ?, ?, ?, ?) RETURNING *",
      [user_id, zone_id, slot_id, startTime, expiresAt]
    );

    const booking = bookingResult.rows[0];

    const qrPayload = JSON.stringify({
      bookingId: booking.id,
      userId: user_id,
      slotId: slot_id,
      zoneId: zone_id,
      startTime,
      expiresAt,
    });
    const qrBuffer = qr.imageSync(qrPayload, { type: 'png' });
    const qrBase64 = qrBuffer.toString('base64');

    await client.query('UPDATE bookings SET qr_code = ? WHERE id = ?', [qrBase64, booking.id]);

    await client.query('COMMIT');

    try {
      await pool.query(
        'INSERT INTO payments (booking_id, amount) VALUES (?, ?)',
        [booking.id, BOOKING_AMOUNT]
      );
    } catch (payErr) {
      console.error('Payment record error (non-fatal):', payErr.message);
    }

    await pool.query(
      'INSERT OR REPLACE INTO occupancy (slot_id, occupied, last_update) VALUES (?, 1, ?)',
      [slot_id, startTime]
    ).catch(() => {});

    const io = req.app.get('io');
    if (io) {
      io.emit('booking_created', { ...booking, qr_code: qrBase64 });
      io.emit('slot_update', { slot_id, status: true });
    }

    res.status(201).json({ booking: { ...booking, qr_code: qrBase64 } });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Booking creation error:', err);
    res.status(500).json({ error: 'Booking failed due to a server error.' });
  } finally {
    client.release();
  }
});

router.put('/cancel/:id', async (req, res) => {
  const booking_id = req.params.id;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const bookingResult = await pool.query('SELECT * FROM bookings WHERE id = ?', [booking_id]);
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const booking = bookingResult.rows[0];

    if (role !== 'admin' && booking.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied. You can only cancel your own bookings.' });
    }

    if (booking.status !== 'active') {
      return res.status(400).json({ error: 'Only active bookings can be cancelled.' });
    }

    const slot_id = booking.slot_id;
    await pool.query(
      "UPDATE bookings SET status = 'cancelled', end_time = CURRENT_TIMESTAMP WHERE id = ?",
      [booking_id]
    );
    await pool.query('UPDATE parking_slots SET is_occupied = 0 WHERE id = ?', [slot_id]);
    await pool.query(
      'INSERT OR REPLACE INTO occupancy (slot_id, occupied, last_update) VALUES (?, 0, CURRENT_TIMESTAMP)',
      [slot_id]
    ).catch(() => {});

    const io = req.app.get('io');
    if (io) {
      io.emit('slot_update', { slot_id, status: false });
      io.emit('bookings_updated');
    }

    res.status(200).json({ message: 'Booking cancelled successfully.' });
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ error: 'Failed to cancel booking.' });
  }
});

router.get('/active/me', async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      "SELECT * FROM bookings WHERE user_id = ? AND status = 'active' ORDER BY start_time DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/active/:user_id', async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      "SELECT * FROM bookings WHERE user_id = ? AND status = 'active' ORDER BY start_time DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/history/me', async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT * FROM bookings WHERE user_id = ? ORDER BY start_time DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/history/:user_id', async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT * FROM bookings WHERE user_id = ? ORDER BY start_time DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/all', authorizeAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, u.email AS user_email, u.full_name AS user_name
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       ORDER BY b.start_time DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/cleanup', authorizeAdmin, async (req, res) => {
  const { runCleanup } = require('../services/cleanupService');
  const io = req.app.get('io');
  try {
    const count = await runCleanup(io);
    res.json({ message: 'Cleanup complete', expired_count: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

module.exports = router;
