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
        className={`p-4 sm:p-5 rounded-2xl border shadow-lg ${
          allPassed
            ? 'bg-gradient-to-b from-[#0a1816]/90 to-[#071210]/90 border-emerald-500/30 text-emerald-200'
            : failedTestCases > 0
            ? 'bg-gradient-to-b from-[#1c0d12]/90 to-[#14080d]/90 border-rose-500/30 text-rose-200'
            : 'bg-[#0e1422] border-slate-800 text-slate-300'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {allPassed ? (
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center ring-1 ring-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.25)]">
                <XCircle className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="text-sm font-bold tracking-tight text-white">
                {allPassed ? 'All Test Cases Passed' : 'Tests Incomplete'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {allPassed
                  ? `Execution succeeded! All ${totalTestCases} test cases passed cleanly.`
                  : `${passedTestCases} passed, ${failedTestCases} failed out of ${totalTestCases} test cases.`}
              </div>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-2 text-xs font-mono self-start sm:self-auto">
            <span className="px-2.5 py-1 rounded-lg bg-[#070b13] border border-slate-800 text-slate-300">
              Total: <strong className="text-white">{totalTestCases}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
              Passed: <strong className="text-emerald-400">{passedTestCases}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300">
              Failed: <strong className="text-rose-400">{failedTestCases}</strong>
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#070b13] h-2 rounded-full overflow-hidden border border-slate-800/80">
          <div
            className={`h-full transition-all duration-700 rounded-full ${
              allPassed
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                : passPercentage > 0
                ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                : 'bg-rose-500'
            }`}
            style={{ width: `${Math.max(passPercentage, 3)}%` }}
          />
        </div>
      </div>

      {/* Global compilation/runtime error if any */}
      {error && (
        <div className="p-4 bg-rose-950/30 border border-rose-500/30 rounded-2xl text-rose-200 shadow-lg">
          <div className="flex items-center gap-2 font-semibold text-sm mb-2 text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>Execution / Compilation Output</span>
          </div>
          <pre className="text-xs font-mono bg-[#070b13] p-3 rounded-xl border border-rose-500/20 whitespace-pre-wrap select-text text-rose-200">
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
