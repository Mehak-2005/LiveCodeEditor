import React from 'react';
import { Play } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function RunButton({ onRun, isRunning = false, disabled = false }) {
  return (
    <button
      onClick={onRun}
      disabled={isRunning || disabled}
      title="Run Code against test cases (Ctrl + Enter)"
      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md font-medium text-sm transition-all duration-150 shadow-sm
        bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white
        disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
    >
      {isRunning ? (
        <>
          <LoadingSpinner size="sm" className="text-white" />
          <span className="font-semibold tracking-wide">Running...</span>
        </>
      ) : (
        <>
          <Play className="w-4 h-4 fill-white" />
          <span className="font-semibold tracking-wide">Run</span>
          <span className="hidden lg:inline text-xs text-emerald-200/70 font-mono ml-0.5 font-normal">
            Ctrl+↵
          </span>
        </>
      )}
    </button>
  );
}
