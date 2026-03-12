const express = require('express');

const docService = require('../services/docService');

const router  = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/doc  — interactive API reference
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const docs = docService.buildApiDocs(base);
  res.json(docs);
});

module.exports = router;
