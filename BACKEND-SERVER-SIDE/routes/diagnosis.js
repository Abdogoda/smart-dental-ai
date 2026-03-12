const express = require('express');

const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const diagnosisService = require('../services/diagnosisService');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/diagnosis  — single image diagnosis
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', authMiddleware, diagnosisService.diagnosisUpload.single('image'), asyncHandler(async (req, res) => {
  const result = await diagnosisService.runSingleDiagnosis(req.user.id, req.file);
  res.status(201).json(result);
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/diagnosis/batch  — up to 10 images at once
// ─────────────────────────────────────────────────────────────────────────────
router.post('/batch', authMiddleware, diagnosisService.diagnosisUpload.array('images', 10), asyncHandler(async (req, res) => {
  const result = await diagnosisService.runBatchDiagnosis(req.user.id, req.files);
  res.status(201).json(result);
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/diagnosis/history  — all diagnoses for the logged-in user
// ─────────────────────────────────────────────────────────────────────────────
router.get('/history', authMiddleware, asyncHandler(async (req, res) => {
  const result = await diagnosisService.getHistory(req.user.id);
  res.json(result);
}));

module.exports = router;
