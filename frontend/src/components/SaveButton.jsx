import React from 'react';
import { Save, Check } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function SaveButton({ onSave, isSaving = false, isSaved = false, disabled = false }) {
  return (
    <button
      onClick={onSave}
      disabled={isSaving || disabled}
      title="Save code to cloud (Ctrl + S)"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-sm transition-all duration-150 border
        ${
          isSaved
            ? 'bg-[#252526] border-emerald-500/60 text-emerald-400'
            : 'bg-[#252526] hover:bg-[#2d2d30] border-[#3e3e42] text-zinc-200 hover:text-white'
        }
        disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {isSaving ? (
        <>
          <LoadingSpinner size="sm" className="text-zinc-300" />
          <span>Saving...</span>
        </>
      ) : isSaved ? (
        <>
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Saved</span>
        </>
      ) : (
        <>
          <Save className="w-4 h-4 text-zinc-400" />
          <span>Save</span>
          <span className="hidden lg:inline text-xs text-zinc-500 font-mono ml-0.5">
            Ctrl+S
          </span>
        </>
      )}
    </button>
  );
}
