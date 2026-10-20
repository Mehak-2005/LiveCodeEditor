import React from 'react';
import { ChevronDown, Code2 } from 'lucide-react';

export default function LanguageSelector({
  language,
  supportedLanguages = ['python', 'java'],
  onLanguageChange,
  disabled = false,
}) {
  return (
    <div className="relative inline-flex items-center">
      <div className="relative flex items-center bg-[#0e1422] hover:bg-[#151d30] border border-slate-800 hover:border-slate-700 rounded-lg transition-all shadow-sm">
        {/* Code Icon */}
        <div className="pl-2.5 pr-1.5 text-slate-400">
          <Code2 className="w-3.5 h-3.5 text-sky-400" />
        </div>

        {/* Language Selector */}
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          disabled={disabled}
          className="appearance-none bg-transparent text-xs sm:text-sm font-medium text-slate-200 py-1.5 pl-0.5 pr-7 cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed capitalize font-sans"
          title="Select programming language"
        >
          {supportedLanguages.map((lang) => (
            <option
              key={lang}
              value={lang}
              className="bg-[#0e1422] text-slate-200 py-1.5"
            >
              {lang === 'python'
                ? 'Python 3'
                : lang === 'java'
                ? 'Java 21'
                : lang}
            </option>
          ))}
        </select>

        {/* Dropdown Icon */}
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
      </div>
    </div>
  );
}