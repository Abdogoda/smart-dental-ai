const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const chatSessionSchema = new mongoose.Schema(
  {
    message: {
      type: [chatMessageSchema],
      default: [],
    },
    last_active: {
      type: Date,
      default: Date.now,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    diagnosis_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Diagnosis',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'chat_sessions',
  }
);

chatSessionSchema.index({ user_id: 1, last_active: -1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);