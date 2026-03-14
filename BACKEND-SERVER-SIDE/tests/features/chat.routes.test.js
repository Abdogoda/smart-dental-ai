process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const express = require('express');
const request = require('supertest');

jest.mock('../../middleware/auth', () => (req, res, next) => {
  req.patient = { id: 'patient-1' };
  next();
});

jest.mock('../../services/chatService', () => ({
  getAllChatsForPatient: jest.fn(),
  askQuestion: jest.fn(),
  getMessagesByDiagnosis: jest.fn(),
}));

const chatRouter = require('../../routes/chat');
const chatService = require('../../services/chatService');
const errorHandler = require('../../middleware/errorHandler');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/chat', chatRouter);
  app.use(errorHandler);
  return app;
};

describe('Chat routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/chat/all', async () => {
    chatService.getAllChatsForPatient.mockResolvedValue({ count: 1, chats: [{ diagnosis_id: 'd1' }] });

    const app = createApp();
    const response = await request(app).get('/api/chat/all');

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(chatService.getAllChatsForPatient).toHaveBeenCalledWith('patient-1');
  });

  test('POST /api/chat/:diagnosis_id', async () => {
    chatService.askQuestion.mockResolvedValue({ diagnosis_id: 'd1', answer: 'ok' });

    const app = createApp();
    const response = await request(app)
      .post('/api/chat/d1')
      .send({ question: 'What should I do?' });

    expect(response.status).toBe(200);
    expect(response.body.answer).toBe('ok');
    expect(chatService.askQuestion).toHaveBeenCalledWith({
      question: 'What should I do?',
      patient_id: 'patient-1',
      diagnosis_id: 'd1',
    });
  });

  test('GET /api/chat/:diagnosis_id', async () => {
    chatService.getMessagesByDiagnosis.mockResolvedValue({ diagnosis_id: 'd1', messages: [] });

    const app = createApp();
    const response = await request(app).get('/api/chat/d1');

    expect(response.status).toBe(200);
    expect(response.body.diagnosis_id).toBe('d1');
    expect(chatService.getMessagesByDiagnosis).toHaveBeenCalledWith({
      patient_id: 'patient-1',
      diagnosis_id: 'd1',
    });
  });
});
