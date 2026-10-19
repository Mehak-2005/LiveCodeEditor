import React from 'react';
import { CheckCircle2, XCircle, Award, AlertCircle } from 'lucide-react';
import TestCaseCard from './TestCaseCard';

export default function TestResults({ resultsData }) {
  if (!resultsData) return null;

  const {
    totalTestCases = 0,
    passedTestCases = 0,
    failedTestCases = 0,
    results = [],
    error,
    language = 'python',
  } = resultsData;

  const allPassed = totalTestCases > 0 && passedTestCases === totalTestCases;
  const passPercentage = totalTestCases > 0 ? (passedTestCases / totalTestCases) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Top Summary Banner */}
      <div
        className={`p-4 rounded-lg border ${
          allPassed
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
            : failedTestCases > 0
            ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
            : 'bg-[#252526] border-[#3e3e42] text-zinc-300'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            {allPassed ? (
              <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-1.5 rounded-full bg-rose-500/20 text-rose-400">
                <XCircle className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="text-sm font-bold tracking-wide uppercase font-mono">
                {allPassed ? 'Execution Completed' : 'Tests Incomplete'}
              </div>
              <div className="text-xs text-zinc-400">
                {allPassed
                  ? `All ${totalTestCases} test cases passed successfully!`
                  : `${passedTestCases} passed, ${failedTestCases} failed out of ${totalTestCases} total test cases`}
              </div>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-[#1e1e1e] border border-[#3e3e42] text-zinc-300">
              Total: <strong className="text-white">{totalTestCases}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-emerald-950/70 border border-emerald-500/40 text-emerald-300">
              Passed: <strong className="text-emerald-400">{passedTestCases}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-rose-950/70 border border-rose-500/40 text-rose-300">
              Failed: <strong className="text-rose-400">{failedTestCases}</strong>
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#181818] h-2 rounded-full overflow-hidden border border-[#333333]">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              allPassed
                ? 'bg-emerald-500'
                : passPercentage > 0
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
            style={{ width: `${Math.max(passPercentage, 2)}%` }}
          ></div>
        </div>
      </div>

      {/* Global compilation/runtime error if any */}
      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-lg text-rose-200">
          <div className="flex items-center gap-2 font-semibold text-sm mb-1 text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>Execution / Compilation Output</span>
          </div>
          <pre className="text-xs font-mono bg-[#181818] p-3 rounded border border-[#333333] whitespace-pre-wrap select-text text-rose-200">
            {error}
          </pre>
        </div>
      )}

      {/* List of individual test cases */}
      <div className="space-y-3">
        {results.map((tc, idx) => (
          <TestCaseCard key={tc.testCase || idx} testCase={tc} index={idx} />
        ))}
      </div>
    </div>
  );
}
