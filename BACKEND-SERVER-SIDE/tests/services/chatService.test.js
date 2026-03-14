const ServiceError = require('../../utils/ServiceError');

jest.mock('axios', () => ({
  post: jest.fn(),
}));

jest.mock('mongoose', () => ({
  Types: {
    ObjectId: {
      isValid: jest.fn(() => true),
    },
  },
}));

jest.mock('../../models/Diagnosis', () => ({
  findOne: jest.fn(),
  find: jest.fn(),
}));

jest.mock('../../models/ChatSession', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
}));

const axios = require('axios');
const mongoose = require('mongoose');
const Diagnosis = require('../../models/Diagnosis');
const ChatSession = require('../../models/ChatSession');
const chatService = require('../../services/chatService');

describe('chatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mongoose.Types.ObjectId.isValid.mockReturnValue(true);
  });

  test('askQuestion throws when question is missing', async () => {
    await expect(chatService.askQuestion({ question: '   ', patient_id: 'p1', diagnosis_id: 'd1' }))
      .rejects
      .toMatchObject({ statusCode: 400, message: 'question field is required' });
  });

  test('getMessagesByDiagnosis throws when diagnosis id is invalid', async () => {
    mongoose.Types.ObjectId.isValid.mockReturnValue(false);

    await expect(chatService.getMessagesByDiagnosis({ patient_id: 'p1', diagnosis_id: 'bad-id' }))
      .rejects
      .toMatchObject({ statusCode: 400, message: 'diagnosis_id is invalid' });
  });

  test('getMessagesByDiagnosis throws when diagnosis does not belong to patient', async () => {
    Diagnosis.findOne.mockResolvedValue(null);

    await expect(chatService.getMessagesByDiagnosis({ patient_id: 'p1', diagnosis_id: '507f1f77bcf86cd799439011' }))
      .rejects
      .toMatchObject({ statusCode: 404, message: 'Diagnosis not found for this patient' });
  });

  test('askQuestion maps AI connection refusal to ServiceError 503', async () => {
    Diagnosis.findOne.mockResolvedValue({ detectionResults: { label: 'ok' } });
    ChatSession.findOne.mockResolvedValue({
      diagnosis_id: '507f1f77bcf86cd799439011',
      messages: [],
      save: jest.fn(),
    });
    axios.post.mockRejectedValue({ code: 'ENOTFOUND' });

    await expect(chatService.askQuestion({
      question: 'What now?',
      patient_id: 'p1',
      diagnosis_id: '507f1f77bcf86cd799439011',
    })).rejects.toMatchObject({ statusCode: 503, message: 'AI server is unavailable. Please try again later.' });
  });

  test('getAllChatsForPatient returns count 0 when patient has no diagnoses', async () => {
    Diagnosis.find.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) });

    const result = await chatService.getAllChatsForPatient('p1');

    expect(result).toEqual({ count: 0, chats: [] });
  });

  test('getMessagesByDiagnosis supports legacy session.message key', async () => {
    Diagnosis.findOne.mockResolvedValue({ _id: 'd1', patientId: 'p1' });
    ChatSession.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        diagnosis_id: 'd1',
        message: [{ question: 'q1', answer: 'a1' }],
      }),
    });

    const result = await chatService.getMessagesByDiagnosis({ patient_id: 'p1', diagnosis_id: '507f1f77bcf86cd799439011' });

    expect(result.messages).toEqual([{ question: 'q1', answer: 'a1' }]);
  });
});
