import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialize session on mount
  useEffect(() => {
    async function initAuth() {
      try {
        const stored = authService.getStoredSession();
        if (stored?.idToken) {
          // Verify token validity
          const validToken = await authService.getValidIdToken();
          if (validToken) {
            setSession(authService.getStoredSession());
          } else {
            authService.clearStoredSession();
            setSession(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        authService.clearStoredSession();
        setSession(null);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const signIn = useCallback(async (email, password) => {
    setAuthError(null);
    try {
      const newSession = await authService.signIn(email, password);
      setSession(newSession);
      return newSession;
    } catch (err) {
      setAuthError(err.message || 'Login failed.');
      throw err;
    }
  }, []);

  const signUp = useCallback(async (email, password) => {
    setAuthError(null);
    try {
      return await authService.signUp(email, password);
    } catch (err) {
      setAuthError(err.message || 'Sign up failed.');
      throw err;
    }
  }, []);

  const confirmSignUp = useCallback(async (email, code) => {
    setAuthError(null);
    try {
      return await authService.confirmSignUp(email, code);
    } catch (err) {
      setAuthError(err.message || 'Verification failed.');
      throw err;
    }
  }, []);

  const resendCode = useCallback(async (email) => {
    setAuthError(null);
    try {
      return await authService.resendConfirmationCode(email);
    } catch (err) {
      setAuthError(err.message || 'Failed to resend code.');
      throw err;
    }
  }, []);

  const forgotPassword = useCallback(async (email) => {
    setAuthError(null);
    try {
      return await authService.forgotPassword(email);
    } catch (err) {
      setAuthError(err.message || 'Failed to request password reset.');
      throw err;
    }
  }, []);

  const confirmForgotPassword = useCallback(async (email, code, newPassword) => {
    setAuthError(null);
    try {
      return await authService.confirmForgotPassword(email, code, newPassword);
    } catch (err) {
      setAuthError(err.message || 'Failed to reset password.');
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setSession(null);
    setAuthError(null);
  }, []);

  const getIdToken = useCallback(async () => {
    const token = await authService.getValidIdToken();
    if (!token && session) {
      // Session has completely expired and cannot be refreshed
      setSession(null);
    }
    return token;
  }, [session]);

  const value = {
    user: session?.user || null,
    idToken: session?.idToken || null,
    isAuthenticated: !!session?.idToken,
    loading,
    authError,
    setAuthError,
    signIn,
    signUp,
    confirmSignUp,
    resendCode,
    forgotPassword,
    confirmForgotPassword,
    signOut,
    getIdToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
