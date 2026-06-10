const express = require('express');
const router = express.Router();
const multer = require('multer');
const pool = require('../config/db');
const { detectImage } = require('../services/detectionService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

/**
 * POST /api/detection
 * Accepts multipart/form-data with field "image".
 * Forwards to the Python YOLO service, logs the result.
 */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    let vehicle_type, slot_id;

    if (req.file) {
      // Image-based detection via external service
      const result = await detectImage(req.file.buffer, req.file.originalname);
      vehicle_type = result.vehicle_type;
      slot_id = result.slot_id;
    } else if (req.body.vehicle_type) {
      // Fallback: manual JSON body (for backward compatibility)
      vehicle_type = req.body.vehicle_type;
      slot_id = req.body.slot_id || null;
    } else {
      return res.status(400).json({ error: 'Image file or vehicle_type required' });
    }

    await pool.query(
      'INSERT INTO detection_logs (vehicle_type, timestamp) VALUES (?, CURRENT_TIMESTAMP)',
      [vehicle_type]
    );

    res.status(200).json({ vehicle_type, slot_id, message: 'Detection logged successfully' });
  } catch (err) {
    console.error('Detection error:', err.message);
    res.status(500).json({ error: 'Detection service failed' });
  }
});

module.exports = router;
