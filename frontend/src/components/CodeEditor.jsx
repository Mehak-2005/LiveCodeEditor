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
    <div className="flex flex-col h-full w-full bg-[#1e1e1e] overflow-hidden">
      {/* Editor Sub-header / File Tab */}
      <div className="flex items-center justify-between bg-[#252526] border-b border-[#333333] px-3 py-1 shrink-0 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#1e1e1e] border-t border-t-[#007acc] text-zinc-100 font-mono text-xs rounded-t">
            <span className={language === 'python' ? 'text-amber-400' : 'text-rose-400'}>
              {language === 'python' ? '🐍' : '☕'}
            </span>
            <span>{language === 'python' ? 'solution.py' : 'Main.java'}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-zinc-400">
          {hasStarterCode && onResetStarter && (
            <button
              onClick={onResetStarter}
              className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[#333333] hover:text-zinc-200 transition-colors"
              title="Reset code to original starter code"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline text-[11px]">Reset Starter</span>
            </button>
          )}

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[#333333] hover:text-zinc-200 transition-colors"
            title="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 text-[11px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="hidden sm:inline text-[11px]">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 w-full relative">
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
            <div className="h-full flex flex-col items-center justify-center bg-[#1e1e1e] text-zinc-400">
              <LoadingSpinner size="lg" className="text-[#007acc] mb-2" />
              <span className="text-xs">Initializing Monaco Editor...</span>
            </div>
          }
        />
      </div>

      {/* Editor Footer / Info Bar */}
      <div className="flex items-center justify-between px-3 py-0.5 bg-[#181818] border-t border-[#2a2a2a] text-[11px] text-zinc-400 font-mono shrink-0">
        <div className="flex items-center gap-3">
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span>Spaces: 4</span>
          <span>UTF-8</span>
        </div>
        <div className="capitalize text-zinc-300">
          {monacoLanguage}
        </div>
      </div>
    </div>
  );
}
