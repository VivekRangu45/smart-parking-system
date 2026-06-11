-- Migration 006: Add full_name to users, qr_code to bookings, occupancy table, active booking unique index

-- Add full_name column (max 255 chars)
ALTER TABLE users ADD COLUMN full_name VARCHAR(255);

-- Add qr_code column to bookings (base64 PNG)
ALTER TABLE bookings ADD COLUMN qr_code TEXT;

-- Create occupancy tracking table (from external JSON source)
CREATE TABLE IF NOT EXISTS occupancy (
    slot_id    INTEGER PRIMARY KEY,
    occupied   INTEGER NOT NULL DEFAULT 0,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (slot_id) REFERENCES parking_slots(id) ON DELETE CASCADE
);

-- Seed initial occupancy rows for all 30 slots (unoccupied by default)
INSERT OR IGNORE INTO occupancy (slot_id, occupied)
SELECT id, 0 FROM parking_slots;
