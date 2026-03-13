const express = require('express');

const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const chatService = require('../services/chatService');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat
// Body: { question: "...", context?: "...", diagnosis_id?: "...", session_id?: "..." }
// Supports session-based chat with optional diagnosis context.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', authMiddleware, asyncHandler(async (req, res) => {
  const result = await chatService.askQuestion({
    ...req.body,
    user_id: req.user.id,
  });
  res.json(result);
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/sessions
// Returns all chat sessions for the logged-in user (including messages).
// ─────────────────────────────────────────────────────────────────────────────
router.get('/sessions', authMiddleware, asyncHandler(async (req, res) => {
  const result = await chatService.getAllSessions(req.user.id);
  res.json(result);
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chat/sessions/:session_id
// Returns one chat session for the logged-in user (including messages).
// ─────────────────────────────────────────────────────────────────────────────
router.get('/sessions/:session_id', authMiddleware, asyncHandler(async (req, res) => {
  const result = await chatService.getSessionById({
    user_id: req.user.id,
    session_id: req.params.session_id,
  });
  res.json(result);
}));

module.exports = router;
