const ServiceError = require('../../utils/ServiceError');

jest.mock('multer', () => {
  const multerMock = jest.fn(() => ({
    single: jest.fn(() => (req, res, next) => next()),
    array: jest.fn(() => (req, res, next) => next()),
  }));
  multerMock.diskStorage = jest.fn(() => ({}));
  return multerMock;
});

jest.mock('axios', () => ({
  post: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  createReadStream: jest.fn(() => 'stream'),
}));

jest.mock('../../models/Diagnosis', () => {
  const Diagnosis = jest.fn(function Diagnosis(payload) {
    return {
      ...payload,
      save: jest.fn().mockResolvedValue(undefined),
      toObject: jest.fn(() => ({ ...payload })),
    };
  });

  Diagnosis.findOne = jest.fn();
  Diagnosis.find = jest.fn(() => ({ sort: jest.fn().mockResolvedValue([]) }));
  return Diagnosis;
});

const axios = require('axios');
const Diagnosis = require('../../models/Diagnosis');
const diagnosisService = require('../../services/diagnosisService');

describe('diagnosisService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('runSingleDiagnosis throws when file is missing', async () => {
    await expect(diagnosisService.runSingleDiagnosis('patient-1', null))
      .rejects
      .toMatchObject({ statusCode: 400, message: 'Please upload an image (field name: image)' });
  });

  test('runSingleDiagnosis maps AI connection refusal to ServiceError 503', async () => {
    axios.post.mockRejectedValue({ code: 'ECONNREFUSED' });

    await expect(diagnosisService.runSingleDiagnosis('patient-1', { path: '/tmp/x.png', originalname: 'x.png', filename: 'x.png' }))
      .rejects
      .toMatchObject({ statusCode: 503, message: 'AI server is unavailable. Please try again later.' });
  });

  test('runBatchDiagnosis throws when files are empty', async () => {
    await expect(diagnosisService.runBatchDiagnosis('patient-1', []))
      .rejects
      .toMatchObject({ statusCode: 400, message: 'Please upload at least one image (field name: images)' });
  });

  test('getDiagnosisById throws when diagnosis is missing', async () => {
    Diagnosis.findOne.mockResolvedValue(null);

    await expect(diagnosisService.getDiagnosisById('patient-1', 'diag-1'))
      .rejects
      .toMatchObject({ statusCode: 404, message: 'Diagnosis not found' });
  });

  test('runSingleDiagnosis saves transformed output image path when AI returns base64 image', async () => {
    const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEElEQVR42mNk+M/wHwAE/wJ/lv4O4QAAAABJRU5ErkJggg==';

    axios.post.mockResolvedValue({
      data: {
        detectionResults: {
          overlayImage: `data:image/png;base64,${tinyPng}`,
          status: 'ok',
        },
      },
    });

    const result = await diagnosisService.runSingleDiagnosis('patient-1', {
      path: '/tmp/input.png',
      originalname: 'input.png',
      filename: 'saved-input.png',
    });

    expect(result.message).toBe('Diagnosis completed');
    expect(result.diagnosis.inputImagePath).toBe('diagnosis/input/saved-input.png');
    expect(result.diagnosis.outputImagePath).toBe('diagnosis/output/saved-input.png');
    expect(result.diagnosis.outputImageUrl).toBe('/uploads/diagnosis/output/saved-input.png');
  });
});
