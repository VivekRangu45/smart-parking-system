const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');

// Initialize Firebase Admin SDK once
if (!admin.apps.length) {
  const serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
    });
  }
}

/**
 * Middleware: verifies Firebase ID token from Authorization header.
 * Attaches decoded user info to req.user (id, uid, email, role, full_name).
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const idToken = authHeader.split(' ')[1];
  let firebaseUser = null;

  // Support test tokens when E2E_TEST=true
  if (process.env.E2E_TEST === 'true' && idToken.startsWith('test_token')) {
    if (idToken === 'test_token_admin') {
      firebaseUser = { uid: 'test_uid_admin', email: 'admin_test@example.com' };
    } else if (idToken === 'test_token_user') {
      firebaseUser = { uid: 'test_uid_user', email: 'user_test@example.com' };
    } else if (idToken === 'test_token_user2') {
      firebaseUser = { uid: 'test_uid_user2', email: 'user2_test@example.com' };
    } else {
      firebaseUser = { uid: 'test_uid_999', email: 'e2e@example.com' };
    }
  } else {
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      firebaseUser = { uid: decoded.uid, email: decoded.email || '' };
    } catch (err) {
      console.error('Auth verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  try {
    // Find or create user in database
    let dbUserResult = await pool.query(
      'SELECT * FROM users WHERE firebase_uid = ?',
      [firebaseUser.uid]
    );
    let dbUser;

    if (dbUserResult.rows.length === 0) {
      // New user: create with role='user'
      dbUserResult = await pool.query(
        "INSERT INTO users (firebase_uid, email, role) VALUES (?, ?, 'user') RETURNING *",
        [firebaseUser.uid, firebaseUser.email]
      );
      if (dbUserResult.rows.length > 0) {
        dbUser = dbUserResult.rows[0];
      } else {
        const fallbackRes = await pool.query(
          'SELECT * FROM users WHERE firebase_uid = ?',
          [firebaseUser.uid]
        );
        dbUser = fallbackRes.rows[0];
      }
    } else {
      dbUser = dbUserResult.rows[0];
    }

    req.user = {
      id: dbUser.id,
      uid: dbUser.firebase_uid,
      email: dbUser.email,
      role: dbUser.role,
      full_name: dbUser.full_name || null,
    };
    next();
  } catch (dbErr) {
    console.error('Database user sync failed:', dbErr.message);
    return res.status(500).json({ error: 'Authentication database sync failed' });
  }
};

module.exports = authenticate;
