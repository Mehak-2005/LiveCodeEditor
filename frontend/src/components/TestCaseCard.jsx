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
      className={`rounded-xl border p-4 transition-all duration-200 shadow-sm ${
        isPassed
          ? 'bg-gradient-to-b from-[#0a1515]/90 to-[#080f12]/90 border-emerald-500/20 hover:border-emerald-500/40'
          : 'bg-gradient-to-b from-[#180d11]/90 to-[#12090c]/90 border-rose-500/25 hover:border-rose-500/40'
      }`}
    >
      {/* Test Case Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          {isPassed ? (
            <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 ring-1 ring-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-400 ring-1 ring-rose-500/30">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          )}
          <span className="font-semibold text-xs sm:text-sm text-slate-100">
            Test Case {testNumber}
          </span>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-mono font-medium uppercase tracking-wider ${
            isPassed
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/25 shadow-[0_0_8px_rgba(244,63,94,0.15)]'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isPassed ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          <span>{isPassed ? 'Passed' : 'Failed'}</span>
        </span>
      </div>

      {/* Test Case Details */}
      <div className="pt-3.5 space-y-2.5 text-xs font-mono">
        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
          <span className="text-slate-400 w-20 shrink-0 font-sans text-xs pt-1.5 font-medium">Expected:</span>
          <div className="bg-[#070b13] border border-slate-800 rounded-lg px-3 py-1.5 text-emerald-300 font-mono break-all flex-1 select-text shadow-inner">
            {expectedStr}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
          <span className="text-slate-400 w-20 shrink-0 font-sans text-xs pt-1.5 font-medium">Actual:</span>
          <div
            className={`border rounded-lg px-3 py-1.5 font-mono break-all flex-1 select-text shadow-inner ${
              isPassed
                ? 'bg-[#070b13] border-slate-800 text-emerald-300'
                : 'bg-[#140a0e] border-rose-500/30 text-rose-300'
            }`}
          >
            {actualStr}
          </div>
        </div>

        {hasError && (
          <div className="mt-3 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl">
            <div className="flex items-center gap-1.5 text-rose-300 font-sans font-semibold text-xs mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Execution Error</span>
            </div>
            <pre className="text-xs text-rose-200/90 whitespace-pre-wrap break-all font-mono select-text bg-[#070b13]/80 p-2.5 rounded-lg border border-rose-500/20">
              {testCase.error}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
