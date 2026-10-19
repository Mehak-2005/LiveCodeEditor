/**
 * Centralized AWS API Gateway service client
 *
 * Communicates with the deployed AWS Serverless Backend:
 * - GET  /question     (Retrieve question details and starter code)
 * - GET  /questions    (List all available questions)
 * - POST /run          (Execute Python/Java code in AWS Lambda)
 * - POST /save         (Save user code to DynamoDB)
 * - GET  /saved-code   (Retrieve authenticated user's saved code)
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://ehy8q4vw9b.execute-api.ap-south-1.amazonaws.com/Prod';

/**
 * Helper to process fetch responses and format errors consistently
 */
async function handleResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch (err) {
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      throw error;
    }
    return null;
  }

  if (!response.ok) {
    const message =
      (data && (data.error || data.message)) ||
      `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Format Bearer auth header from token string
 */
function getAuthHeader(token) {
  if (!token) return {};
  const cleaned = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  return { Authorization: cleaned };
}

/**
 * Fetch a specific question and optional language-specific starter code
 *
 * @param {string} questionId
 * @param {string} [language]
 * @returns {Promise<Object>}
 */
export async function getQuestion(questionId, language) {
  const params = new URLSearchParams();
  if (questionId) params.append('questionId', questionId);
  if (language) params.append('language', language);

  const url = `${API_BASE_URL}/question?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return handleResponse(response);
}

/**
 * Fetch all available coding questions for the Question Library
 *
 * @returns {Promise<Object>}
 */
export async function getQuestions() {
  const response = await fetch(`${API_BASE_URL}/questions`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return handleResponse(response);
}

export const listQuestions = getQuestions;

/**
 * Execute Python or Java code against protected test cases in AWS Lambda
 *
 * @param {string} questionId
 * @param {string} language ('python' | 'java')
 * @param {string} code
 * @param {string} token Cognito ID token
 * @returns {Promise<Object>}
 */
export async function runCode(questionId, language, code, token) {
  const response = await fetch(`${API_BASE_URL}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(token),
    },
    body: JSON.stringify({
      questionId,
      language,
      code,
    }),
  });

  return handleResponse(response);
}

/**
 * Save user code submission to DynamoDB
 * Note: userId is strictly extracted by backend from Cognito token claims
 *
 * @param {string} questionId
 * @param {string} language
 * @param {string} code
 * @param {string} token Cognito ID token
 * @returns {Promise<Object>}
 */
export async function saveCode(questionId, language, code, token) {
  const response = await fetch(`${API_BASE_URL}/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(token),
    },
    body: JSON.stringify({
      questionId,
      language,
      code,
    }),
  });

  return handleResponse(response);
}

/**
 * Retrieve saved code history for the authenticated Cognito user
 *
 * @param {string} token Cognito ID token
 * @returns {Promise<Object>}
 */
export async function getSavedCode(token) {
  const response = await fetch(`${API_BASE_URL}/saved-code`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(token),
    },
  });

  return handleResponse(response);
}

export default {
  getQuestion,
  getQuestions,
  listQuestions,
  runCode,
  saveCode,
  getSavedCode,
};
