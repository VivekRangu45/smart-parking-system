const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS – allow configured frontend origin and all in dev
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
const detectionRoutes = require('./routes/detection');
const bookingRoutes = require('./routes/bookings');
const slotRoutes = require('./routes/slots');
const paymentRoutes = require('./routes/payment');
const analyticsRoutes = require('./routes/analytics');
const zoneRoutes = require('./routes/zones');
const userRoutes = require('./routes/users');

app.use('/api/detection', detectionRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/users', userRoutes);

// Export app for testing
module.exports = app;

// --- Only start server if not in test mode ---
if (process.env.NODE_ENV !== 'test') {
  const http = require('http');
  const { Server } = require('socket.io');
  const socketHandler = require('./sockets');

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  socketHandler(io);
  app.set('io', io);

  // Start periodic background bookings cleanup
  const { startCleanupJob } = require('./services/cleanupService');
  startCleanupJob(io);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
}
