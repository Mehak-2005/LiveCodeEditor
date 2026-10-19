import React from 'react';
import { BookOpen, CheckCircle, Code, Layers, FileQuestion, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function QuestionPanel({ question, loading = false, error = null, onRetry }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#1e1e1e] border-r border-[#333333] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-[#2d2d30] rounded animate-pulse"></div>
          <div className="h-6 w-48 bg-[#2d2d30] rounded animate-pulse"></div>
        </div>
        <div className="h-4 w-24 bg-[#2d2d30] rounded animate-pulse"></div>
        <div className="space-y-2 pt-4">
          <div className="h-3.5 w-full bg-[#2d2d30] rounded animate-pulse"></div>
          <div className="h-3.5 w-5/6 bg-[#2d2d30] rounded animate-pulse"></div>
          <div className="h-3.5 w-4/6 bg-[#2d2d30] rounded animate-pulse"></div>
        </div>
        <div className="h-20 w-full bg-[#2d2d30] rounded-lg animate-pulse pt-4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#1e1e1e] border-r border-[#333333] p-6 text-center">
        <FileQuestion className="w-12 h-12 text-rose-400 mb-3" />
        <h3 className="text-base font-semibold text-zinc-200 mb-1">Problem Not Found</h3>
        <p className="text-xs text-zinc-400 max-w-xs mb-4 leading-relaxed">{error}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3.5 py-1.5 text-xs bg-[#252526] hover:bg-[#2d2d30] border border-[#3e3e42] text-zinc-200 rounded font-medium transition-colors"
            >
              Retry
            </button>
          )}
          <button
            onClick={() => navigate('/questions')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs bg-[#007acc] hover:bg-[#1f8ad2] text-white rounded font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Problem Library</span>
          </button>
        </div>
      </div>
    );
  }

  if (!question) return null;

  const difficultyColor = {
    easy: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-950/80 text-amber-400 border-amber-500/30',
    hard: 'bg-rose-950/80 text-rose-400 border-rose-500/30',
  }[(question.difficulty || 'easy').toLowerCase()] || 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30';

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-r border-[#333333] overflow-y-auto select-text">
      {/* Panel Header */}
      <div className="p-5 border-b border-[#333333] bg-[#252526]/50">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#007acc]" />
            <h1 className="text-lg font-bold text-zinc-100 tracking-tight">
              {question.title || 'Coding Problem'}
            </h1>
          </div>

          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border capitalize ${difficultyColor}`}>
            {question.difficulty || 'Easy'}
          </span>
        </div>

        {/* Metadata Tags */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <span className="flex items-center gap-1 bg-[#181818] px-2 py-0.5 rounded border border-[#333333]">
            <Layers className="w-3 h-3 text-zinc-500" />
            <span className="capitalize">{question.questionType || 'Function'}</span>
          </span>

          {question.testCaseCount !== undefined && (
            <span className="flex items-center gap-1 bg-[#181818] px-2 py-0.5 rounded border border-[#333333]">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span>{question.testCaseCount} Test Cases</span>
            </span>
          )}
        </div>
      </div>

      {/* Panel Body Content */}
      <div className="p-5 space-y-6 text-sm text-zinc-300 leading-relaxed font-sans">
        {/* Description Section */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Description
          </h2>
          <p className="whitespace-pre-line text-zinc-200 bg-[#252526]/30 p-3.5 rounded-lg border border-[#333333]/60 leading-6">
            {question.description}
          </p>
        </div>

        {/* Function Signature */}
        {question.functionSignature && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-[#007acc]" />
              <span>Function Signature</span>
            </h2>
            <div className="bg-[#181818] border border-[#333333] rounded-md p-3 font-mono text-xs text-cyan-300 select-all overflow-x-auto">
              {typeof question.functionSignature === 'string'
                ? question.functionSignature
                : JSON.stringify(question.functionSignature, null, 2)}
            </div>
          </div>
        )}

        {/* Example Walkthrough */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Example 1
          </h2>
          <div className="bg-[#181818] border border-[#333333] rounded-lg p-3 space-y-1.5 font-mono text-xs">
            <div className="text-zinc-300">
              <span className="text-zinc-500 font-sans">Input:</span> nums = [2, 7, 11, 15], target = 9
            </div>
            <div className="text-emerald-400">
              <span className="text-zinc-500 font-sans">Output:</span> [0, 1]
            </div>
            <div className="text-zinc-400 text-[11px] pt-1 border-t border-[#2a2a2a] font-sans">
              Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
            </div>
          </div>
        </div>

        {/* Constraints */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Constraints & Notes
          </h2>
          <ul className="list-disc list-inside space-y-1 text-xs text-zinc-400">
            <li>Each input has exactly one valid solution.</li>
            <li>You may not use the same element twice.</li>
            <li>You can return the answer in any order.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
