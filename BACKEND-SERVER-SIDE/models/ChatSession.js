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
    diagnosis_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Diagnosis',
      required: true,
      unique: true,
      index: true,
    },
    messages: {
      type: [chatMessageSchema],
      default: [],
    },
    last_active: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'chat_sessions',
  }
);

chatSessionSchema.index({ diagnosis_id: 1, last_active: -1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);