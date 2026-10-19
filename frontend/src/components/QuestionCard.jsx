import React from 'react';
import { ArrowRight, Code2, Tag } from 'lucide-react';

export default function QuestionCard({ question, onSelect }) {
  const difficultyColors = {
    easy: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-950/80 text-amber-400 border-amber-500/30',
    hard: 'bg-rose-950/80 text-rose-400 border-rose-500/30',
  }[question.difficulty.toLowerCase()] || 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30';

  return (
    <div
      onClick={() => onSelect(question.id)}
      className="group flex flex-col justify-between bg-[#1e1e1e] hover:bg-[#232325] border border-[#333333] hover:border-[#444444] rounded-xl p-5 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
    >
      <div>
        {/* Card Header: Title & Difficulty */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <h3 className="text-base font-semibold text-zinc-100 group-hover:text-[#38a9ff] transition-colors leading-snug">
            {question.title}
          </h3>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium border capitalize shrink-0 ${difficultyColors}`}
          >
            {question.difficulty}
          </span>
        </div>

        {/* Category Tag */}
        {question.category && (
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mb-3">
            <Tag className="w-3 h-3 text-zinc-500" />
            <span>{question.category}</span>
          </div>
        )}

        {/* Short Description */}
        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
          {question.description}
        </p>
      </div>

      {/* Card Footer: Supported Languages & Solve Button */}
      <div className="pt-3 border-t border-[#2e2e2e] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {question.languages.map((lang) => (
            <span
              key={lang}
              className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#181818] border border-[#333333] text-zinc-300"
            >
              {lang}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(question.id);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#007acc] group-hover:text-[#38a9ff] transition-colors py-1 pl-2"
        >
          <span>Solve</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
