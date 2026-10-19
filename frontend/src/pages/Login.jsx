import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Terminal, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, authError, setAuthError } = useAuth();

  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successNotice, setSuccessNotice] = useState(location.state?.message || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!email.trim() || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email, password);
      // After login -> Question Library
      navigate('/questions');
    } catch (err) {
      if (err.type === 'UserNotConfirmedException') {
        navigate('/signup', { state: { confirmEmail: email.trim(), forceConfirm: true } });
        return;
      }
      setLocalError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#141414] px-4 relative overflow-hidden">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#007acc]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#1e1e1e] border border-[#333333] rounded-xl shadow-2xl p-8 z-10 animate-fade-in">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#007acc] to-[#005a9e] flex items-center justify-center shadow-lg shadow-[#007acc]/20 mb-3">
            <Terminal className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
            Live Code Editor
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Authenticate with AWS Cognito to access your live coding environment
          </p>
        </div>

        {/* Success Alert (e.g., from password reset) */}
        {successNotice && (
          <div className="mb-6 p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg flex items-start gap-2.5 text-emerald-200 text-xs animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-5">{successNotice}</div>
          </div>
        )}

        {/* Error Alert */}
        {(localError || authError) && (
          <div className="mb-6 p-3 bg-rose-950/40 border border-rose-500/40 rounded-lg flex items-start gap-2.5 text-rose-200 text-xs animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-5">{localError || authError}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setLocalError('');
                  setSuccessNotice('');
                }}
                placeholder="name@example.com"
                className="w-full bg-[#181818] border border-[#3e3e42] rounded-lg py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#007acc] focus:border-[#007acc] transition-colors font-sans"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-zinc-300">
                Password
              </label>
              <Link
                to="/forgot-password"
                state={{ email: email.trim() }}
                className="text-xs text-[#007acc] hover:underline hover:text-[#1f8ad2] transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLocalError('');
                }}
                placeholder="••••••••"
                className="w-full bg-[#181818] border border-[#3e3e42] rounded-lg py-2.5 pl-9 pr-10 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#007acc] focus:border-[#007acc] transition-colors font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg bg-[#007acc] hover:bg-[#1f8ad2] active:bg-[#0062a3] text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-sm"
          >
            {submitting ? (
              <>
                <LoadingSpinner size="sm" className="text-white" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In to Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-6 pt-5 border-t border-[#333333] text-center text-xs text-zinc-400 space-y-2">
          <div>
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-[#007acc] hover:underline font-medium"
            >
              Create Account
            </Link>
          </div>
          <div>
            Need to confirm an unverified email?{' '}
            <button
              onClick={() => navigate('/signup', { state: { confirmEmail: email, forceConfirm: true } })}
              className="text-zinc-400 hover:text-zinc-200 underline"
            >
              Verify Code
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
