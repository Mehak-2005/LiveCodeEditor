/**
 * Helper utilities for formatting and data normalization
 */

/**
 * Format ISO date string into readable date and time
 */
export function formatDate(isoString) {
  if (!isoString) return 'Just now';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Normalizes test result response from both Python and Java backend handlers
 */
export function normalizeTestResults(data) {
  if (!data) return null;

  const total = data.totalTestCases ?? data.totalTests ?? (data.results ? data.results.length : 0);
  const passed = data.passedTestCases ?? data.passedTests ?? (data.results ? data.results.filter(r => r.passed).length : 0);
  const failed = data.failedTestCases ?? data.failedTests ?? (total - passed);

  return {
    success: !!data.success,
    questionId: data.questionId || 'two-sum',
    language: data.language || 'python',
    totalTestCases: total,
    passedTestCases: passed,
    failedTestCases: failed,
    error: data.error || null,
    results: (data.results || []).map((tc, idx) => ({
      testCase: tc.testCase ?? (idx + 1),
      passed: !!tc.passed,
      expected: tc.expected !== undefined ? tc.expected : tc.expectedOutput,
      actual: tc.actual !== undefined ? tc.actual : null,
      error: tc.error || null,
    })),
  };
}

/**
 * Pretty-format expected or actual outputs for display
 */
export function formatOutputValue(val) {
  if (val === undefined || val === null) {
    return 'None';
  }
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

/**
 * Decode JWT token payload without external libraries
 */
export function decodeJwt(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload);
  } catch (err) {
    console.error('Failed to parse JWT payload', err);
    return null;
  }
}

/**
 * Check if a JWT is expired
 */
export function isJwtExpired(token) {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) return true;
  const nowInSec = Math.floor(Date.now() / 1000);
  // Consider expired if within 30 seconds of expiration
  return payload.exp < nowInSec + 30;
}
