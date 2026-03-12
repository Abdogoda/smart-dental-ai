const express        = require('express');
const router         = express.Router();
const jwt            = require('jsonwebtoken');
const multer         = require('multer');
const path           = require('path');
const fs             = require('fs');
const User           = require('../models/User');
const authMiddleware = require('../middleware/auth');

const profileUploadDir = path.join(__dirname, '../uploads/profiles');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(profileUploadDir)) {
      fs.mkdirSync(profileUploadDir, { recursive: true });
    }
    cb(null, profileUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const validExt = allowed.test(path.extname(file.originalname).toLowerCase());
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
  limits: { fileSize: 5 * 1024 * 1024 },
});

const buildProfileImageUrl = (req, profileImage) => {
  if (!profileImage) {
    return null;
  }

  return `${req.protocol}://${req.get('host')}/uploads/${profileImage}`;
};

const resolveProfileImagePath = (profileImage) => {
  if (!profileImage) {
    return null;
  }

  const normalizedPath = profileImage.startsWith('profiles/')
    ? profileImage
    : `profiles/${profileImage}`;

  return path.join(__dirname, '../uploads', normalizedPath);
};

const formatUserResponse = (req, user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  age: user.age,
  gender: user.gender,
  profileImage: user.profileImage || '',
  profileImageUrl: buildProfileImageUrl(req, user.profileImage),
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, age, gender } = req.body;

    // Basic field validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check for duplicate email
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    // Create user — password is hashed automatically by the model's pre-save hook
    const user = new User({ name, email, password, age, gender });
    await user.save();

    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Look up the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: formatUserResponse(req, user),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/profile  — view own profile
// ─────────────────────────────────────────────────────────────────────────────
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      message: 'Profile retrieved successfully',
      user: formatUserResponse(req, user),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/auth/profile  — update own profile
// ─────────────────────────────────────────────────────────────────────────────
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, age, email, gender, password } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ message: 'Email is already in use by another account' });
      }
    }

    if (name !== undefined)   user.name   = name;
    if (age  !== undefined)   user.age    = age;
    if (gender !== undefined) user.gender = gender;
    if (email !== undefined)  user.email  = email;

    // Only update password if a new one was provided
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      user.password = password; // pre-save hook will hash it
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: formatUserResponse(req, user),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/profile/image  — upload or replace own profile image
// ─────────────────────────────────────────────────────────────────────────────
router.post('/profile/image', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image (field name: image)' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.profileImage) {
      const previousPath = resolveProfileImagePath(user.profileImage);
      if (previousPath && fs.existsSync(previousPath)) {
        fs.unlinkSync(previousPath);
      }
    }

    user.profileImage = `profiles/${req.file.filename}`;
    await user.save();

    res.json({
      message: 'Profile image uploaded successfully',
      user: formatUserResponse(req, user),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/profile/image  — download own profile image
// ─────────────────────────────────────────────────────────────────────────────
router.get('/profile/image', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.profileImage) {
      return res.status(404).json({ message: 'No profile image found for this user' });
    }

    const imagePath = resolveProfileImagePath(user.profileImage);
    if (!imagePath || !fs.existsSync(imagePath)) {
      return res.status(404).json({ message: 'Profile image file was not found on the server' });
    }

    return res.download(imagePath);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
