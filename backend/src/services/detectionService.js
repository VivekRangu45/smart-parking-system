const http = require('http');
const https = require('https');
const { URL } = require('url');

const DETECTION_URL = process.env.DETECTION_SERVICE_URL || 'http://localhost:5001';

/**
 * Sends an image buffer to the Python Flask detection service.
 * @param {Buffer} imageBuffer - Raw image bytes
 * @param {string} filename - Original filename
 * @returns {Promise<{vehicle_type: string, slot_id: number}>}
 */
function detectImage(imageBuffer, filename = 'image.jpg') {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Date.now().toString(16);
    const url = new URL('/detect', DETECTION_URL);

    // Build multipart body manually to avoid extra dependency
    const header = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="image"; filename="${filename}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([header, imageBuffer, footer]);

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
      timeout: 15000,
    };

    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          resolve(data);
        } catch (e) {
          reject(new Error('Invalid response from detection service'));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Detection service timed out'));
    });
    req.write(body);
    req.end();
  });
}

module.exports = { detectImage };
