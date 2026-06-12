const pool = require('../config/db');

/**
 * Executes a transactional scan and cleanup of bookings that have expired.
 * Marks bookings as 'completed' and marks corresponding parking slots as unoccupied.
 */
const runCleanup = async (io) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    const now = new Date().toISOString();
    
    // Find all active bookings whose expires_at has passed
    const expiredResult = await client.query(
      "SELECT id, slot_id FROM bookings WHERE status = 'active' AND expires_at <= ?",
      [now]
    );
    
    const count = expiredResult.rows.length;
    if (count > 0) {
      const expiredIds = expiredResult.rows.map(b => b.id);
      const slotIds = expiredResult.rows.map(b => b.slot_id);
      
      // 1. Mark bookings completed
      const bookingPlaceholders = expiredIds.map(() => "?").join(",");
      await client.query(
        `UPDATE bookings SET status = 'completed', end_time = ? WHERE id IN (${bookingPlaceholders})`,
        [now, ...expiredIds]
      );
      
      // 2. Mark slots unoccupied (false)
      const slotPlaceholders = slotIds.map(() => "?").join(",");
      await client.query(
        `UPDATE parking_slots SET is_occupied = false WHERE id IN (${slotPlaceholders})`,
        slotIds
      );
      
      await client.query("COMMIT");
      console.log(`[Cleanup Service] Auto-completed ${count} expired bookings and released slots.`);
      
      // 3. Broadcast updates via socket
      if (io) {
        slotIds.forEach(slotId => {
          io.emit("slot_update", { slot_id: slotId, status: false });
        });
        io.emit("bookings_updated");
      }
    } else {
      await client.query("COMMIT");
    }
    return count;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Cleanup Service] Error during expired bookings cleanup:", err);
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Starts the periodic background cleanup job scheduler.
 */
const startCleanupJob = (io) => {
  const intervalMs = 10000; // 10 seconds check interval
  setInterval(async () => {
    try {
      await runCleanup(io);
    } catch (err) {
      // Ignored: already logged inside runCleanup
    }
  }, intervalMs);
  console.log(`[Cleanup Service] Background scheduler active (checking every ${intervalMs / 1000}s)`);
};

module.exports = {
  runCleanup,
  startCleanupJob
};
