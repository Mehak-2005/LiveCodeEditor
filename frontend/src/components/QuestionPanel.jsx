import React from 'react';
import { BookOpen, CheckCircle, Code, Layers, FileQuestion, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function QuestionPanel({ question, loading = false, error = null, onRetry }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#0a0e17] border-r border-slate-800/80 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-800/60 rounded-xl animate-pulse"></div>
          <div className="h-6 w-44 bg-slate-800/60 rounded-lg animate-pulse"></div>
        </div>
        <div className="h-4 w-28 bg-slate-800/60 rounded-md animate-pulse"></div>
        <div className="space-y-2 pt-4">
          <div className="h-3.5 w-full bg-slate-800/40 rounded animate-pulse"></div>
          <div className="h-3.5 w-5/6 bg-slate-800/40 rounded animate-pulse"></div>
          <div className="h-3.5 w-4/6 bg-slate-800/40 rounded animate-pulse"></div>
        </div>
        <div className="h-24 w-full bg-slate-800/30 rounded-xl animate-pulse pt-4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0a0e17] border-r border-slate-800/80 p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-3">
          <FileQuestion className="w-6 h-6 text-rose-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-100 mb-1">Problem Not Found</h3>
        <p className="text-xs text-slate-400 max-w-xs mb-5 leading-relaxed">{error}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3.5 py-1.5 text-xs bg-[#0e1422] hover:bg-[#151d30] border border-slate-800 text-slate-200 rounded-lg font-medium transition-colors"
            >
              Retry
            </button>
          )}
          <button
            onClick={() => navigate('/questions')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-lg font-semibold shadow-md shadow-blue-500/20 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Problem Library</span>
          </button>
        </div>
      </div>
    );
  }

  if (!question) return null;

  const diffKey = (question.difficulty || 'easy').toLowerCase();
  const difficultyConfig = {
    easy: {
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.12)]',
      dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
    },
    medium: {
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.12)]',
      dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
    },
    hard: {
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.12)]',
      dot: 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]',
    },
  }[diffKey] || {
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-400',
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0e17] border-r border-slate-800/80 overflow-y-auto select-text">
      {/* Panel Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-[#0e1422]/90 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
              {question.title || 'Coding Problem'}
            </h1>
          </div>

          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium border capitalize shrink-0 ${difficultyConfig.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${difficultyConfig.dot}`} />
            <span>{question.difficulty || 'Easy'}</span>
          </span>
        </div>

        {/* Metadata Tags */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 bg-[#070b13] px-2.5 py-1 rounded-md border border-slate-800 font-mono text-[11px] font-medium text-slate-300">
            <Layers className="w-3 h-3 text-slate-400" />
            <span className="capitalize">{question.questionType || 'Function'}</span>
          </span>

          {question.testCaseCount !== undefined && (
            <span className="flex items-center gap-1.5 bg-[#070b13] px-2.5 py-1 rounded-md border border-slate-800 font-mono text-[11px] font-medium text-emerald-400">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span>{question.testCaseCount} Test Cases</span>
            </span>
          )}
        </div>
      </div>

      {/* Panel Body Content */}
      <div className="p-4 sm:p-5 space-y-5 text-sm text-slate-300 leading-relaxed font-sans">
        {/* Description Section */}
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Description
          </h2>
          <div className="whitespace-pre-line text-slate-200 bg-[#0e1422]/70 p-4 rounded-xl border border-slate-800/80 leading-6 text-xs sm:text-sm">
            {question.description}
          </div>
        </div>

        {/* Function Signature */}
        {question.functionSignature && (
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-sky-400" />
              <span>Function Signature</span>
            </h2>
            <div className="bg-[#070b13] border border-slate-800 rounded-xl p-3 font-mono text-xs text-cyan-300 select-all overflow-x-auto shadow-inner">
              {typeof question.functionSignature === 'string'
                ? question.functionSignature
                : JSON.stringify(question.functionSignature, null, 2)}
            </div>
          </div>
        )}

        {/* Example Walkthrough */}
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Example 1
          </h2>
          <div className="bg-[#0e1422]/70 border border-slate-800/80 rounded-xl p-3.5 space-y-2 text-xs font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-slate-400 font-sans text-xs w-12 shrink-0">Input:</span>
              <span className="bg-[#070b13] px-2.5 py-1 rounded border border-slate-800 text-slate-200 flex-1">
                nums = [2, 7, 11, 15], target = 9
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-slate-400 font-sans text-xs w-12 shrink-0">Output:</span>
              <span className="bg-[#070b13] px-2.5 py-1 rounded border border-emerald-500/30 text-emerald-400 font-semibold flex-1">
                [0, 1]
              </span>
            </div>
            <div className="text-slate-400 text-[11px] pt-1.5 border-t border-slate-800/70 font-sans leading-relaxed">
              Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
            </div>
          </div>
        </div>

        {/* Constraints */}
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Constraints & Notes
          </h2>
          <div className="bg-[#0e1422]/40 border border-slate-800/60 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-400 font-sans">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
              <span>Each input has exactly one valid solution.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
              <span>You may not use the same element twice.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
              <span>You can return the answer in any order.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
