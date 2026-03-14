const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Patient = require('../models/Patient');
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

const formatPatientResponse = (req, patient) => ({
  id: patient._id,
  name: patient.name,
  email: patient.email,
  age: patient.age,
  gender: patient.gender,
  phoneNumbers: patient.phoneNumbers || [],
  medicalHistories: patient.medicalHistories || [],
  address: patient.address || { city: '', street: '', gov: '' },
  profileImage: patient.profileImage || '',
  profileImageUrl: buildProfileImageUrl(req, patient.profileImage),
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

  const existing = await Patient.findOne({ email });
  if (existing) {
    throw new ServiceError('Email is already registered', 400);
  }

  const patient = new Patient({ name, email, password, age, gender, phoneNumbers, medicalHistories, address });
  await patient.save();

  return { message: 'Registration successful' };
};

const login = async (req, { email, password }) => {
  if (!email || !password) {
    throw new ServiceError('Email and password are required', 400);
  }

  const patient = await Patient.findOne({ email });
  if (!patient) {
    throw new ServiceError('Invalid email or password', 401);
  }

  const isMatch = await patient.comparePassword(password);
  if (!isMatch) {
    throw new ServiceError('Invalid email or password', 401);
  }

  const token = jwt.sign(
    { id: patient._id, email: patient.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return {
    message: 'Login successful',
    token,
    patient: formatPatientResponse(req, patient),
  };
};

const getProfile = async (req, patientId) => {
  const patient = await Patient.findById(patientId).select('-password');
  if (!patient) {
    throw new ServiceError('Patient not found', 404);
  }

  return {
    message: 'Profile retrieved successfully',
    patient: formatPatientResponse(req, patient),
  };
};

const updateProfile = async (req, patientId, payload) => {
  const { name, age, email, gender, password, phoneNumbers, medicalHistories, address } = payload;

  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new ServiceError('Patient not found', 404);
  }

  if (email && email !== patient.email) {
    const existing = await Patient.findOne({ email });
    if (existing) {
      throw new ServiceError('Email is already in use by another account', 400);
    }
  }

  if (name !== undefined) patient.name = name;
  if (age !== undefined) patient.age = age;
  if (gender !== undefined) patient.gender = gender;
  if (email !== undefined) patient.email = email;
  if (phoneNumbers !== undefined) patient.phoneNumbers = phoneNumbers;
  if (medicalHistories !== undefined) patient.medicalHistories = medicalHistories;
  if (address !== undefined) {
    patient.address = {
      city: address.city ?? patient.address?.city ?? '',
      street: address.street ?? patient.address?.street ?? '',
      gov: address.gov ?? patient.address?.gov ?? '',
    };
  }

  if (password) {
    if (password.length < 6) {
      throw new ServiceError('Password must be at least 6 characters', 400);
    }
    patient.password = password;
  }

  await patient.save();

  return {
    message: 'Profile updated successfully',
    patient: formatPatientResponse(req, patient),
  };
};

const uploadProfileImage = async (req, patientId, file) => {
  if (!file) {
    throw new ServiceError('Please upload an image (field name: image)', 400);
  }

  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new ServiceError('Patient not found', 404);
  }

  if (patient.profileImage) {
    const previousPath = resolveProfileImagePath(patient.profileImage);
    if (previousPath && fs.existsSync(previousPath)) {
      fs.unlinkSync(previousPath);
    }
  }

  patient.profileImage = `profiles/${file.filename}`;
  await patient.save();

  return {
    message: 'Profile image uploaded successfully',
    patient: formatPatientResponse(req, patient),
  };
};

const changePassword = async (patientId, { currentPassword, newPassword }) => {
  if (!currentPassword || !newPassword) {
    throw new ServiceError('currentPassword and newPassword are required', 400);
  }

  if (newPassword.length < 6) {
    throw new ServiceError('New password must be at least 6 characters', 400);
  }

  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new ServiceError('Patient not found', 404);
  }

  const isMatch = await patient.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ServiceError('Current password is incorrect', 401);
  }

  patient.password = newPassword;
  await patient.save();

  return { message: 'Password changed successfully' };
};

const getProfileImageDownloadPath = async (patientId) => {
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new ServiceError('Patient not found', 404);
  }

  if (!patient.profileImage) {
    throw new ServiceError('No profile image found for this patient', 404);
  }

  const imagePath = resolveProfileImagePath(patient.profileImage);
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
