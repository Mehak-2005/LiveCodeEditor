import React, { useState } from 'react';
import { Terminal, CheckSquare, AlertCircle, Trash2, Clock, PlayCircle, Sparkles } from 'lucide-react';
import TestResults from './TestResults';
import LoadingSpinner from './LoadingSpinner';

export default function OutputPanel({
  resultsData,
  isRunning = false,
  error = null,
  onClear,
}) {
  const [activeTab, setActiveTab] = useState('tests'); // 'tests' | 'console'

  const hasResults = !!resultsData && resultsData.results && resultsData.results.length > 0;
  const hasErrors = !!error || !!resultsData?.error;

  return (
    <div className="flex flex-col h-full bg-[#0a0e17] border-t md:border-t-0 md:border-l border-slate-800/80 overflow-hidden">
      {/* Panel Tab Header */}
      <div className="flex items-center justify-between bg-[#080c14] border-b border-slate-800/80 px-3 py-1.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-lg transition-all ${
              activeTab === 'tests'
                ? 'bg-[#0e1422] text-white border-t-2 border-t-sky-400 border-x border-slate-800/80 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0e1422]/50'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
            <span>Test Results</span>
            {hasResults && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-md text-[10px] font-mono font-semibold ${
                  resultsData.failedTestCases === 0
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {resultsData.passedTestCases}/{resultsData.totalTestCases}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('console')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-lg transition-all ${
              activeTab === 'console'
                ? 'bg-[#0e1422] text-white border-t-2 border-t-sky-400 border-x border-slate-800/80 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0e1422]/50'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span>Console & Logs</span>
            {hasErrors && (
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)] animate-pulse" />
            )}
          </button>
        </div>

        {/* Clear output button */}
        {(hasResults || hasErrors) && (
          <button
            onClick={onClear}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#151d30] rounded-lg transition-colors border border-transparent hover:border-slate-800"
            title="Clear output"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Panel Content Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 select-text">
        {isRunning ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(56,189,248,0.2)]">
              <LoadingSpinner size="lg" className="text-sky-400" />
            </div>
            <div className="text-sm font-semibold text-slate-100">
              Executing test suite in AWS Lambda...
            </div>
            <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Compiling, isolating, and executing against test vectors</span>
            </div>
          </div>
        ) : activeTab === 'tests' ? (
          hasResults ? (
            <TestResults resultsData={resultsData} />
          ) : error ? (
            <div className="p-4 bg-rose-950/30 border border-rose-500/30 rounded-2xl text-rose-200 shadow-lg">
              <div className="flex items-center gap-2 font-semibold text-sm mb-2 text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Execution Failed</span>
              </div>
              <pre className="text-xs font-mono bg-[#070b13] p-3 rounded-xl border border-rose-500/20 whitespace-pre-wrap select-text text-rose-200">
                {error}
              </pre>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <div className="w-14 h-14 rounded-2xl bg-[#0e1422] border border-slate-800 flex items-center justify-center mb-3 text-slate-400 shadow-sm">
                <Terminal className="w-7 h-7 stroke-1 text-sky-400" />
              </div>
              <div className="text-sm font-semibold text-slate-200">No test results yet</div>
              <div className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
                Write your solution in the editor and click <strong className="text-emerald-400 font-semibold">Run (Ctrl+↵)</strong> to validate against test cases.
              </div>
            </div>
          )
        ) : (
          /* Console / Logs Tab */
          <div className="space-y-3 font-mono text-xs">
            {error || resultsData?.error ? (
              <div className="p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-200">
                <div className="text-rose-400 font-bold mb-1.5 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Execution / Runtime Error:</span>
                </div>
                <pre className="whitespace-pre-wrap select-text bg-[#070b13] p-3 rounded-lg border border-rose-500/20 text-rose-300">{error || resultsData?.error}</pre>
              </div>
            ) : null}

            {hasResults ? (
              <div className="p-4 bg-[#0e1422] border border-slate-800 rounded-xl text-slate-300 space-y-2">
                <div className="text-slate-400 font-semibold border-b border-slate-800 pb-2 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>AWS Lambda Execution Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="text-slate-400">Language: <span className="text-sky-400 font-semibold">{resultsData.language}</span></div>
                  <div className="text-slate-400">Question ID: <span className="text-slate-200">{resultsData.questionId}</span></div>
                  <div className="text-slate-400">Total Tests: <span className="text-slate-200">{resultsData.totalTestCases}</span></div>
                  <div className="text-slate-400">Passed: <span className="text-emerald-400 font-semibold">{resultsData.passedTestCases}</span></div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800 text-xs font-semibold">
                  {resultsData.failedTestCases === 0 ? (
                    <span className="text-emerald-400">✓ All test cases passed cleanly.</span>
                  ) : (
                    <span className="text-amber-400">⚠ {resultsData.failedTestCases} test cases failed.</span>
                  )}
                </div>
              </div>
            ) : null}

            {!hasResults && !error && (
              <div className="text-slate-500 italic p-6 text-center">
                Console output is clear.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
