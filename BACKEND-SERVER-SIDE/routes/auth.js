const express = require('express');

const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const authService = require('../services/authService');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register', asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', asyncHandler(async (req, res) => {
  const result = await authService.login(req, req.body);
  res.json(result);
}));


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/profile  — view own profile
// ─────────────────────────────────────────────────────────────────────────────
router.get('/profile', authMiddleware, asyncHandler(async (req, res) => {
  const result = await authService.getProfile(req, req.user.id);
  res.json(result);
}));

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/auth/profile  — update own profile
// ─────────────────────────────────────────────────────────────────────────────
router.put('/profile', authMiddleware, asyncHandler(async (req, res) => {
  const result = await authService.updateProfile(req, req.user.id, req.body);
  res.json(result);
}));

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/auth/change-password  — change password
// ─────────────────────────────────────────────────────────────────────────────
router.put('/change-password', authMiddleware, asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user.id, req.body);
  res.json(result);
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/profile/image  — upload or replace own profile image
// ─────────────────────────────────────────────────────────────────────────────
router.post('/profile/image', authMiddleware, authService.profileImageUpload.single('image'), asyncHandler(async (req, res) => {
  const result = await authService.uploadProfileImage(req, req.user.id, req.file);
  res.json(result);
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/profile/image  — download own profile image
// ─────────────────────────────────────────────────────────────────────────────
router.get('/profile/image', authMiddleware, asyncHandler(async (req, res) => {
  const imagePath = await authService.getProfileImageDownloadPath(req.user.id);
  return res.download(imagePath);
}));

module.exports = router;
