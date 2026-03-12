const express = require('express');
const router  = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/doc  — interactive API reference
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;

  const docs = {
    title:   'Smart Dental AI — API Reference',
    version: '1.0.0',
    base_url: base,
    note: 'Endpoints marked with auth:true require the header  Authorization: Bearer <token>',

    endpoints: [
      // ── Auth ───────────────────────────────────────────────────────────────
      {
        group:  'Auth',
        method: 'POST',
        path:   '/api/auth/register',
        auth:   false,
        description: 'Register a new user account',
        body: {
          name:     'string  (required)',
          email:    'string  (required)',
          password: 'string  (required, min 6 chars)',
          age:      'number  (optional)',
          gender:   '"male" | "female" | "other"  (optional)',
        },
        response: { message: 'Registration successful' },
      },
      {
        group:  'Auth',
        method: 'POST',
        path:   '/api/auth/login',
        auth:   false,
        description: 'Login and receive a JWT token',
        body: {
          email:    'string  (required)',
          password: 'string  (required)',
        },
        response: { message: 'Login successful', token: '<jwt>', user: { id: '', name: '', email: '', age: '', gender: '', profileImage: '', profileImageUrl: '' } },
      },
      {
        group:  'Auth',
        method: 'GET',
        path:   '/api/auth/profile',
        auth:   true,
        description: "Get the logged-in user's profile (password excluded)",
        body: null,
        response: { message: 'Profile retrieved successfully', user: { id: '', name: '', email: '', age: '', gender: '', profileImage: '', profileImageUrl: '' } },
      },
      {
        group:  'Auth',
        method: 'PUT',
        path:   '/api/auth/profile',
        auth:   true,
        description: 'Update name, email, age, gender, and/or password',
        body: {
          name:     'string  (optional)',
          email:    'string  (optional)',
          age:      'number  (optional)',
          gender:   '"male" | "female" | "other"  (optional)',
          password: 'string  (optional, min 6 chars)',
        },
        response: { message: 'Profile updated successfully', user: { id: '', name: '', email: '', age: '', gender: '', profileImage: '', profileImageUrl: '' } },
      },
      {
        group:  'Auth',
        method: 'POST',
        path:   '/api/auth/profile/image',
        auth:   true,
        description: 'Upload or replace the logged-in user\'s profile image',
        body: { type: 'multipart/form-data', fields: { image: 'image file (jpeg/jpg/png/gif/webp, max 5 MB)' } },
        response: { message: 'Profile image uploaded successfully', user: { id: '', name: '', email: '', age: '', gender: '', profileImage: '', profileImageUrl: '' } },
      },
      {
        group:  'Auth',
        method: 'GET',
        path:   '/api/auth/profile/image',
        auth:   true,
        description: 'Download the logged-in user\'s profile image',
        body: null,
        response: 'Binary file download',
      },

      // ── Diagnosis ─────────────────────────────────────────────────────────
      {
        group:  'Diagnosis',
        method: 'POST',
        path:   '/api/diagnosis',
        auth:   true,
        description: 'Upload one dental image and get an AI diagnosis (saved to history)',
        body: { type: 'multipart/form-data', fields: { image: 'image file (jpeg / jpg / png / gif / webp, max 10 MB)' } },
        response: { message: 'Diagnosis completed', diagnosis: {} },
      },
      {
        group:  'Diagnosis',
        method: 'POST',
        path:   '/api/diagnosis/batch',
        auth:   true,
        description: 'Upload up to 10 images at once — each result is saved to history',
        body: { type: 'multipart/form-data', fields: { images: 'up to 10 image files (jpeg/jpg/png/gif/webp, max 10 MB each)' } },
        response: { message: 'Batch diagnosis completed', count: 0, diagnoses: [] },
      },
      {
        group:  'Diagnosis',
        method: 'GET',
        path:   '/api/diagnosis/history',
        auth:   true,
        description: 'Retrieve all past diagnoses for the logged-in user (newest first)',
        body: null,
        response: { count: 0, diagnoses: [] },
      },

      // ── Chat ──────────────────────────────────────────────────────────────
      {
        group:  'Chat',
        method: 'POST',
        path:   '/api/chat',
        auth:   true,
        description: 'Ask the AI a dental-health question',
        body: {
          question: 'string  (required)',
          context:  'string  (optional — extra context for the AI)',
        },
        response: { answer: 'string', raw: {} },
      },

      // ── Doc ───────────────────────────────────────────────────────────────
      {
        group:  'Doc',
        method: 'GET',
        path:   '/api/doc',
        auth:   false,
        description: 'List all available API endpoints with descriptions and body shapes',
        body: null,
        response: { title: '', version: '', base_url: '', endpoints: [] },
      },
    ],
  };

  res.json(docs);
});

module.exports = router;
