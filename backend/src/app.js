const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]:', err);
});

const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'sqlite' });
});

const bookingRoutes = require('./routes/bookings');
const slotRoutes = require('./routes/slots');
const analyticsRoutes = require('./routes/analytics');
const zoneRoutes = require('./routes/zones');
const userRoutes = require('./routes/users');
const occupancyRoutes = require('./routes/occupancy');
const detectionRoutes = require('./routes/detection');
const paymentRoutes = require('./routes/payment');

app.use('/api/bookings', bookingRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/users', userRoutes);
app.use('/api/occupancy', occupancyRoutes);
app.use('/api/detection', detectionRoutes);
app.use('/api/payments', paymentRoutes);

app.use((err, req, res, next) => {
  console.error('[API Error]:', err.message);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;

if (process.env.NODE_ENV !== 'test') {
  const http = require('http');
  const fs = require('fs');
  const { Server } = require('socket.io');
  require('./middleware/auth');
  const socketHandler = require('./sockets');
  const { createSocketAuthMiddleware } = require('./sockets');
  const { startCleanupJob } = require('./services/cleanupService');
  const {
    readLatestDetection,
    OUTPUT_PATH,
    ensureDetectionDirs,
  } = require('./services/parkingDetectionService');
  const { processDetectionResults } = require('./routes/detection');

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use(createSocketAuthMiddleware());
  socketHandler(io);
  app.set('io', io);

  startCleanupJob(io);
  ensureDetectionDirs();

  let lastDetectionMtime = 0;
  const pollInterval = Number(process.env.DETECTION_POLL_MS) || 5000;

  setInterval(async () => {
    try {
      if (!fs.existsSync(OUTPUT_PATH)) return;

      const stat = fs.statSync(OUTPUT_PATH);
      if (stat.mtimeMs <= lastDetectionMtime) return;

      lastDetectionMtime = stat.mtimeMs;
      const results = readLatestDetection();
      if (!results || !Array.isArray(results)) return;

      await processDetectionResults(results, io, 'poll', null);
    } catch (err) {
      console.error('[Detection Poll Error]:', err.message);
    }
  }, pollInterval);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
}
