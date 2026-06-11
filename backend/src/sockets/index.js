const admin = require('firebase-admin');

/**
 * Verify Socket.IO handshake token and attach user info to socket.
 */
function createSocketAuthMiddleware() {
  return async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      if (process.env.E2E_TEST === 'true' && token.startsWith('test_token')) {
        socket.user = { uid: 'test_uid', role: token.includes('admin') ? 'admin' : 'user' };
        return next();
      }

      const decoded = await admin.auth().verifyIdToken(token);
      socket.user = { uid: decoded.uid, email: decoded.email || '' };
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  };
}

function socketHandler(io) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id, socket.user?.uid || 'unknown');

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}

module.exports = socketHandler;
module.exports.createSocketAuthMiddleware = createSocketAuthMiddleware;
