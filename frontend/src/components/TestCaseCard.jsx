import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { formatOutputValue } from '../utils/helpers';

export default function TestCaseCard({ testCase, index }) {
  const isPassed = !!testCase.passed;
  const testNumber = testCase.testCase || index + 1;
  const expectedStr = formatOutputValue(testCase.expected);
  const actualStr = formatOutputValue(testCase.actual);
  const hasError = !!testCase.error;

  return (
    <div
      className={`rounded-lg border p-4 transition-all duration-150 ${
        isPassed
          ? 'bg-[#1e1e1e] border-emerald-500/30 hover:border-emerald-500/50'
          : 'bg-[#221719] border-rose-500/30 hover:border-rose-500/50'
      }`}
    >
      {/* Test Case Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#333333]">
        <div className="flex items-center gap-2">
          {isPassed ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-400" />
          )}
          <span className="font-semibold text-sm text-zinc-200">
            Test Case {testNumber}
          </span>
        </div>

        <span
          className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium uppercase tracking-wider ${
            isPassed
              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
          }`}
        >
          {isPassed ? 'Passed' : 'Failed'}
        </span>
      </div>

      {/* Test Case Details */}
      <div className="pt-3 space-y-2 text-xs font-mono">
        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
          <span className="text-zinc-400 w-20 shrink-0 font-sans text-xs">Expected:</span>
          <div className="bg-[#181818] border border-[#333333] rounded px-2.5 py-1.5 text-emerald-300 font-mono break-all flex-1 select-text">
            {expectedStr}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
          <span className="text-zinc-400 w-20 shrink-0 font-sans text-xs">Actual:</span>
          <div
            className={`border rounded px-2.5 py-1.5 font-mono break-all flex-1 select-text ${
              isPassed
                ? 'bg-[#181818] border-[#333333] text-emerald-300'
                : 'bg-[#281518] border-rose-500/40 text-rose-300'
            }`}
          >
            {actualStr}
          </div>
        </div>

        {hasError && (
          <div className="mt-3 p-3 bg-rose-950/50 border border-rose-500/40 rounded-md">
            <div className="flex items-center gap-1.5 text-rose-300 font-sans font-medium text-xs mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Execution Error</span>
            </div>
            <pre className="text-xs text-rose-200/90 whitespace-pre-wrap break-all font-mono select-text bg-[#181818]/60 p-2 rounded">
              {testCase.error}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
