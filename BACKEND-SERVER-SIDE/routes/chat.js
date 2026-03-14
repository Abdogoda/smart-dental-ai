const express = require('express');

const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const chatService = require('../services/chatService');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/all
// Returns all diagnosis-bound chats for the logged-in patient.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/all', authMiddleware, asyncHandler(async (req, res) => {
  const result = await chatService.getAllChatsForPatient(req.patient.id);
  res.json(result);
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat/:diagnosis_id
// Body: { question: "..." }
// Chat is strictly bound to diagnosis context.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:diagnosis_id', authMiddleware, asyncHandler(async (req, res) => {
  const result = await chatService.askQuestion({
    ...req.body,
    patient_id: req.patient.id,
    diagnosis_id: req.params.diagnosis_id,
  });
  res.json(result);
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/:diagnosis_id
// Returns chat messages for the selected diagnosis.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:diagnosis_id', authMiddleware, asyncHandler(async (req, res) => {
  const result = await chatService.getMessagesByDiagnosis({
    patient_id: req.patient.id,
    diagnosis_id: req.params.diagnosis_id,
  });
  res.json(result);
}));

module.exports = router;
