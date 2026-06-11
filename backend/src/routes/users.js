const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const authorizeAdmin = require('../middleware/admin');

router.use(authenticate);

// ✅ Get current authenticated user profile
router.get('/me', (req, res) => {
  res.json({
    id: req.user.id,
    uid: req.user.uid,
    email: req.user.email,
    role: req.user.role,
    full_name: req.user.full_name || null,
  });
});

// ✅ Update full name (max 255 chars)
router.patch('/me', async (req, res) => {
  const { full_name } = req.body;

  if (!full_name || typeof full_name !== 'string') {
    return res.status(400).json({ error: 'full_name is required.' });
  }
  if (full_name.trim().length === 0) {
    return res.status(400).json({ error: 'full_name cannot be empty.' });
  }
  if (full_name.length > 255) {
    return res.status(400).json({ error: 'full_name must be 255 characters or fewer.' });
  }

  try {
    await pool.query(
      'UPDATE users SET full_name = ? WHERE id = ?',
      [full_name.trim(), req.user.id]
    );
    res.json({ message: 'Profile updated successfully.', full_name: full_name.trim() });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ✅ Get all users (admin only)
router.get('/', authorizeAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, firebase_uid, email, full_name, role, created_at FROM users ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch users error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
