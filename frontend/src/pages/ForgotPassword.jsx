import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Terminal,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldCheck,
  Database
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const initialEmail = location.state?.email || '';

  const { forgotPassword, confirmForgotPassword, signIn } = useAuth();

  const [step, setStep] = useState('request'); // 'request' | 'reset' | 'success'
  const [email, setEmail] = useState(initialEmail);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Password rules validation
  const rules = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    match: newPassword.length > 0 && newPassword === confirmPassword,
  };

  /**
   * Helper to format Cognito errors into clear, friendly guidance
   */
  const formatError = (err) => {
    if (err?.type === 'UserNotFoundException') {
      return 'No account was found with this email. Please check your email or create a new account.';
    }
    if (err?.type === 'CodeMismatchException') {
      return 'Invalid verification code. Please check your email inbox and enter the 6-digit code.';
    }
    if (err?.type === 'ExpiredCodeException') {
      return 'Verification code has expired. Please request a new code below.';
    }
    if (err?.type === 'LimitExceededException') {
      return 'Too many attempts. For security, please wait a few minutes before trying again.';
    }
    if (err?.type === 'InvalidPasswordException') {
      return 'The new password does not meet the security criteria.';
    }
    return err?.message || 'An error occurred during password recovery.';
  };

  /**
   * STEP 1: Request verification code to registered email
   */
  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await forgotPassword(trimmedEmail);
      const destination = res?.codeDelivery?.Destination || trimmedEmail;
      setStep('reset');
      setStatusMessage(`A 6-digit verification code has been dispatched to ${destination}.`);
    } catch (err) {
      setErrorMessage(formatError(err));
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * STEP 2: Submit code and set new password
   */
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (!confirmationCode.trim()) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    if (!rules.length || !rules.upper || !rules.lower || !rules.number) {
      setErrorMessage('Please ensure your new password satisfies all security requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await confirmForgotPassword(email, confirmationCode, newPassword);
      setStep('success');
      setStatusMessage('Password updated successfully! Your account and saved code data remain intact.');

      // Attempt automatic sign-in with the new password
      try {
        await signIn(email, newPassword);
        setTimeout(() => {
          navigate('/questions');
        }, 1200);
      } catch {
        // If automatic login fails, redirect to login page
        setTimeout(() => {
          navigate('/login', { state: { email, message: 'Password reset successful! Please log in with your new password.' } });
        }, 1500);
      }
    } catch (err) {
      setErrorMessage(formatError(err));
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Resend verification code
   */
  const handleResendCode = async () => {
    setResending(true);
    setErrorMessage(null);
    try {
      await forgotPassword(email);
      setStatusMessage(`A new verification code was sent to ${email}.`);
    } catch (err) {
      setErrorMessage(formatError(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#080c14] px-4 relative overflow-hidden">
      {/* Background Subtle Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0e1422]/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl p-8 z-10 animate-fade-in relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/25 ring-1 ring-white/20 mb-3.5">
            <Terminal className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {step === 'request' && 'Reset Your Password'}
            {step === 'reset' && 'Create New Password'}
            {step === 'success' && 'Password Updated!'}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
            {step === 'request' && 'Enter your registered email to receive a secure recovery code'}
            {step === 'reset' && `Verify your code and choose a new password for ${email}`}
            {step === 'success' && 'Your account credentials have been securely updated'}
          </p>
        </div>

        {/* Data Preservation Assurance Notice */}
        <div className="mb-5 p-3.5 bg-sky-950/20 border border-sky-500/20 rounded-xl flex items-start gap-2.5 text-xs text-sky-200">
          <Database className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <strong className="text-white block font-semibold">Your data is completely safe:</strong>
            Resetting your password updates only your authentication credentials. All your saved code snippets, problem solutions, and account history remain 100% intact.
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-rose-950/30 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-200 text-xs animate-fade-in shadow-sm">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-5">{errorMessage}</div>
          </div>
        )}

        {/* Status / Success Alert */}
        {statusMessage && (
          <div className="mb-5 p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-emerald-200 text-xs animate-fade-in shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-5">{statusMessage}</div>
          </div>
        )}

        {step === 'request' && (
          /* STEP 1: Enter Registered Email */
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Registered Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="name@example.com"
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/60 transition-all font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-95 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-lg shadow-blue-500/20"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" className="text-white" />
                  <span>Sending verification code...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {step === 'reset' && (
          /* STEP 2: Enter Verification Code & New Password */
          <form onSubmit={handleResetSubmit} className="space-y-4">
            {/* Registered Email confirmation */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Registered Account
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStep('request');
                    setErrorMessage(null);
                    setStatusMessage(null);
                  }}
                  className="text-xs text-sky-400 hover:text-sky-300 font-medium"
                >
                  Change email
                </button>
              </div>
              <div className="w-full bg-[#080c14] border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 font-mono flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate">{email}</span>
              </div>
            </div>

            {/* 6-Digit Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Verification Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={confirmationCode}
                  onChange={(e) => {
                    setConfirmationCode(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="e.g. 123456"
                  maxLength={6}
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-slate-100 font-mono tracking-widest placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/60 transition-all font-sans"
                />
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="••••••••"
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/60 transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="••••••••"
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/60 transition-all font-sans"
                />
              </div>
            </div>

            {/* Password Criteria Checklist */}
            <div className="p-3 bg-[#080c14] border border-slate-800 rounded-xl text-[11px] space-y-1.5">
              <span className="text-slate-400 font-semibold block mb-1">Password Requirements:</span>
              <div className="grid grid-cols-2 gap-1.5 text-slate-400 font-mono">
                <div className={`flex items-center gap-1.5 ${rules.length ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <span>{rules.length ? '✓' : '○'}</span> 8+ characters
                </div>
                <div className={`flex items-center gap-1.5 ${rules.upper ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <span>{rules.upper ? '✓' : '○'}</span> Uppercase letter
                </div>
                <div className={`flex items-center gap-1.5 ${rules.lower ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <span>{rules.lower ? '✓' : '○'}</span> Lowercase letter
                </div>
                <div className={`flex items-center gap-1.5 ${rules.number ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <span>{rules.number ? '✓' : '○'}</span> Number
                </div>
              </div>
              <div className={`pt-1 text-[11px] font-mono flex items-center gap-1.5 ${rules.match ? 'text-emerald-400' : 'text-slate-500'}`}>
                <span>{rules.match ? '✓' : '○'}</span> Passwords match
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-emerald-950/40"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" className="text-white" />
                  <span>Updating password...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Reset Password & Keep Data</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={() => setStep('request')}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                ← Back
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending}
                className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 disabled:opacity-50 font-medium"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                <span>Resend Code</span>
              </button>
            </div>
          </form>
        )}

        {step === 'success' && (
          <div className="space-y-4 py-4 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-sm text-slate-300">
              You can now sign in with your new password. All your previous progress, code snippets, and account data are intact.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2">
              <LoadingSpinner size="sm" className="text-sky-400" />
              <span>Redirecting to your workspace...</span>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400 space-y-2">
          <div>
            Remember your password?{' '}
            <Link
              to="/login"
              className="text-sky-400 hover:text-sky-300 font-semibold"
            >
              Sign In
            </Link>
          </div>
          <div>
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-slate-400 hover:text-slate-200 underline"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
