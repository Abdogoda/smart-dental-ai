const axios = require('axios');
const mongoose = require('mongoose');

const ChatSession = require('../models/ChatSession');
const Diagnosis = require('../models/Diagnosis');
const ServiceError = require('../utils/ServiceError');

const AI_SERVER = process.env.AI_SERVER_URL || 'http://localhost:8000';

const requirePatient = (patient_id) => {
  if (!patient_id) {
    throw new ServiceError('Authenticated patient is required', 401);
  }
};

const validateObjectId = (value, fieldName) => {
  if (value && !mongoose.Types.ObjectId.isValid(value)) {
    throw new ServiceError(`${fieldName} is invalid`, 400);
  }
};

const requireDiagnosis = (diagnosis_id) => {
  if (!diagnosis_id) {
    throw new ServiceError('diagnosis_id is required. Chat is only available through a diagnosis.', 400);
  }
};

const formatDiagnosisContext = (diagnosis) => {
  if (!diagnosis) {
    return '';
  }

  const findings = diagnosis.detectionResults;
  if (!findings) {
    return 'Diagnosis report is available but contains no structured findings.';
  }

  if (typeof findings === 'string') {
    return `[BACKGROUND ONLY — do not mention this unless the patient asks]:\n${findings}`;
  }

  return `[BACKGROUND ONLY — do not mention this unless the patient asks]:\n${JSON.stringify(findings, null, 2)}`;
};

const extractSessionMessages = (session) => {
  if (!session) {
    return [];
  }

  if (Array.isArray(session.messages)) {
    return session.messages;
  }

  // Backward compatibility for legacy records that used the old `message` key.
  if (Array.isArray(session.message)) {
    return session.message;
  }

  return [];
};

const formatHistoryContext = (messages = []) => {
  if (!messages.length) {
    return '';
  }

  const historyLines = messages
    .slice(-12)
    .map((item) => `patient: ${item.question}\nassistant: ${item.answer}`)
    .join('\n');

  return `Conversation history:\n${historyLines}`;
};

const normalizeAnswer = (data) => {
  if (typeof data?.answer === 'string') {
    return data.answer;
  }

  if (typeof data === 'string') {
    return data;
  }

  return JSON.stringify(data);
};

const getDiagnosisForPatient = async ({ patient_id, diagnosis_id }) => {
  requirePatient(patient_id);
  requireDiagnosis(diagnosis_id);
  validateObjectId(diagnosis_id, 'diagnosis_id');

  const diagnosis = await Diagnosis.findOne({ _id: diagnosis_id, patientId: patient_id });
  if (!diagnosis) {
    throw new ServiceError('Diagnosis not found for this patient', 404);
  }

  return diagnosis;
};

const askQuestion = async ({ question, patient_id, diagnosis_id }) => {
  const trimmedQuestion = typeof question === 'string' ? question.trim() : '';
  if (!trimmedQuestion) {
    throw new ServiceError('question field is required', 400);
  }

  const diagnosis = await getDiagnosisForPatient({ patient_id, diagnosis_id });
  let session = await ChatSession.findOne({ diagnosis_id: diagnosis_id });

  if (!session) {
    session = await ChatSession.create({
      diagnosis_id: diagnosis_id,
    });
  }

  const sessionMessages = extractSessionMessages(session);
  const diagnosisContext = formatDiagnosisContext(diagnosis);
  const historyContext = formatHistoryContext(sessionMessages);
  const combinedContext = [diagnosisContext, historyContext].filter(Boolean).join('\n\n');

  try {
    const aiResponse = await axios.post(
      `${AI_SERVER}/chat`,
      { question: trimmedQuestion, context: combinedContext },
      { timeout: 30_000 }
    );

    const data = aiResponse.data;
    const answerText = normalizeAnswer(data);

    session.messages = [...sessionMessages, { question: trimmedQuestion, answer: answerText }];
    session.last_active = new Date();
    await session.save();

    return {
      diagnosis_id: session.diagnosis_id,
      last_active: session.last_active,
      question: trimmedQuestion,
      answer: data.answer ?? data,
    };
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      throw new ServiceError('AI server is unavailable. Please try again later.', 503);
    }

    throw err;
  }
};

const getSessionByDiagnosis = async ({ patient_id, diagnosis_id }) => {
  await getDiagnosisForPatient({ patient_id, diagnosis_id });

  const session = await ChatSession.findOne({ diagnosis_id }).lean();

  if (session && !Array.isArray(session.messages) && Array.isArray(session.message)) {
    session.messages = session.message;
  }

  return {
    diagnosis_id,
    session,
  };
};

const getAllChatsForPatient = async (patient_id) => {
  requirePatient(patient_id);

  const diagnoses = await Diagnosis.find({ patientId: patient_id }).select('_id').lean();
  const diagnosisIds = diagnoses.map((item) => item._id);

  if (!diagnosisIds.length) {
    return {
      count: 0,
      chats: [],
    };
  }

  const sessions = await ChatSession.find({ diagnosis_id: { $in: diagnosisIds } })
    .sort({ last_active: -1 })
    .lean();

  const chats = sessions.map((session) => ({
    ...session,
    messages: extractSessionMessages(session),
  }));

  return {
    count: chats.length,
    chats,
  };
};

const getMessagesByDiagnosis = async ({ patient_id, diagnosis_id }) => {
  await getDiagnosisForPatient({ patient_id, diagnosis_id });

  const session = await ChatSession.findOne({ diagnosis_id }).lean();
  const messages = extractSessionMessages(session);

  return {
    diagnosis_id,
    messages,
  };
};

module.exports = {
  askQuestion,
  getAllChatsForPatient,
  getMessagesByDiagnosis,
  getSessionByDiagnosis,
};
