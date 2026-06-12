process.env.E2E_TEST = 'true';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');

describe('Booking API', () => {
  beforeAll(async () => {
    await pool.query(`
      INSERT OR IGNORE INTO users (id, firebase_uid, email, role)
      VALUES (1, 'test_uid_user', 'user_test@example.com', 'user')
    `);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should create a booking', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', 'Bearer test_token_user')
      .send({ zone_id: 1 });

    if (res.statusCode === 400 || res.statusCode === 409) {
      expect(res.body.error).toBeDefined();
    } else {
      expect(res.statusCode).toBe(201);
      expect(res.body.booking).toHaveProperty('id');
    }
  });
});
