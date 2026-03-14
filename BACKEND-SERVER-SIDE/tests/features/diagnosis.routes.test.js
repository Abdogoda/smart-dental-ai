process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const express = require('express');
const request = require('supertest');

jest.mock('../../middleware/auth', () => (req, res, next) => {
  req.patient = { id: 'patient-1' };
  next();
});

jest.mock('../../services/diagnosisService', () => ({
  runSingleDiagnosis: jest.fn(),
  runBatchDiagnosis: jest.fn(),
  getHistory: jest.fn(),
  getDiagnosisById: jest.fn(),
  diagnosisUpload: {
    single: jest.fn(() => (req, res, next) => next()),
    array: jest.fn(() => (req, res, next) => next()),
  },
}));

const diagnosisRouter = require('../../routes/diagnosis');
const diagnosisService = require('../../services/diagnosisService');
const errorHandler = require('../../middleware/errorHandler');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/diagnosis', diagnosisRouter);
  app.use(errorHandler);
  return app;
};

describe('Diagnosis routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/diagnosis', async () => {
    diagnosisService.runSingleDiagnosis.mockResolvedValue({
      message: 'Diagnosis completed',
      diagnosis: { _id: 'd1' },
    });

    const app = createApp();
    const response = await request(app)
      .post('/api/diagnosis')
      .attach('image', Buffer.from('fake-image'), 'tooth.png');

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Diagnosis completed');
    expect(diagnosisService.runSingleDiagnosis).toHaveBeenCalledWith('patient-1', undefined);
  });

  test('POST /api/diagnosis/batch', async () => {
    diagnosisService.runBatchDiagnosis.mockResolvedValue({
      message: 'Batch diagnosis completed',
      count: 2,
      diagnoses: [{ _id: 'd1' }, { _id: 'd2' }],
    });

    const app = createApp();
    const response = await request(app)
      .post('/api/diagnosis/batch')
      .attach('images', Buffer.from('img-1'), 'one.png')
      .attach('images', Buffer.from('img-2'), 'two.png');

    expect(response.status).toBe(201);
    expect(response.body.count).toBe(2);
    expect(diagnosisService.runBatchDiagnosis).toHaveBeenCalledWith('patient-1', undefined);
  });

  test('GET /api/diagnosis/history', async () => {
    diagnosisService.getHistory.mockResolvedValue({ count: 1, diagnoses: [{ _id: 'd1' }] });

    const app = createApp();
    const response = await request(app).get('/api/diagnosis/history');

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(diagnosisService.getHistory).toHaveBeenCalledWith('patient-1');
  });

  test('GET /api/diagnosis/:id', async () => {
    diagnosisService.getDiagnosisById.mockResolvedValue({ diagnosis: { _id: 'd1' } });

    const app = createApp();
    const response = await request(app).get('/api/diagnosis/d1');

    expect(response.status).toBe(200);
    expect(response.body.diagnosis._id).toBe('d1');
    expect(diagnosisService.getDiagnosisById).toHaveBeenCalledWith('patient-1', 'd1');
  });
});
