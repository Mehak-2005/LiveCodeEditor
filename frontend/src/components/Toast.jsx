import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    if (!duration || !onClose) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!message) return null;

  const config = {
    success: {
      bg: 'bg-gradient-to-r from-[#0a1816]/95 to-[#071210]/95 border-emerald-500/30 text-emerald-200 shadow-emerald-950/40',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    },
    error: {
      bg: 'bg-gradient-to-r from-[#1c0d12]/95 to-[#14080d]/95 border-rose-500/30 text-rose-200 shadow-rose-950/40',
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    },
    warning: {
      bg: 'bg-gradient-to-r from-[#1c160a]/95 to-[#141007]/95 border-amber-500/30 text-amber-200 shadow-amber-950/40',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    },
    info: {
      bg: 'bg-gradient-to-r from-[#0a1424]/95 to-[#070e1c]/95 border-sky-500/30 text-sky-200 shadow-sky-950/40',
      icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
    },
  }[type] || {
    bg: 'bg-[#0e1422] border-slate-800 text-slate-200',
    icon: <Info className="w-5 h-5 text-slate-400 shrink-0" />,
  };

  return (
    <div className="fixed bottom-10 right-6 sm:right-8 z-50 animate-fade-in max-w-md">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl ${config.bg}`}
      >
        {config.icon}
        <div className="text-xs sm:text-sm font-medium flex-1 break-words">{message}</div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
