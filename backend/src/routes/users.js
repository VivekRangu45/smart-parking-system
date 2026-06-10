const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const authorizeAdmin = require('../middleware/admin');

// All users routes require authentication
router.use(authenticate);

// ✅ Get current authenticated user details
router.get('/me', (req, res) => {
  res.json(req.user);
});

// ✅ Get all users (admin only)
router.get('/', authorizeAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, firebase_uid, email, role, created_at FROM users ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch users error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
