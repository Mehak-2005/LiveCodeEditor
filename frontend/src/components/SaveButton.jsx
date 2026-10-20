import React from 'react';
import { Save, Check } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function SaveButton({ onSave, isSaving = false, isSaved = false, disabled = false }) {
  return (
    <button
      onClick={onSave}
      disabled={isSaving || disabled}
      title="Save code to cloud (Ctrl + S)"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs sm:text-sm transition-all duration-150 border shadow-sm
        ${
          isSaved
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
            : 'bg-[#0e1422] hover:bg-[#151d30] border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white'
        }
        disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isSaving ? (
        <>
          <LoadingSpinner size="sm" className="text-slate-300" />
          <span>Saving...</span>
        </>
      ) : isSaved ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Saved</span>
        </>
      ) : (
        <>
          <Save className="w-3.5 h-3.5 text-slate-400" />
          <span>Save</span>
          <span className="hidden lg:inline text-[10px] bg-[#070b13] border border-slate-800 text-slate-400 font-mono px-1.5 py-0.5 rounded font-normal">
            Ctrl+S
          </span>
        </>
      )}
    </button>
  );
}
