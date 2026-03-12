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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    // Create the folder if it does not exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Unique filename: timestamp + random number + original extension
    const uniqueName =
      `${Date.now()}-${Math.round(Math.random() * 1e9)}` +
      path.extname(file.originalname);
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
    formData.append('image', fs.createReadStream(req.file.path), req.file.originalname);

    // Call the AI server
    const aiResponse = await axios.post(`${AI_SERVER}/diagnose`, formData, {
      headers: formData.getHeaders(),
      timeout: 60_000, // 60 s
    });

    const aiResult = aiResponse.data;

    // Persist the result
    const diagnosis = new Diagnosis({
      userId:           req.user.id,
      imagePath:        req.file.filename,          // just the filename
      detectionResults: aiResult.detectionResults ?? aiResult,
      report:           aiResult.report       ?? '',
      urgencyLevel:     aiResult.urgencyLevel  ?? 'low',
      actionPlan:       aiResult.actionPlan    ?? '',
    });
    await diagnosis.save();

    res.status(201).json({
      message:   'Diagnosis completed',
      diagnosis,
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
      formData.append('images', fs.createReadStream(file.path), file.originalname);
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
        return new Diagnosis({
          userId:           req.user.id,
          imagePath:        file.filename,
          detectionResults: aiResult.detectionResults ?? aiResult,
          report:           aiResult.report       ?? '',
          urgencyLevel:     aiResult.urgencyLevel  ?? 'low',
          actionPlan:       aiResult.actionPlan    ?? '',
        }).save();
      })
    );

    res.status(201).json({
      message: 'Batch diagnosis completed',
      count:   savedDiagnoses.length,
      diagnoses: savedDiagnoses,
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
      diagnoses,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
