const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const authMiddleware = require('../../../middleware/auth');

describe('auth middleware', () => {
  const secret = 'test-secret';

  beforeAll(() => {
    process.env.JWT_SECRET = secret;
  });

  const createApp = () => {
    const app = express();
    app.get('/private', authMiddleware, (req, res) => {
      res.json({ patient: req.patient });
    });
    return app;
  };

  test('returns 401 when no token is provided', async () => {
    const app = createApp();
    const response = await request(app).get('/private');

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('No token provided');
  });

  test('returns 401 for invalid token', async () => {
    const app = createApp();
    const response = await request(app)
      .get('/private')
      .set('Authorization', 'Bearer invalid.token.value');

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Invalid or expired token');
  });

  test('allows request with valid token', async () => {
    const token = jwt.sign({ id: 'patient-1', email: 'user@mail.com' }, secret, { expiresIn: '1h' });
    const app = createApp();

    const response = await request(app)
      .get('/private')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.patient.id).toBe('patient-1');
  });
});
