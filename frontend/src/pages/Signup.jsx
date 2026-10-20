import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Terminal, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, KeyRound, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();

  const initialConfirmEmail = location.state?.confirmEmail || '';
  const initialForceConfirm = !!location.state?.forceConfirm;

  const { signUp, confirmSignUp, resendCode, signIn } = useAuth();

  const [step, setStep] = useState(initialForceConfirm ? 'confirm' : 'signup'); // 'signup' | 'confirm'
  const [email, setEmail] = useState(initialConfirmEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Password rules validation
  const rules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    match: password.length > 0 && password === confirmPassword,
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (!rules.length || !rules.upper || !rules.lower || !rules.number) {
      setErrorMessage('Please ensure your password satisfies all security requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await signUp(email, password);
      if (res.isConfirmed) {
        await signIn(email, password);
        navigate('/questions');
      } else {
        setStep('confirm');
        setStatusMessage(`A 6-digit verification code was dispatched to ${email}.`);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (!confirmationCode.trim()) {
      setErrorMessage('Please enter the verification code.');
      return;
    }

    setSubmitting(true);
    try {
      await confirmSignUp(email, confirmationCode);
      setStatusMessage('Account verified successfully! Signing you in...');

      if (password) {
        try {
          await signIn(email, password);
          navigate('/questions');
          return;
        } catch {
          // If auto login fails, route to login
        }
      }

      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setErrorMessage(err.message || 'Verification failed. Please check the code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    setErrorMessage(null);
    try {
      await resendCode(email);
      setStatusMessage(`A new verification code was sent to ${email}.`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#080c14] px-4 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0e1422]/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl p-8 z-10 animate-fade-in relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/25 ring-1 ring-white/20 mb-3.5">
            <Terminal className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {step === 'signup' ? 'Create Your Account' : 'Verify Email Address'}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
            {step === 'signup'
              ? 'Join the Live Code Editor environment & start solving challenges'
              : `Enter the code sent to ${email}`}
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-rose-950/30 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-200 text-xs shadow-sm">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-5">{errorMessage}</div>
          </div>
        )}

        {/* Status message */}
        {statusMessage && (
          <div className="mb-5 p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-emerald-200 text-xs shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-5">{statusMessage}</div>
          </div>
        )}

        {step === 'signup' ? (
          /* STEP 1: Registration Form */
          <form onSubmit={handleSignUpSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/60 transition-all font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-95 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2 shadow-lg shadow-blue-500/20"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" className="text-white" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* STEP 2: Confirmation Code */
          <form onSubmit={handleConfirmSubmit} className="space-y-4">
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
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  placeholder="e.g. 123456"
                  maxLength={6}
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-slate-100 font-mono tracking-widest placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/60 transition-all"
                />
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
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Confirm Account</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={() => setStep('signup')}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                ← Back to Sign Up
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

        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-sky-400 hover:text-sky-300 font-semibold"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
