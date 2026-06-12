-- Occupancy table for external occupancy data
CREATE TABLE IF NOT EXISTS occupancy (
    slot_id INTEGER PRIMARY KEY,
    occupied BOOLEAN NOT NULL,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (slot_id) REFERENCES parking_slots(id) ON DELETE CASCADE
);
