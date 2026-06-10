-- Migration: Add role to users, expires_at to bookings, and seed test accounts

-- Add role column to users (SQLite compatible ALTER)
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';

-- Add expires_at column to bookings
ALTER TABLE bookings ADD COLUMN expires_at TIMESTAMP;

-- Seed test admin account
INSERT OR IGNORE INTO users (id, firebase_uid, email, role) VALUES (99, 'test_uid_admin', 'admin_test@example.com', 'admin');

-- Seed test user accounts
INSERT OR IGNORE INTO users (id, firebase_uid, email, role) VALUES (100, 'test_uid_user', 'user_test@example.com', 'user');
INSERT OR IGNORE INTO users (id, firebase_uid, email, role) VALUES (101, 'test_uid_user2', 'user2_test@example.com', 'user');
