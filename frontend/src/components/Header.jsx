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
    <header className="h-14 bg-[#181818] border-b border-[#333333] px-4 flex items-center justify-between shrink-0 select-none z-20">
      {/* Left: Brand + Problems Link + Active Question */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/questions')}
          className="flex items-center gap-2.5 p-1 rounded hover:opacity-85 transition-opacity"
          title="Return to Question Library"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#007acc] to-[#005a9e] flex items-center justify-center shadow-md shadow-[#007acc]/20">
            <Terminal className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm text-zinc-100 tracking-tight leading-tight">
              LiveCode
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              Live Code Editor
            </span>
          </div>
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-[#333333] hidden sm:block"></div>

        {/* Back to Library Button */}
        <button
          onClick={() => navigate('/questions')}
          className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#252526] hover:bg-[#2d2d30] border border-[#3e3e42] text-xs font-medium text-zinc-300 hover:text-white transition-colors"
          title="Browse all coding problems"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />
          <span>Problems</span>
        </button>
        
{/* Framework Workspace Navigation */}
<button
  type="button"
  onClick={() => navigate('/frameworks')}
  className="inline-flex items-center gap-1.5 rounded-md border border-[#3e3e42] bg-[#252526] px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-[#2d2d30] hover:text-white"
  title="Open Django and Spring Boot projects"
>
  <Layers className="h-4 w-4 text-blue-400" />
  <span>Framework Workspace</span>
</button>


        {/* Active Question Title */}
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-xs text-zinc-400">Problem:</span>
          <span className="text-xs font-semibold text-zinc-200 px-2 py-0.5 rounded bg-[#252526] border border-[#3e3e42]">
            {questionTitle}
          </span>
        </div>
      </div>

      {/* Center / Action Toolbar: Language, Run, Save, History */}
      <div className="flex items-center gap-2 sm:gap-3">
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-sm transition-colors border bg-[#252526] hover:bg-[#2d2d30] border-[#3e3e42] text-zinc-300 hover:text-white"
          title="View previously saved code snippets"
        >
          <History className="w-4 h-4 text-zinc-400" />
          <span className="hidden md:inline">Saved Code</span>
        </button>
      </div>

      {/* Right: User Profile & Logout */}
      <div className="flex items-center gap-2">
        {user && (
          <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded bg-[#252526] border border-[#333333]">
            <div className="w-5 h-5 rounded-full bg-[#007acc]/20 text-[#007acc] flex items-center justify-center">
              <User className="w-3 h-3" />
            </div>
            <span className="text-xs text-zinc-300 max-w-[140px] truncate" title={user.email}>
              {user.email}
            </span>
          </div>
        )}

        <button
          onClick={onSignOut}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/30 transition-colors"
          title="Sign out of Live Code Editor"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
