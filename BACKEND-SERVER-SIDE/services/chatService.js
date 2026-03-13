const axios = require('axios');
const mongoose = require('mongoose');

const ChatSession = require('../models/ChatSession');
const Diagnosis = require('../models/Diagnosis');
const ServiceError = require('../utils/ServiceError');

const AI_SERVER = process.env.AI_SERVER_URL || 'http://localhost:8000';
const DEFAULT_DIRECT_CONTEXT = 'You are a dental AI assistant. Provide safe, clear, and practical guidance in simple language.';
const RESPONSE_STYLE_RULE = [
  'STRICT INSTRUCTIONS (follow exactly):',
  '- You are a dental assistant in an ongoing conversation.',
  '- The patient ALREADY KNOWS their diagnosis. Do NOT restate, summarize, or reference it unless they explicitly ask.',
  '- Answer ONLY what the user is asking in their latest message.',
  '- If the user sends a short social message (e.g. "ok", "thanks", "great"), reply briefly and politely — nothing medical.',
  '- Keep answers concise and conversational.',
].join('\n');

const requireUser = (user_id) => {
  if (!user_id) {
    throw new ServiceError('Authenticated user is required', 401);
  }
};

const validateObjectId = (value, fieldName) => {
  if (value && !mongoose.Types.ObjectId.isValid(value)) {
    throw new ServiceError(`${fieldName} is invalid`, 400);
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
    return `[BACKGROUND ONLY — do not mention this unless the user asks]:\n${findings}`;
  }

  return `[BACKGROUND ONLY — do not mention this unless the user asks]:\n${JSON.stringify(findings, null, 2)}`;
};

const formatHistoryContext = (messages = []) => {
  if (!messages.length) {
    return '';
  }

  const historyLines = messages
    .slice(-12)
    .map((item) => `user: ${item.question}\nassistant: ${item.answer}`)
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

const askQuestion = async ({ question, context, user_id, diagnosis_id, session_id }) => {
  if (!question) {
    throw new ServiceError('question field is required', 400);
  }

  requireUser(user_id);
  validateObjectId(session_id, 'session_id');
  validateObjectId(diagnosis_id, 'diagnosis_id');

  let session = null;
  let effectiveDiagnosisId = diagnosis_id || null;

  if (session_id) {
    session = await ChatSession.findOne({ _id: session_id, user_id });

    if (!session) {
      throw new ServiceError('Chat session not found for this user', 404);
    }

    if (effectiveDiagnosisId && String(session.diagnosis_id || '') !== String(effectiveDiagnosisId)) {
      throw new ServiceError('session_id and diagnosis_id do not match', 400);
    }

    if (!effectiveDiagnosisId && session.diagnosis_id) {
      effectiveDiagnosisId = session.diagnosis_id;
    }

  }

  let diagnosis = null;
  if (effectiveDiagnosisId) {
    diagnosis = await Diagnosis.findOne({ _id: effectiveDiagnosisId, userId: user_id });
    if (!diagnosis) {
      throw new ServiceError('Diagnosis not found for this user', 404);
    }
  }

  const contextParts = [];
  contextParts.push(RESPONSE_STYLE_RULE);

  const diagnosisContext = formatDiagnosisContext(diagnosis);
  if (diagnosisContext) {
    contextParts.push(diagnosisContext);
  }

  const userContext = typeof context === 'string' ? context.trim() : '';
  if (userContext) {
    contextParts.push(`User-provided context:\n${userContext}`);
  }

  const historyContext = formatHistoryContext(session?.message || []);
  if (historyContext) {
    contextParts.push(historyContext);
  }

  const combinedContext = contextParts.length > 0 ? contextParts.join('\n\n') : DEFAULT_DIRECT_CONTEXT;

  try {
    const aiResponse = await axios.post(
      `${AI_SERVER}/chat`,
      { question, context: combinedContext },
      { timeout: 30_000 }
    );

    const data = aiResponse.data;
    const answerText = normalizeAnswer(data);

    if (!session) {
      session = await ChatSession.create({
        user_id,
        diagnosis_id: effectiveDiagnosisId,
      });
    }

    session.message.push({ question, answer: answerText });
    session.last_active = new Date();
    await session.save();

    return {
      session_id: session._id,
      diagnosis_id: session.diagnosis_id,
      last_active: session.last_active,
      question: question,
      answer: data.answer ?? data,
    };
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      throw new ServiceError('AI server is unavailable. Please try again later.', 503);
    }

    throw err;
  }
};

const getAllSessions = async (user_id) => {
  requireUser(user_id);

  const sessions = await ChatSession.find({ user_id })
    .sort({ last_active: -1 })
    .lean();

  return {
    count: sessions.length,
    sessions,
  };
};

const getSessionById = async ({ user_id, session_id }) => {
  requireUser(user_id);

  if (!session_id) {
    throw new ServiceError('session_id is required', 400);
  }

  validateObjectId(session_id, 'session_id');

  const session = await ChatSession.findOne({ _id: session_id, user_id }).lean();
  if (!session) {
    throw new ServiceError('Chat session not found for this user', 404);
  }

  return { session };
};

module.exports = {
  askQuestion,
  getAllSessions,
  getSessionById,
};
