const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// ── Startup guards ──────────────────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set.');
  process.exit(1);
}

const app = express();

// ── Middleware ───────────────────────────────────────────────────────────────
const corsOptions = {
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map((u) => u.trim()) : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images as static files (e.g. GET /uploads/filename.jpg)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/diagnosis', require('./routes/diagnosis'));
app.use('/api/chat',      require('./routes/chat'));
app.use('/api/doc',       require('./routes/doc'));
app.use(require('./middleware/errorHandler'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Smart Dental AI Backend is running' });
});

// ── Connect to MongoDB then start the server ─────────────────────────────────
const PORT      = process.env.PORT      || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-dental-ai';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    console.error('Make sure MongoDB is running and MONGO_URI in .env is correct.');
    process.exit(1);
  });