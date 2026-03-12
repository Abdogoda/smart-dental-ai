const express  = require('express');
const router   = express.Router();
const axios    = require('axios');
const authMiddleware = require('../middleware/auth');

const AI_SERVER = process.env.AI_SERVER_URL || 'http://localhost:8000';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chat
// Body: { question: "...", context: "..." }
// Forwards the question to the AI server and returns the answer.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { question, context } = req.body;

    if (!question) {
      return res.status(400).json({ message: 'question field is required' });
    }

    // Forward to external AI server
    const aiResponse = await axios.post(
      `${AI_SERVER}/chat`,
      { question, context: context || '' },
      { timeout: 30_000 } // 30 s
    );

    const data = aiResponse.data;

    res.json({
      answer: data.answer ?? data, // support different AI response shapes
      raw:    data,
    });
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({ message: 'AI server is unavailable. Please try again later.' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
