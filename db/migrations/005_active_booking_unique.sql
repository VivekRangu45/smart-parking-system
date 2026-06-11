-- Resolve duplicate active bookings before enforcing uniqueness
UPDATE bookings
SET status = 'cancelled', end_time = CURRENT_TIMESTAMP
WHERE status = 'active'
  AND id NOT IN (
    SELECT MAX(id)
    FROM bookings
    WHERE status = 'active'
    GROUP BY user_id
  );

-- Ensure a user can have only one active booking
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_booking ON bookings (user_id) WHERE status = 'active';
