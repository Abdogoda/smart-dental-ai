const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const User = require('../models/User');
const ServiceError = require('../utils/ServiceError');

const profileUploadDir = path.join(__dirname, '../uploads/profiles');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

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
  phoneNumbers: user.phoneNumbers || [],
  medicalHistories: user.medicalHistories || [],
  address: user.address || { city: '', street: '', gov: '' },
  profileImage: user.profileImage || '',
  profileImageUrl: buildProfileImageUrl(req, user.profileImage),
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDir(profileUploadDir);
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

const profileImageUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const register = async ({ name, email, password, age, gender, phoneNumbers, medicalHistories, address }) => {
  if (!name || !email || !password) {
    throw new ServiceError('Name, email, and password are required', 400);
  }

  if (password.length < 6) {
    throw new ServiceError('Password must be at least 6 characters', 400);
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ServiceError('Email is already registered', 400);
  }

  const user = new User({ name, email, password, age, gender, phoneNumbers, medicalHistories, address });
  await user.save();

  return { message: 'Registration successful' };
};

const login = async (req, { email, password }) => {
  if (!email || !password) {
    throw new ServiceError('Email and password are required', 400);
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ServiceError('Invalid email or password', 401);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ServiceError('Invalid email or password', 401);
  }

  const token = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return {
    message: 'Login successful',
    token,
    user: formatUserResponse(req, user),
  };
};

const getProfile = async (req, userId) => {
  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new ServiceError('User not found', 404);
  }

  return {
    message: 'Profile retrieved successfully',
    user: formatUserResponse(req, user),
  };
};

const updateProfile = async (req, userId, payload) => {
  const { name, age, email, gender, password, phoneNumbers, medicalHistories, address } = payload;

  const user = await User.findById(userId);
  if (!user) {
    throw new ServiceError('User not found', 404);
  }

  if (email && email !== user.email) {
    const existing = await User.findOne({ email });
    if (existing) {
      throw new ServiceError('Email is already in use by another account', 400);
    }
  }

  if (name !== undefined) user.name = name;
  if (age !== undefined) user.age = age;
  if (gender !== undefined) user.gender = gender;
  if (email !== undefined) user.email = email;
  if (phoneNumbers !== undefined) user.phoneNumbers = phoneNumbers;
  if (medicalHistories !== undefined) user.medicalHistories = medicalHistories;
  if (address !== undefined) {
    user.address = {
      city: address.city ?? user.address?.city ?? '',
      street: address.street ?? user.address?.street ?? '',
      gov: address.gov ?? user.address?.gov ?? '',
    };
  }

  if (password) {
    if (password.length < 6) {
      throw new ServiceError('Password must be at least 6 characters', 400);
    }
    user.password = password;
  }

  await user.save();

  return {
    message: 'Profile updated successfully',
    user: formatUserResponse(req, user),
  };
};

const uploadProfileImage = async (req, userId, file) => {
  if (!file) {
    throw new ServiceError('Please upload an image (field name: image)', 400);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ServiceError('User not found', 404);
  }

  if (user.profileImage) {
    const previousPath = resolveProfileImagePath(user.profileImage);
    if (previousPath && fs.existsSync(previousPath)) {
      fs.unlinkSync(previousPath);
    }
  }

  user.profileImage = `profiles/${file.filename}`;
  await user.save();

  return {
    message: 'Profile image uploaded successfully',
    user: formatUserResponse(req, user),
  };
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  if (!currentPassword || !newPassword) {
    throw new ServiceError('currentPassword and newPassword are required', 400);
  }

  if (newPassword.length < 6) {
    throw new ServiceError('New password must be at least 6 characters', 400);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ServiceError('User not found', 404);
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ServiceError('Current password is incorrect', 401);
  }

  user.password = newPassword;
  await user.save();

  return { message: 'Password changed successfully' };
};

const getProfileImageDownloadPath = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ServiceError('User not found', 404);
  }

  if (!user.profileImage) {
    throw new ServiceError('No profile image found for this user', 404);
  }

  const imagePath = resolveProfileImagePath(user.profileImage);
  if (!imagePath || !fs.existsSync(imagePath)) {
    throw new ServiceError('Profile image file was not found on the server', 404);
  }

  return imagePath;
};

module.exports = {
  profileImageUpload,
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  uploadProfileImage,
  getProfileImageDownloadPath,
};
