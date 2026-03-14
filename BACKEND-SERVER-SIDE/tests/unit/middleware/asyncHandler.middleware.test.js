const express = require('express');
const request = require('supertest');

const asyncHandler = require('../../../middleware/asyncHandler');
const errorHandler = require('../../../middleware/errorHandler');

describe('asyncHandler middleware', () => {
  test('forwards async errors to error handler', async () => {
    const app = express();

    app.get('/boom', asyncHandler(async () => {
      throw new Error('failed async');
    }));

    app.use(errorHandler);

    const response = await request(app).get('/boom');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('failed async');
  });
});
