import React, { useState } from 'react';
import { Terminal, CheckSquare, AlertCircle, Trash2, Clock } from 'lucide-react';
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
    <div className="flex flex-col h-full bg-[#1e1e1e] border-t md:border-t-0 md:border-l border-[#333333] overflow-hidden">
      {/* Panel Tab Header */}
      <div className="flex items-center justify-between bg-[#252526] border-b border-[#333333] px-3 py-1.5 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-t transition-colors ${
              activeTab === 'tests'
                ? 'bg-[#1e1e1e] text-zinc-100 border-t-2 border-[#007acc]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#2a2d2e]'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Test Results</span>
            {hasResults && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  resultsData.failedTestCases === 0
                    ? 'bg-emerald-950 text-emerald-400'
                    : 'bg-rose-950 text-rose-400'
                }`}
              >
                {resultsData.passedTestCases}/{resultsData.totalTestCases}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('console')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-t transition-colors ${
              activeTab === 'console'
                ? 'bg-[#1e1e1e] text-zinc-100 border-t-2 border-[#007acc]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#2a2d2e]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Console & Logs</span>
            {hasErrors && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            )}
          </button>
        </div>

        {/* Clear output button */}
        {(hasResults || hasErrors) && (
          <button
            onClick={onClear}
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-[#333333] rounded transition-colors"
            title="Clear output"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Panel Content Body */}
      <div className="flex-1 overflow-y-auto p-4 select-text">
        {isRunning ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-400">
            <LoadingSpinner size="lg" className="text-[#007acc] mb-4" />
            <div className="text-sm font-medium text-zinc-200">
              Executing code against backend test suite...
            </div>
            <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Compiling and running in AWS Lambda</span>
            </div>
          </div>
        ) : activeTab === 'tests' ? (
          hasResults ? (
            <TestResults resultsData={resultsData} />
          ) : error ? (
            <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-lg text-rose-200">
              <div className="flex items-center gap-2 font-semibold text-sm mb-2 text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Execution Failed</span>
              </div>
              <pre className="text-xs font-mono bg-[#181818] p-3 rounded border border-[#333333] whitespace-pre-wrap select-text text-rose-200">
                {error}
              </pre>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
              <Terminal className="w-10 h-10 text-zinc-600 mb-3 stroke-1" />
              <div className="text-sm font-medium text-zinc-400">No test results yet</div>
              <div className="text-xs text-zinc-500 mt-1 max-w-xs">
                Write your code in the editor and click <strong className="text-emerald-400 font-normal">Run</strong> to validate against test cases.
              </div>
            </div>
          )
        ) : (
          /* Console / Logs Tab */
          <div className="space-y-3 font-mono text-xs">
            {error || resultsData?.error ? (
              <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded text-rose-200">
                <div className="text-rose-400 font-bold mb-1">
                  ✕ [ERROR] Compilation / Runtime Error:
                </div>
                <pre className="whitespace-pre-wrap select-text">{error || resultsData?.error}</pre>
              </div>
            ) : null}

            {hasResults ? (
              <div className="p-3 bg-[#181818] border border-[#333333] rounded text-zinc-300">
                <div className="text-zinc-400 mb-2 font-semibold">Execution Summary:</div>
                <div className="text-zinc-400">Language: <span className="text-cyan-400">{resultsData.language}</span></div>
                <div className="text-zinc-400">Question ID: <span className="text-zinc-200">{resultsData.questionId}</span></div>
                <div className="text-zinc-400">Total Test Cases: <span className="text-zinc-200">{resultsData.totalTestCases}</span></div>
                <div className="text-zinc-400">Passed: <span className="text-emerald-400">{resultsData.passedTestCases}</span></div>
                <div className="text-zinc-400">Failed: <span className="text-rose-400">{resultsData.failedTestCases}</span></div>
                <div className="mt-2 pt-2 border-t border-[#333333] text-emerald-400">
                  {resultsData.failedTestCases === 0 ? '✓ Program executed cleanly.' : '⚠ Some tests failed.'}
                </div>
              </div>
            ) : null}

            {!hasResults && !error && (
              <div className="text-zinc-500 italic p-4 text-center">
                Console output is clear.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
