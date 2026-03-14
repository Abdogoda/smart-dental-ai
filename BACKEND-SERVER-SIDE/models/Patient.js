const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const patientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    age: {
      type: Number,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    profileImage: {
      type: String,
      default: '',
    },
    phoneNumbers: {
      type: [String],
      default: [],
    },
    medicalHistories: {
      type: [String],
      default: [],
    },
    address: {
      city: { type: String, default: '' },
      street: { type: String, default: '' },
      gov: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

// Hash the password before saving (only if it was changed)
patientSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Helper method to compare a candidate password with the stored hash
patientSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Patient', patientSchema);
