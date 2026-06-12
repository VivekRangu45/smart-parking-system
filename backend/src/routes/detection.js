const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const authorizeAdmin = require('../middleware/admin');
const { applyOccupancyData } = require('./occupancy');
const {
  convertDetectionToOccupancy,
  runDetectionOnImage,
  readLatestDetection,
  getDetectionStats,
  recordDetectionRun,
  getLatestDetectionRun,
  saveUploadedImage,
  OUTPUT_PATH,
} = require('../services/parkingDetectionService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(authenticate);
router.use(authorizeAdmin);

/**
 * Process detection results: update occupancy + record run + emit sockets.
 */
async function processDetectionResults(results, io, source, imagePath) {
  const occupancy = convertDetectionToOccupancy(results);
  const slotsUpdated = await applyOccupancyData(occupancy, io);
  const stats = await recordDetectionRun(results, source, imagePath);

  if (io) {
    io.emit('detection_updated', stats);
  }

  return { stats, slotsUpdated, occupancy };
}

/**
 * GET /api/detection/status — Latest detection run summary
 */
router.get('/status', async (req, res) => {
  try {
    let results = null;
    let fileTimestamp = null;

    if (fs.existsSync(OUTPUT_PATH)) {
      results = readLatestDetection();
      fileTimestamp = fs.statSync(OUTPUT_PATH).mtime.toISOString();
    }

    const dbRun = await getLatestDetectionRun();
    const stats = results
      ? getDetectionStats(results, fileTimestamp)
      : {
          timestamp: dbRun?.timestamp || null,
          total_slots: dbRun?.total_slots || 0,
          occupied_count: dbRun?.occupied_count || 0,
          available_count: dbRun?.available_count || 0,
          slots: [],
        };

    res.json({
      ...stats,
      last_db_run: dbRun,
      output_file: OUTPUT_PATH,
    });
  } catch (err) {
    console.error('Detection status error:', err.message);
    res.status(500).json({ error: 'Failed to fetch detection status.' });
  }
});

/**
 * POST /api/detection/apply — Apply latest.json to occupancy tables
 */
router.post('/apply', async (req, res) => {
  try {
    const results = readLatestDetection();
    if (!results) {
      return res.status(404).json({ error: 'No detection output found. Run detection first.' });
    }

    const io = req.app.get('io');
    const { stats, slotsUpdated } = await processDetectionResults(
      results,
      io,
      'file-sync',
      null
    );

    res.json({ message: 'Detection applied.', slots_updated: slotsUpdated, ...stats });
  } catch (err) {
    console.error('Detection apply error:', err.message);
    res.status(500).json({ error: 'Failed to apply detection results.' });
  }
});

/**
 * POST /api/detection — Upload image, run detector, update occupancy
 */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file required (field: image).' });
    }

    const imagePath = saveUploadedImage(req.file.buffer, req.file.originalname);
    const results = await runDetectionOnImage(imagePath);
    const io = req.app.get('io');
    const { stats, slotsUpdated } = await processDetectionResults(
      results,
      io,
      'upload',
      imagePath
    );

    res.status(200).json({
      message: 'Detection completed and occupancy updated.',
      slots_updated: slotsUpdated,
      ...stats,
    });
  } catch (err) {
    console.error('Detection error:', err.message);
    res.status(500).json({ error: err.message || 'Detection failed.' });
  }
});

/**
 * GET /api/detection/history — Recent detection runs
 */
router.get('/history', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM detection_runs ORDER BY timestamp DESC LIMIT 20'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Detection history error:', err.message);
    res.status(500).json({ error: 'Failed to fetch detection history.' });
  }
});

module.exports = router;
module.exports.processDetectionResults = processDetectionResults;
