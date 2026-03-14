const express = require('express');
const request = require('supertest');

const errorHandler = require('../../../middleware/errorHandler');
const ServiceError = require('../../../utils/ServiceError');

describe('errorHandler middleware', () => {
  test('uses status code from ServiceError', async () => {
    const app = express();

    app.get('/bad-request', (req, res, next) => {
      next(new ServiceError('Bad input', 400));
    });

    app.use(errorHandler);

    const response = await request(app).get('/bad-request');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Bad input');
  });

  test('defaults to 500 for generic errors', async () => {
    const app = express();

    app.get('/server-error', (req, res, next) => {
      next(new Error('Unexpected')); 
    });

    app.use(errorHandler);

    const response = await request(app).get('/server-error');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Unexpected');
  });
});
