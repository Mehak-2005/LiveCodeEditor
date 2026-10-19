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
      <div className="relative flex items-center bg-[#252526] hover:bg-[#2d2d30] border border-[#3e3e42] rounded-md transition-colors">

        {/* Code Icon */}
        <div className="pl-2.5 pr-1.5 text-zinc-400">
          <Code2 className="w-4 h-4 text-[#007acc]" />
        </div>

        {/* Language Selector */}
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          disabled={disabled}
          className="appearance-none bg-transparent text-sm font-medium text-zinc-200 py-1.5 pl-1 pr-7 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#007acc] disabled:opacity-50 disabled:cursor-not-allowed capitalize"
          title="Select programming language"
        >
          {supportedLanguages.map((lang) => (
            <option
              key={lang}
              value={lang}
              className="bg-[#252526] text-zinc-200 py-1"
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
        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2 pointer-events-none" />

      </div>
    </div>
  );
}