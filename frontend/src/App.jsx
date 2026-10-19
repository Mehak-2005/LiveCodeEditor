import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import QuestionLibrary from './pages/QuestionLibrary';
import Editor from './pages/Editor';
import FrameworkWorkspace from './components/FrameworkWorkspace';
import LoadingSpinner from './components/LoadingSpinner';
import FrameworkEditor from './pages/FrameworkEditor';
import { Terminal } from 'lucide-react';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#141414] text-zinc-300">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#007acc] to-[#005a9e] flex items-center justify-center shadow-2xl shadow-[#007acc]/30 mb-5 animate-pulse">
          <Terminal className="w-8 h-8 text-white" />
        </div>
        <div className="text-base font-semibold text-zinc-100 mb-2">Live Code Editor</div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <LoadingSpinner size="sm" className="text-[#007acc]" />
          <span>Verifying AWS Cognito authentication session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicAuthRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  if (isAuthenticated) {
    return <Navigate to="/questions" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route
            path="/login"
            element={
              <PublicAuthRoute>
                <Login />
              </PublicAuthRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicAuthRoute>
                <Signup />
              </PublicAuthRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicAuthRoute>
                <ForgotPassword />
              </PublicAuthRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/questions"
            element={
              <ProtectedRoute>
                <QuestionLibrary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor/:questionId"
            element={
              <ProtectedRoute>
                <Editor />
              </ProtectedRoute>
            }
          />
          
<Route
  path="/frameworks"
  element={
    <ProtectedRoute>
      <FrameworkWorkspace />
    </ProtectedRoute>
  }
/>

<Route
  path="/frameworks/:projectId"
  element={
    <ProtectedRoute>
      <FrameworkEditor />
    </ProtectedRoute>
  }
/>



          {/* Fallbacks */}
          <Route path="/" element={<Navigate to="/questions" replace />} />
          <Route path="*" element={<Navigate to="/questions" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
