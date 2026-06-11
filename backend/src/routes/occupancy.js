const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const authorizeAdmin = require('../middleware/admin');

/**
 * Processes occupancy JSON payload (slotLabel -> boolean).
 * e.g. { "A1": true, "A2": false, "B3": true }
 */
async function applyOccupancyData(data, io) {
  const now = new Date().toISOString();
  let updatedCount = 0;

  const slotsRes = await pool.query(`
    SELECT ps.id, ps.slot_number, z.name AS zone_name
    FROM parking_slots ps
    JOIN zones z ON z.id = ps.zone_id
  `);

  const activeBookingsRes = await pool.query("SELECT slot_id FROM bookings WHERE status = 'active'");
  const activeSlotIds = new Set(activeBookingsRes.rows.map((r) => Number(r.slot_id)));

  const slotMap = {};
  for (const slot of slotsRes.rows) {
    const label = `${slot.zone_name}${slot.slot_number}`;
    slotMap[label] = slot;
  }

  const updatedSlotIds = [];

  for (const [label, isOccupied] of Object.entries(data)) {
    const slot = slotMap[label];
    if (!slot) {
      console.warn(`[Occupancy] Unknown slot label: ${label}`);
      continue;
    }

    let occupiedVal = isOccupied ? 1 : 0;

    if (activeSlotIds.has(Number(slot.id))) {
      occupiedVal = 1;
    }

    await pool.query(
      'UPDATE parking_slots SET is_occupied = ? WHERE id = ?',
      [occupiedVal, slot.id]
    );
    await pool.query(
      'INSERT OR REPLACE INTO occupancy (slot_id, occupied, last_update) VALUES (?, ?, ?)',
      [slot.id, occupiedVal, now]
    );

    updatedSlotIds.push({ slot_id: slot.id, status: occupiedVal === 1 });
    updatedCount++;
  }

  if (io) {
    for (const upd of updatedSlotIds) {
      io.emit('slot_update', upd);
    }
    if (updatedSlotIds.length > 0) {
      io.emit('occupancy_updated', { timestamp: now });
    }
  }

  return updatedCount;
}

router.post('/', authenticate, authorizeAdmin, async (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid occupancy JSON payload.' });
  }
  try {
    const io = req.app.get('io');
    const count = await applyOccupancyData(data, io);
    res.json({ message: 'Occupancy updated.', slots_updated: count });
  } catch (err) {
    console.error('Occupancy update error:', err);
    res.status(500).json({ error: 'Failed to update occupancy.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ps.id, ps.zone_id, ps.slot_number, ps.is_occupied,
             z.name AS zone_name,
             o.last_update
      FROM parking_slots ps
      JOIN zones z ON z.id = ps.zone_id
      LEFT JOIN occupancy o ON o.slot_id = ps.id
      ORDER BY z.name, ps.slot_number
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get occupancy error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
module.exports.applyOccupancyData = applyOccupancyData;
