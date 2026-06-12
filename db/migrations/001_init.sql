-- Smart Parking initial schema (SQLite compatible)

CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS zones (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS parking_slots (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id     INT REFERENCES zones(id) ON DELETE CASCADE,
    slot_number INT NOT NULL,
    is_occupied BOOLEAN DEFAULT FALSE,
    UNIQUE (zone_id, slot_number)
);

CREATE TABLE IF NOT EXISTS bookings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INT REFERENCES users(id) ON DELETE SET NULL,
    zone_id    INT REFERENCES zones(id) ON DELETE SET NULL,
    slot_id    INT REFERENCES parking_slots(id) ON DELETE SET NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time   TIMESTAMP,
    status     VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','cancelled','completed'))
);

CREATE TABLE IF NOT EXISTS occupancy_logs (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_id   INT REFERENCES parking_slots(id) ON DELETE CASCADE,
    occupied  BOOLEAN,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id  INT REFERENCES bookings(id) ON DELETE CASCADE,
    amount      NUMERIC(10,2) NOT NULL,
    paid_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS detection_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_type VARCHAR(50) NOT NULL,
    timestamp    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed zones
INSERT OR IGNORE INTO zones (name) VALUES ('A'), ('B'), ('C');

-- Seed slots (10 per zone)
INSERT OR IGNORE INTO parking_slots (zone_id, slot_number) VALUES 
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9), (1, 10),
(2, 1), (2, 2), (2, 3), (2, 4), (2, 5), (2, 6), (2, 7), (2, 8), (2, 9), (2, 10),
(3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (3, 7), (3, 8), (3, 9), (3, 10);
