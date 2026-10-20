import React, { useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import LoadingSpinner from './LoadingSpinner';
import { RotateCcw, Copy, Check } from 'lucide-react';

export default function CodeEditor({
  code,
  language = 'python',
  onChange,
  onRun,
  onSave,
  onResetStarter,
  hasStarterCode = false,
  readOnly = false,
}) {
  const editorRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  const monacoLanguage = language === 'python' ? 'python' : 'java';

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Track cursor movement for VS Code status bar indicator
    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({
        line: e.position.lineNumber,
        col: e.position.column,
      });
    });

    // Add keyboard shortcuts inside the editor
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onRun) onRun();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave) onSave();
    });
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code', err);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0e17] overflow-hidden">
      {/* Editor Sub-header / File Tab */}
      <div className="flex items-center justify-between bg-[#080c14] border-b border-slate-800/80 px-3 py-1.5 shrink-0 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0e1422] border-t-2 border-t-sky-400 border-x border-slate-800/80 text-white font-mono text-xs rounded-t-lg shadow-sm">
            <span className={language === 'python' ? 'text-amber-400' : 'text-rose-400'}>
              {language === 'python' ? '🐍' : '☕'}
            </span>
            <span className="font-medium">{language === 'python' ? 'solution.py' : 'Main.java'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          {hasStarterCode && onResetStarter && (
            <button
              onClick={onResetStarter}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0e1422] hover:bg-[#151d30] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all text-[11px] font-medium shadow-sm"
              title="Reset code to original starter code"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span className="hidden sm:inline">Reset Starter</span>
            </button>
          )}

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0e1422] hover:bg-[#151d30] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all text-[11px] font-medium shadow-sm"
            title="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span className="hidden sm:inline">Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 w-full relative bg-[#0a0e17]">
        <Editor
          height="100%"
          width="100%"
          language={monacoLanguage}
          value={code}
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            readOnly,
            fontSize: 14,
            fontFamily: '"JetBrains Mono", Menlo, Monaco, Consolas, "Courier New", monospace',
            fontLigatures: true,
            tabSize: 4,
            insertSpaces: true,
            minimap: {
              enabled: true,
              scale: 1,
            },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            bracketPairColorization: {
              enabled: true,
            },
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            folding: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            padding: {
              top: 14,
              bottom: 14,
            },
          }}
          loading={
            <div className="h-full flex flex-col items-center justify-center bg-[#0a0e17] text-slate-400">
              <LoadingSpinner size="lg" className="text-sky-400 mb-2" />
              <span className="text-xs font-mono">Initializing Monaco Workspace...</span>
            </div>
          }
        />
      </div>

      {/* Editor Footer / Info Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#080c14] border-t border-slate-800/80 text-[11px] text-slate-400 font-mono shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-slate-300">Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span className="text-slate-500">•</span>
          <span>Spaces: 4</span>
          <span className="text-slate-500">•</span>
          <span>UTF-8</span>
        </div>
        <div className="capitalize text-slate-300 font-medium flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${monacoLanguage === 'python' ? 'bg-amber-400' : 'bg-rose-400'}`} />
          <span>{monacoLanguage}</span>
        </div>
      </div>
    </div>
  );
}
