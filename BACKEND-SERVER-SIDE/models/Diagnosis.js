const mongoose = require('mongoose');

const diagnosisSchema = new mongoose.Schema(
  {
    // The patient who requested the diagnosis
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },

    // Relative path of the uploaded input image inside /uploads
    inputImagePath: {
      type: String,
      default: '',
    },

    // Relative path of the generated output image inside /uploads
    outputImagePath: {
      type: String,
      default: '',
    },

    // Raw detection results returned by the AI server (array of findings, etc.)
    detectionResults: {
      type: mongoose.Schema.Types.Mixed,
    },

  },
  { timestamps: true }
);

module.exports = mongoose.model('Diagnosis', diagnosisSchema);
