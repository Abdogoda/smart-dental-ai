const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const axios      = require('axios');
const FormData   = require('form-data');

const Diagnosis    = require('../models/Diagnosis');
const authMiddleware = require('../middleware/auth');

// ── Multer configuration ─────────────────────────────────────────────────────

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

  // PNG signature
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { extension: '.png', mimeType: 'image/png' };
  }

  // JPEG signature
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: '.jpg', mimeType: 'image/jpeg' };
  }

  // GIF signature
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return { extension: '.gif', mimeType: 'image/gif' };
  }

  // WEBP signature: RIFF....WEBP
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

  // Some AI services return raw base64 string without data URI prefix.
  // To avoid converting arbitrary text, only parse likely image fields.
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

const persistAiImages = (payload, filePrefix) => {
  let outputImagePath = '';
  let imageCount = 0;

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

    ensureDir(diagnosisOutputDir);
    imageCount += 1;
    const filename = `${filePrefix}-${imageCount}${parsedImage.extension}`;
    const storedPath = buildStoredPath('output', filename);
    const absolutePath = path.join(__dirname, '../uploads', storedPath);

    fs.writeFileSync(absolutePath, parsedImage.buffer);

    if (!outputImagePath) {
      outputImagePath = storedPath;
    }

    return buildPublicPath(storedPath);
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

  const inputImagePath = diagnosisObject.inputImagePath || diagnosisObject.imagePath || '';
  const outputImagePath = diagnosisObject.outputImagePath || '';

  return {
    ...diagnosisObject,
    imagePath: inputImagePath,
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

// Only allow common image types
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const validExt  = allowed.test(path.extname(file.originalname).toLowerCase());
  const validMime = allowed.test(file.mimetype);
  if (validExt && validMime) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
});

// Base URL of the external AI server
const AI_SERVER = process.env.AI_SERVER_URL || 'http://localhost:8000';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/diagnosis  — single image diagnosis
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image (field name: image)' });
    }

    // Build a multipart form to forward the image to the AI server
    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path), req.file.originalname);

    // Call the AI server
    const aiResponse = await axios.post(`${AI_SERVER}/diagnose`, formData, {
      headers: formData.getHeaders(),
      timeout: 60_000, // 60 s
    });

    const aiResult = aiResponse.data;
    const { sanitizedPayload, outputImagePath } = persistAiImages(aiResult, path.parse(req.file.filename).name);
    const inputImagePath = buildStoredPath('input', req.file.filename);

    // Persist the result
    const diagnosis = new Diagnosis({
      userId:           req.user.id,
      imagePath:        inputImagePath,
      inputImagePath,
      outputImagePath,
      detectionResults: sanitizedPayload.detectionResults ?? sanitizedPayload,
      report:           sanitizedPayload.report       ?? '',
      urgencyLevel:     sanitizedPayload.urgencyLevel  ?? 'low',
      actionPlan:       sanitizedPayload.actionPlan    ?? '',
    });
    await diagnosis.save();

    res.status(201).json({
      message:   'Diagnosis completed',
      diagnosis: serializeDiagnosis(diagnosis),
    });
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({ message: 'AI server is unavailable. Please try again later.' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/diagnosis/batch  — up to 10 images at once
// ─────────────────────────────────────────────────────────────────────────────
router.post('/batch', authMiddleware, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload at least one image (field name: images)' });
    }

    // Forward all images to the AI server as multipart form
    const formData = new FormData();
    req.files.forEach((file) => {
      formData.append('files', fs.createReadStream(file.path), file.originalname);
    });

    const aiResponse = await axios.post(`${AI_SERVER}/diagnose-batch`, formData, {
      headers: formData.getHeaders(),
      timeout: 120_000, // 2 min for batch
    });

    const aiResults = Array.isArray(aiResponse.data) ? aiResponse.data : [aiResponse.data];

    // Persist each result alongside its corresponding uploaded file
    const savedDiagnoses = await Promise.all(
      req.files.map((file, i) => {
        const aiResult = aiResults[i] ?? {};
        const { sanitizedPayload, outputImagePath } = persistAiImages(aiResult, path.parse(file.filename).name);
        const inputImagePath = buildStoredPath('input', file.filename);

        return new Diagnosis({
          userId:           req.user.id,
          imagePath:        inputImagePath,
          inputImagePath,
          outputImagePath,
          detectionResults: sanitizedPayload.detectionResults ?? sanitizedPayload,
          report:           sanitizedPayload.report       ?? '',
          urgencyLevel:     sanitizedPayload.urgencyLevel  ?? 'low',
          actionPlan:       sanitizedPayload.actionPlan    ?? '',
        }).save();
      })
    );

    res.status(201).json({
      message: 'Batch diagnosis completed',
      count:   savedDiagnoses.length,
      diagnoses: savedDiagnoses.map(serializeDiagnosis),
    });
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({ message: 'AI server is unavailable. Please try again later.' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/diagnosis/history  — all diagnoses for the logged-in user
// ─────────────────────────────────────────────────────────────────────────────
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const diagnoses = await Diagnosis.find({ userId: req.user.id }).sort({ createdAt: -1 });

    res.json({
      count: diagnoses.length,
      diagnoses: diagnoses.map(serializeDiagnosis),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
