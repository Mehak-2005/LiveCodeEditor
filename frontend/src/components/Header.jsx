import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Terminal,
  LogOut,
  History,
  User,
  ChevronLeft,
  Layers,
} from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import RunButton from './RunButton';
import SaveButton from './SaveButton';

export default function Header({
  questionTitle = 'Two Sum',
  language = 'python',
  supportedLanguages = ['python', 'java'],
  onLanguageChange,
  onRun,
  isRunning = false,
  onSave,
  isSaving = false,
  isSaved = false,
  onOpenHistory,
  user,
  onSignOut,
}) {
  const navigate = useNavigate();
  return (
    <header className="h-13 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-4 flex items-center justify-between shrink-0 select-none z-20 shadow-sm">
      {/* Left: Brand + Problems Link + Active Question */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          onClick={() => navigate('/questions')}
          className="flex items-center gap-2 p-1 rounded-lg hover:opacity-90 transition-opacity"
          title="Return to Question Library"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-md shadow-sky-500/25 ring-1 ring-white/20">
            <Terminal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-xs sm:text-sm text-white tracking-tight leading-none">
              LiveCode
            </span>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono mt-0.5">
              Live Code Editor
            </span>
          </div>
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-slate-800 hidden sm:block"></div>

        {/* Back to Library Button */}
        <button
          onClick={() => navigate('/questions')}
          className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0e1422] hover:bg-[#151d30] border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-all shadow-sm"
          title="Browse all coding problems"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
          <span>Problems</span>
        </button>

        {/* Framework Workspace Navigation */}
        <button
          type="button"
          onClick={() => navigate('/frameworks')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0e1422] hover:bg-[#151d30] hover:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-all shadow-sm"
          title="Open Django and Spring Boot projects"
        >
          <Layers className="h-3.5 w-3.5 text-sky-400" />
          <span className="hidden md:inline">Frameworks</span>
        </button>

        {/* Active Question Title */}
        <div className="hidden xl:flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Problem:</span>
          <span className="text-xs font-semibold text-sky-300 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/25">
            {questionTitle}
          </span>
        </div>
      </div>

      {/* Center / Action Toolbar: Language, Run, Save, History */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <LanguageSelector
          language={language}
          supportedLanguages={supportedLanguages}
          onLanguageChange={onLanguageChange}
          disabled={isRunning}
        />

        <RunButton
          onRun={onRun}
          isRunning={isRunning}
          disabled={isSaving}
        />

        <SaveButton
          onSave={onSave}
          isSaving={isSaving}
          isSaved={isSaved}
          disabled={isRunning}
        />

        <button
          onClick={onOpenHistory}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs sm:text-sm transition-all border bg-[#0e1422] hover:bg-[#151d30] border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white shadow-sm"
          title="View previously saved code snippets"
        >
          <History className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline">History</span>
        </button>
      </div>

      {/* Right: User Profile & Logout */}
      <div className="flex items-center gap-2">
        {user && (
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0e1422] border border-slate-800">
            <div className="w-5 h-5 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center ring-1 ring-sky-500/30">
              <User className="w-3 h-3" />
            </div>
            <span className="text-xs text-slate-300 max-w-[130px] truncate font-medium" title={user.email}>
              {user.email}
            </span>
          </div>
        )}

        <button
          onClick={onSignOut}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-800/30 transition-all"
          title="Sign out of Live Code Editor"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
