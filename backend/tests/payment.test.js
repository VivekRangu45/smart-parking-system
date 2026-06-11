process.env.E2E_TEST = 'true';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { BOOKING_AMOUNT } = require('../src/config/pricing');

describe('Payment API', () => {
  let testUserId;
  let testBookingId;

  beforeAll(async () => {
    await pool.query(`
      INSERT OR IGNORE INTO users (id, firebase_uid, email, role)
      VALUES (100, 'test_uid_user', 'user_test@example.com', 'user')
    `);
    const userRes = await pool.query(
      "SELECT id FROM users WHERE firebase_uid = 'test_uid_user'"
    );
    testUserId = userRes.rows[0].id;

    const bookingRes = await pool.query(
      `INSERT INTO bookings (user_id, zone_id, slot_id, status)
       VALUES (?, 1, 2, 'completed') RETURNING id`,
      [testUserId]
    );
    testBookingId = bookingRes.rows[0].id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should create a payment', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', 'Bearer test_token_user')
      .send({ booking_id: testBookingId, amount: BOOKING_AMOUNT });

    if (res.statusCode === 409) {
      expect(res.body.error).toContain('already recorded');
    } else {
      expect(res.statusCode).toBe(201);
      expect(res.body.payment).toHaveProperty('id');
    }
  });
});
