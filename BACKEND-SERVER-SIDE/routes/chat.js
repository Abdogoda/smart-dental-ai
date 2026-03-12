const express = require('express');

const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const chatService = require('../services/chatService');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat
// Body: { question: "...", context: "..." }
// Forwards the question to the AI server and returns the answer.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', authMiddleware, asyncHandler(async (req, res) => {
  const result = await chatService.askQuestion(req.body);
  res.json(result);
}));

module.exports = router;
