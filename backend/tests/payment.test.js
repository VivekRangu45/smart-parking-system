const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/db");

describe("Payment API", () => {
  beforeAll(async () => {
    // Ensure booking exists
    await pool.query(`
      INSERT INTO users (id, firebase_uid, email) 
      VALUES (1, 'testuid', 'test@test.com') 
      ON CONFLICT (id) DO NOTHING
    `);
    await pool.query(`
      INSERT INTO bookings (id, user_id, zone_id, slot_id, status)
      VALUES (1, 1, 1, 1, 'active')
      ON CONFLICT (id) DO NOTHING
    `);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("should create a payment", async () => {
    const res = await request(app)
      .post("/api/payments")
      .send({ booking_id: 1, amount: 50.00 });
      
    expect(res.statusCode).toBe(201);
    expect(res.body.payment).toHaveProperty("id");
  });
});
