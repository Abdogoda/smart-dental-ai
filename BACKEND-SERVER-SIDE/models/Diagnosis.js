const mongoose = require('mongoose');

const diagnosisSchema = new mongoose.Schema(
  {
    // The user who requested the diagnosis
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Filename of the uploaded image (stored inside /uploads)
    imagePath: {
      type: String,
      required: true,
    },

    // Raw detection results returned by the AI server (array of findings, etc.)
    detectionResults: {
      type: mongoose.Schema.Types.Mixed,
    },

    // Human-readable report from the AI
    report: {
      type: String,
      default: '',
    },

    // How urgent the findings are
    urgencyLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },

    // Recommended steps for the patient
    actionPlan: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Diagnosis', diagnosisSchema);
