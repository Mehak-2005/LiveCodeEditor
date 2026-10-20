import React from 'react';
import { ArrowRight, Tag, Code2, Sparkles } from 'lucide-react';

export default function QuestionCard({ question, onSelect }) {
  const diffKey = (question.difficulty || 'easy').toLowerCase();

  const difficultyConfig = {
    easy: {
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.12)]',
      dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
    },
    medium: {
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.12)]',
      dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
    },
    hard: {
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.12)]',
      dot: 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]',
    },
  }[diffKey] || {
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-400',
  };

  return (
    <div
      onClick={() => onSelect(question.id)}
      className="group relative flex flex-col justify-between rounded-2xl bg-gradient-to-b from-[#0e1322]/90 to-[#0a0e19]/90 hover:from-[#131b2e] hover:to-[#0f1627] border border-slate-800/80 hover:border-sky-500/40 p-5 transition-all duration-300 cursor-pointer shadow-lg shadow-black/40 hover:shadow-2xl hover:shadow-sky-500/5 hover:-translate-y-1 overflow-hidden"
    >
      {/* Subtle top edge specular highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-sky-400/30 transition-all duration-300" />

      <div>
        {/* Card Header: Title & Difficulty */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <h3 className="text-base font-semibold text-slate-100 group-hover:text-sky-300 transition-colors leading-snug tracking-tight">
            {question.title}
          </h3>
          <span
            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium border capitalize shrink-0 ${difficultyConfig.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${difficultyConfig.dot}`} />
            <span>{question.difficulty}</span>
          </span>
        </div>

        {/* Category Tag */}
        {question.category && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-3 font-medium">
            <Tag className="w-3 h-3 text-slate-500" />
            <span>{question.category}</span>
          </div>
        )}

        {/* Short Description */}
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-5">
          {question.description}
        </p>
      </div>

      {/* Card Footer: Supported Languages & Solve CTA */}
      <div className="pt-3.5 border-t border-slate-800/70 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {question.languages.map((lang) => (
            <span
              key={lang}
              className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#070b13] border border-slate-800 text-slate-300 uppercase tracking-wider font-medium flex items-center gap-1"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${lang.toLowerCase() === 'python' ? 'bg-amber-400' : 'bg-cyan-400'}`} />
              <span>{lang}</span>
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(question.id);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 group-hover:text-sky-300 transition-colors py-1 pl-2"
        >
          <span>Solve Challenge</span>
          <ArrowRight className="w-3.5 h-3.5 text-sky-400 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
