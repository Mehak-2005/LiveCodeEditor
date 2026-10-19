/**
 * AWS Cognito Authentication Service
 * Direct client-side integration using AWS Cognito Identity Provider REST API
 */

import { decodeJwt, isJwtExpired } from '../utils/helpers';

const REGION = import.meta.env.VITE_AWS_REGION || 'ap-south-1';
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '2p1fmfr1nic8mu9nubkb7o9jmn';
const COGNITO_ENDPOINT = `https://cognito-idp.${REGION}.amazonaws.com/`;

const STORAGE_KEY = 'livecode_cognito_auth_session';

/**
 * Execute a low-level Cognito API request
 */
async function callCognito(target, payload) {
  try {
    const response = await fetch(COGNITO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || data.__type || 'Authentication failed');
      error.type = (data.__type || '').split('#').pop();
      error.statusCode = response.status;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.type) throw err;
    const networkErr = new Error(err.message || 'Unable to connect to authentication service.');
    networkErr.type = 'NetworkError';
    throw networkErr;
  }
}

/**
 * Sign up a new user with email and password
 */
export async function signUp(email, password) {
  const trimmedEmail = email.trim();
  const data = await callCognito('SignUp', {
    ClientId: CLIENT_ID,
    Username: trimmedEmail,
    Password: password,
    UserAttributes: [
      {
        Name: 'email',
        Value: trimmedEmail,
      },
    ],
  });

  return {
    isConfirmed: !!data.UserConfirmed,
    userSub: data.UserSub,
    codeDelivery: data.CodeDeliveryDetails,
    email: trimmedEmail,
  };
}

/**
 * Confirm user signup with email verification code
 */
export async function confirmSignUp(email, code) {
  const trimmedEmail = email.trim();
  const trimmedCode = code.trim();

  await callCognito('ConfirmSignUp', {
    ClientId: CLIENT_ID,
    Username: trimmedEmail,
    ConfirmationCode: trimmedCode,
  });

  return { success: true };
}

/**
 * Resend verification code
 */
export async function resendConfirmationCode(email) {
  const trimmedEmail = email.trim();
  const data = await callCognito('ResendConfirmationCode', {
    ClientId: CLIENT_ID,
    Username: trimmedEmail,
  });

  return {
    delivery: data.CodeDeliveryDetails,
  };
}

/**
 * Initiate password reset flow for a registered user.
 * Sends a verification code to their registered email address.
 * Preserves all user profile details, DynamoDB records, and account data.
 */
export async function forgotPassword(email) {
  const trimmedEmail = email.trim();
  const data = await callCognito('ForgotPassword', {
    ClientId: CLIENT_ID,
    Username: trimmedEmail,
  });

  return {
    delivery: data.CodeDeliveryDetails,
    email: trimmedEmail,
  };
}

/**
 * Confirm the new password using the received verification code.
 * Updates ONLY the password credentials on the existing Cognito user.
 * Existing user identity ('sub') and all associated saved code remain 100% intact.
 */
export async function confirmForgotPassword(email, code, newPassword) {
  const trimmedEmail = email.trim();
  const trimmedCode = code.trim();

  await callCognito('ConfirmForgotPassword', {
    ClientId: CLIENT_ID,
    Username: trimmedEmail,
    ConfirmationCode: trimmedCode,
    Password: newPassword,
  });

  return { success: true };
}

/**
 * Sign in using email and password (USER_PASSWORD_AUTH flow)
 */
export async function signIn(email, password) {
  const trimmedEmail = email.trim();

  const data = await callCognito('InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: trimmedEmail,
      PASSWORD: password,
    },
  });

  if (data.ChallengeName) {
    const error = new Error(`Unsupported challenge: ${data.ChallengeName}`);
    error.type = data.ChallengeName;
    throw error;
  }

  const result = data.AuthenticationResult;
  if (!result || !result.IdToken) {
    throw new Error('Authentication succeeded but received no ID token.');
  }

  const payload = decodeJwt(result.IdToken);

  const session = {
    idToken: result.IdToken,
    accessToken: result.AccessToken,
    refreshToken: result.RefreshToken,
    expiresAt: payload?.exp ? payload.exp * 1000 : Date.now() + (result.ExpiresIn || 3600) * 1000,
    user: {
      email: payload?.email || trimmedEmail,
      sub: payload?.sub || '',
    },
  };

  saveSession(session);
  return session;
}

/**
 * Refresh an existing authentication session using refreshToken
 */
export async function refreshAuthSession() {
  const current = getStoredSession();
  if (!current || !current.refreshToken) {
    clearStoredSession();
    return null;
  }

  try {
    const data = await callCognito('InitiateAuth', {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: current.refreshToken,
      },
    });

    const result = data.AuthenticationResult;
    if (!result || !result.IdToken) {
      throw new Error('Refresh token exchange produced no ID token');
    }

    const payload = decodeJwt(result.IdToken);

    const updatedSession = {
      ...current,
      idToken: result.IdToken,
      accessToken: result.AccessToken || current.accessToken,
      // RefreshToken might not be returned in refresh responses if still valid
      refreshToken: result.RefreshToken || current.refreshToken,
      expiresAt: payload?.exp ? payload.exp * 1000 : Date.now() + (result.ExpiresIn || 3600) * 1000,
    };

    saveSession(updatedSession);
    return updatedSession;
  } catch (err) {
    console.warn('Session refresh failed:', err);
    clearStoredSession();
    return null;
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  clearStoredSession();
}

/**
 * Retrieve current valid ID token, refreshing if necessary
 */
export async function getValidIdToken() {
  const session = getStoredSession();
  if (!session || !session.idToken) return null;

  if (isJwtExpired(session.idToken)) {
    const refreshed = await refreshAuthSession();
    return refreshed ? refreshed.idToken : null;
  }

  return session.idToken;
}

/**
 * Storage helpers
 */
export function getStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSession(session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('Failed to save session to localStorage', err);
  }
}

export function clearStoredSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear session from localStorage', err);
  }
}
