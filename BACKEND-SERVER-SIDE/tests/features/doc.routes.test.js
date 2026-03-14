const express = require('express');
const request = require('supertest');

const docRouter = require('../../routes/doc');
const errorHandler = require('../../middleware/errorHandler');

const createApp = () => {
  const app = express();
  app.use('/api/doc', docRouter);
  app.use(errorHandler);
  return app;
};

describe('Doc routes', () => {
  test('GET /api/doc returns API docs metadata', async () => {
    const app = createApp();
    const response = await request(app).get('/api/doc');

    expect(response.status).toBe(200);
    expect(response.body.title).toContain('Smart Dental AI');
    expect(response.body.title).toContain('API Reference');
    expect(response.body.groupedEndpoints).toBeDefined();
    expect(response.body.groupedEndpoints.Auth).toBeDefined();
  });
});
