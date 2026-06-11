const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const DETECTION_DIR = path.resolve(__dirname, '../../detection');
const OUTPUT_PATH = path.join(DETECTION_DIR, 'output', 'latest.json');
const IMAGES_DIR = path.join(DETECTION_DIR, 'images');
const PYTHON = process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');

/**
 * Convert detector output [{slot_id: "a1", status: 0|1}] to occupancy map {A1: bool}.
 */
function convertDetectionToOccupancy(results) {
  const occupancy = {};
  if (!Array.isArray(results)) return occupancy;
  for (const item of results) {
    if (!item?.slot_id) continue;
    const label = String(item.slot_id).toUpperCase();
    occupancy[label] = Number(item.status) === 1;
  }
  return occupancy;
}

/**
 * Run Python slot detector on an image file.
 */
function runDetectionOnImage(imagePath) {
  return new Promise((resolve, reject) => {
    const script = path.join(DETECTION_DIR, 'run.py');
    const proc = spawn(PYTHON, [script, imagePath], {
      cwd: DETECTION_DIR,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    proc.on('error', (err) => reject(new Error(`Python not available: ${err.message}`)));

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr.trim() || 'Detection process failed'));
      }
      try {
        const lines = stdout.trim().split('\n');
        const jsonLine = lines[lines.length - 1];
        resolve(JSON.parse(jsonLine));
      } catch {
        reject(new Error('Invalid detection output from Python'));
      }
    });
  });
}

/**
 * Read latest.json from detection output directory.
 */
function readLatestDetection() {
  if (!fs.existsSync(OUTPUT_PATH)) return null;
  const raw = fs.readFileSync(OUTPUT_PATH, 'utf8');
  return JSON.parse(raw);
}

/**
 * Build admin-facing detection status from results array.
 */
function getDetectionStats(results, timestamp) {
  const slots = Array.isArray(results) ? results : [];
  const occupied = slots.filter((s) => Number(s.status) === 1).length;
  const ts = timestamp || (fs.existsSync(OUTPUT_PATH)
    ? fs.statSync(OUTPUT_PATH).mtime.toISOString()
    : null);

  return {
    timestamp: ts,
    total_slots: slots.length,
    occupied_count: occupied,
    available_count: slots.length - occupied,
    slots,
  };
}

/**
 * Persist detection run metadata and return stats.
 */
async function recordDetectionRun(results, source = 'camera', imagePath = null) {
  const stats = getDetectionStats(results);
  await pool.query(
    `INSERT INTO detection_runs (total_slots, occupied_count, available_count, source, image_path)
     VALUES (?, ?, ?, ?, ?)`,
    [stats.total_slots, stats.occupied_count, stats.available_count, source, imagePath]
  );
  return stats;
}

/**
 * Get the most recent detection run from DB.
 */
async function getLatestDetectionRun() {
  const result = await pool.query(
    'SELECT * FROM detection_runs ORDER BY timestamp DESC LIMIT 1'
  );
  return result.rows[0] || null;
}

function ensureDetectionDirs() {
  fs.mkdirSync(path.join(DETECTION_DIR, 'output'), { recursive: true });
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

function saveUploadedImage(buffer, originalName) {
  ensureDetectionDirs();
  const ext = path.extname(originalName || '') || '.jpg';
  const filename = `upload_${Date.now()}${ext}`;
  const dest = path.join(IMAGES_DIR, filename);
  fs.writeFileSync(dest, buffer);
  return dest;
}

module.exports = {
  convertDetectionToOccupancy,
  runDetectionOnImage,
  readLatestDetection,
  getDetectionStats,
  recordDetectionRun,
  getLatestDetectionRun,
  saveUploadedImage,
  ensureDetectionDirs,
  OUTPUT_PATH,
  DETECTION_DIR,
  IMAGES_DIR,
};
