import React from 'react';
import { Play } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function RunButton({ onRun, isRunning = false, disabled = false }) {
  return (
    <button
      onClick={onRun}
      disabled={isRunning || disabled}
      title="Run Code against test cases (Ctrl + Enter)"
      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-150 shadow-md shadow-emerald-950/50
        bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white border border-emerald-400/30
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-emerald-600 disabled:hover:to-teal-600 disabled:active:scale-100"
    >
      {isRunning ? (
        <>
          <LoadingSpinner size="sm" className="text-white" />
          <span className="tracking-wide">Running...</span>
        </>
      ) : (
        <>
          <Play className="w-3.5 h-3.5 fill-white text-white" />
          <span className="tracking-wide">Run</span>
          <span className="hidden lg:inline text-[10px] bg-emerald-950/70 border border-emerald-400/25 text-emerald-200 font-mono px-1.5 py-0.5 rounded font-normal">
            Ctrl+↵
          </span>
        </>
      )}
    </button>
  );
}
