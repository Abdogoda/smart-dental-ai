const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const Diagnosis = require('../models/Diagnosis');
const ServiceError = require('../utils/ServiceError');

const AI_SERVER = process.env.AI_SERVER_URL || 'http://localhost:8000';

const diagnosisInputDir = path.join(__dirname, '../uploads/diagnosis/input');
const diagnosisOutputDir = path.join(__dirname, '../uploads/diagnosis/output');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const buildStoredPath = (folder, filename) => `diagnosis/${folder}/${filename}`;

const buildPublicPath = (storedPath) => {
  if (!storedPath) {
    return null;
  }

  return `/uploads/${storedPath.replace(/\\/g, '/')}`;
};

const mimeToExtension = (mimeType) => {
  switch ((mimeType || '').toLowerCase()) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/gif':
      return '.gif';
    case 'image/webp':
      return '.webp';
    default:
      return '.png';
  }
};

const createUniqueFilename = (originalName, fallbackExtension = '.png') => {
  const extension = path.extname(originalName || '') || fallbackExtension;
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
};

const normalizeBase64 = (value) => value.replace(/\s+/g, '');

const decodeBase64 = (rawBase64) => {
  const normalized = normalizeBase64(rawBase64);
  if (!normalized || normalized.length < 80) {
    return null;
  }

  if (!/^[A-Za-z0-9+/=]+$/.test(normalized)) {
    return null;
  }

  let candidate = normalized;
  const remainder = candidate.length % 4;
  if (remainder !== 0) {
    candidate += '='.repeat(4 - remainder);
  }

  try {
    const decoded = Buffer.from(candidate, 'base64');
    if (!decoded || decoded.length < 16) {
      return null;
    }

    return decoded;
  } catch (_err) {
    return null;
  }
};

const detectImageType = (buffer) => {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { extension: '.png', mimeType: 'image/png' };
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: '.jpg', mimeType: 'image/jpeg' };
  }

  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return { extension: '.gif', mimeType: 'image/gif' };
  }

  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { extension: '.webp', mimeType: 'image/webp' };
  }

  return null;
};

const looksLikeImageField = (keyPath) => /image|mask|overlay|heatmap|annotat|visual/i.test(keyPath || '');

const parseBase64Image = (value, keyPath = '') => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  const dataUriMatch = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (dataUriMatch) {
    const decoded = decodeBase64(dataUriMatch[2]);
    if (!decoded) {
      return null;
    }

    const detected = detectImageType(decoded);
    return {
      buffer: decoded,
      extension: detected?.extension || mimeToExtension(dataUriMatch[1]),
    };
  }

  if (!looksLikeImageField(keyPath)) {
    return null;
  }

  const decoded = decodeBase64(trimmed);
  if (!decoded) {
    return null;
  }

  const detected = detectImageType(decoded);
  if (!detected) {
    return null;
  }

  return {
    buffer: decoded,
    extension: detected.extension,
  };
};

const persistAiImages = (payload, outputFilename) => {
  let outputImagePath = '';
  let outputPublicPath = null;

  const walk = (value, keyPath = '') => {
    if (Array.isArray(value)) {
      return value.map((item, index) => walk(item, `${keyPath}[${index}]`));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, nestedValue]) => [key, walk(nestedValue, keyPath ? `${keyPath}.${key}` : key)])
      );
    }

    const parsedImage = parseBase64Image(value, keyPath);
    if (!parsedImage) {
      return value;
    }

    if (outputPublicPath) {
      return outputPublicPath;
    }

    ensureDir(diagnosisOutputDir);
    const filename = outputFilename;
    const storedPath = buildStoredPath('output', filename);
    const absolutePath = path.join(__dirname, '../uploads', storedPath);

    fs.writeFileSync(absolutePath, parsedImage.buffer);

    outputImagePath = storedPath;
    outputPublicPath = buildPublicPath(storedPath);

    return outputPublicPath;
  };

  return {
    sanitizedPayload: walk(payload),
    outputImagePath,
  };
};

const serializeDiagnosis = (diagnosis) => {
  const diagnosisObject = typeof diagnosis.toObject === 'function'
    ? diagnosis.toObject()
    : { ...diagnosis };

  const inputImagePath = diagnosisObject.inputImagePath || '';
  const outputImagePath = diagnosisObject.outputImagePath || '';

  return {
    ...diagnosisObject,
    inputImagePath,
    outputImagePath,
    inputImageUrl: buildPublicPath(inputImagePath),
    outputImageUrl: buildPublicPath(outputImagePath),
  };
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDir(diagnosisInputDir);
    cb(null, diagnosisInputDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = createUniqueFilename(file.originalname);
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const validExt = allowed.test(path.extname(file.originalname).toLowerCase());
  const validMime = allowed.test(file.mimetype);

  if (validExt && validMime) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'), false);
  }
};

const diagnosisUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const buildDiagnosisFromAi = (patientId, file, aiResult) => {
  const { sanitizedPayload, outputImagePath } = persistAiImages(aiResult, file.filename);
  const inputImagePath = buildStoredPath('input', file.filename);

  return new Diagnosis({
    patientId,
    inputImagePath,
    outputImagePath,
    detectionResults: sanitizedPayload.detectionResults ?? sanitizedPayload,
  });
};

const normalizeBatchAiResults = (rawBatchResult, files) => {
  if (Array.isArray(rawBatchResult)) {
    return files.map((_, i) => rawBatchResult[i] ?? {});
  }

  if (rawBatchResult && Array.isArray(rawBatchResult.results)) {
    const results = rawBatchResult.results;

    // Prefer filename-based matching to preserve the exact uploaded-file order.
    const byFilename = new Map();
    results.forEach((item) => {
      const itemFilename = typeof item?.filename === 'string' ? path.basename(item.filename).toLowerCase() : '';
      if (itemFilename && !byFilename.has(itemFilename)) {
        byFilename.set(itemFilename, item);
      }
    });

    return files.map((file, i) => {
      const uploadedName = path.basename(file.originalname || '').toLowerCase();
      if (uploadedName && byFilename.has(uploadedName)) {
        return byFilename.get(uploadedName);
      }

      return results[i] ?? {};
    });
  }

  // Fallback for unexpected AI response shapes.
  return files.map((_, i) => (i === 0 ? rawBatchResult : {}));
};

const runSingleDiagnosis = async (patientId, file) => {
  if (!file) {
    throw new ServiceError('Please upload an image (field name: image)', 400);
  }

  const formData = new FormData();
  formData.append('file', fs.createReadStream(file.path), file.originalname);

  try {
    const aiResponse = await axios.post(`${AI_SERVER}/diagnose`, formData, {
      headers: formData.getHeaders(),
      timeout: 60_000,
    });

    const diagnosis = buildDiagnosisFromAi(patientId, file, aiResponse.data);
    await diagnosis.save();

    return {
      message: 'Diagnosis completed',
      diagnosis: serializeDiagnosis(diagnosis),
    };
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      throw new ServiceError('AI server is unavailable. Please try again later.', 503);
    }

    throw err;
  }
};

const runBatchDiagnosis = async (patientId, files) => {
  if (!files || files.length === 0) {
    throw new ServiceError('Please upload at least one image (field name: images)', 400);
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', fs.createReadStream(file.path), file.originalname);
  });

  try {
    const aiResponse = await axios.post(`${AI_SERVER}/diagnose-batch`, formData, {
      headers: formData.getHeaders(),
      timeout: 120_000,
    });

    const aiResults = normalizeBatchAiResults(aiResponse.data, files);

    const savedDiagnoses = await Promise.all(
      files.map((file, i) => {
        const aiResult = aiResults[i] ?? {};
        return buildDiagnosisFromAi(patientId, file, aiResult).save();
      })
    );

    return {
      message: 'Batch diagnosis completed',
      count: savedDiagnoses.length,
      diagnoses: savedDiagnoses.map(serializeDiagnosis),
    };
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      throw new ServiceError('AI server is unavailable. Please try again later.', 503);
    }

    throw err;
  }
};

const getDiagnosisById = async (patientId, diagnosisId) => {
  const diagnosis = await Diagnosis.findOne({ _id: diagnosisId, patientId });
  if (!diagnosis) {
    throw new ServiceError('Diagnosis not found', 404);
  }

  return { diagnosis: serializeDiagnosis(diagnosis) };
};

const getHistory = async (patientId) => {
  const diagnoses = await Diagnosis.find({ patientId }).sort({ createdAt: -1 });

  return {
    count: diagnoses.length,
    diagnoses: diagnoses.map(serializeDiagnosis),
  };
};

module.exports = {
  diagnosisUpload,
  runSingleDiagnosis,
  runBatchDiagnosis,
  getDiagnosisById,
  getHistory,
};
