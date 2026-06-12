-- Track detection runs for admin dashboard
CREATE TABLE IF NOT EXISTS detection_runs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_slots     INTEGER NOT NULL DEFAULT 0,
    occupied_count  INTEGER NOT NULL DEFAULT 0,
    available_count INTEGER NOT NULL DEFAULT 0,
    source          VARCHAR(50) DEFAULT 'camera',
    image_path      TEXT
);
