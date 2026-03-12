const axios = require('axios');

const ServiceError = require('../utils/ServiceError');

const AI_SERVER = process.env.AI_SERVER_URL || 'http://localhost:8000';

const askQuestion = async ({ question, context }) => {
  if (!question) {
    throw new ServiceError('question field is required', 400);
  }

  try {
    const aiResponse = await axios.post(
      `${AI_SERVER}/chat`,
      { question, context: context || '' },
      { timeout: 30_000 }
    );

    const data = aiResponse.data;

    return {
      answer: data.answer ?? data,
      raw: data,
    };
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      throw new ServiceError('AI server is unavailable. Please try again later.', 503);
    }

    throw err;
  }
};

module.exports = {
  askQuestion,
};
