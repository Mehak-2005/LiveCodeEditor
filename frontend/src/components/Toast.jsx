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
      bg: 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    },
    error: {
      bg: 'bg-rose-950/90 border-rose-500/50 text-rose-200',
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-950/90 border-amber-500/50 text-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    },
    info: {
      bg: 'bg-blue-950/90 border-blue-500/50 text-blue-200',
      icon: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
    },
  }[type] || {
    bg: 'bg-zinc-900 border-zinc-700 text-zinc-200',
    icon: <Info className="w-5 h-5 text-zinc-400 shrink-0" />,
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 animate-fade-in max-w-md">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md shadow-2xl ${config.bg}`}
      >
        {config.icon}
        <div className="text-sm font-medium flex-1 break-words">{message}</div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
