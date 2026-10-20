import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import MonacoEditor from '@monaco-editor/react';
import '@xterm/xterm/css/xterm.css';
import './FrameworkEditor.css';

import {
  getFrameworkFiles,
  getFrameworkFile,
  saveFrameworkFile,
  runFrameworkProject,
  stopFrameworkProject,
  getFrameworkProjectStatus,
  getFrameworkProjectLogs,
  getFrameworkTerminalUrl,
  createFrameworkFile,
  createFrameworkFolder,
  getFrameworkProjects,
} from '../services/frameworkApi';

import {
  Play,
  Square,
  Save,
  RefreshCw,
  FilePlus,
  FolderPlus,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Terminal as TerminalIcon,
  Globe,
  ExternalLink,
  Maximize2,
  Minimize2,
  X,
  Layers,
  Copy,
  Check,
  Info,
  AlertCircle,
  Coffee,
  FileCode,
  FileText,
  RotateCcw,
} from 'lucide-react';

// Map file extensions to Monaco language identifiers
function getMonacoLanguage(filePath) {
  if (!filePath) return 'plaintext';
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py':
      return 'python';
    case 'java':
      return 'java';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'xml':
      return 'xml';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'sh':
    case 'bash':
      return 'shell';
    case 'sql':
      return 'sql';
    case 'properties':
    case 'env':
    case 'ini':
      return 'ini';
    case 'dockerfile':
      return 'dockerfile';
    default:
      if (filePath.toLowerCase().endsWith('dockerfile')) return 'dockerfile';
      return 'plaintext';
  }
}

// Compact, distinctive file icons based on file type
function getFileIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (filename.toLowerCase().includes('dockerfile')) {
    return <span className="text-cyan-400 text-xs font-mono">🐳</span>;
  }
  switch (ext) {
    case 'java':
      return <Coffee className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    case 'py':
      return <span className="text-emerald-400 text-xs font-mono">🐍</span>;
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return <FileCode className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
    case 'json':
    case 'xml':
    case 'properties':
    case 'yaml':
    case 'yml':
      return <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
    case 'html':
    case 'css':
      return <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
    case 'md':
    case 'txt':
      return <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />;
    default:
      return <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
  }
}

export default function FrameworkEditor() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const terminalContainerRef = useRef(null);
  const terminalSocketRef = useRef(null);
  const terminalInstanceRef = useRef(null);
  const fitAddonRef = useRef(null);
  const editorRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [selectedPath, setSelectedPath] = useState('');
  const [openTabs, setOpenTabs] = useState([]);
  const [code, setCode] = useState('');
  const [terminalHeight, setTerminalHeight] = useState(260);
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingFile, setLoadingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [projectStatus, setProjectStatus] = useState('unknown');
  const [runningAction, setRunningAction] = useState(false);
  const [logs, setLogs] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [activePanel, setActivePanel] = useState('terminal');
  const [terminalConnected, setTerminalConnected] = useState(false);
  const [projectMeta, setProjectMeta] = useState(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [copiedLogs, setCopiedLogs] = useState(false);

  // Load project metadata (Name, Framework, etc.)
  useEffect(() => {
    async function fetchProjectMeta() {
      try {
        const response = await getFrameworkProjects();
        const items = Array.isArray(response) ? response : response?.projects;
        if (Array.isArray(items)) {
          const matched = items.find(
            (p) => (p.projectId || p.id) === projectId
          );
          if (matched) {
            setProjectMeta(matched);
          }
        }
      } catch {
        // Non-critical, fallback to projectId
      }
    }
    fetchProjectMeta();
  }, [projectId]);

  // Load files in the project
  const loadFiles = useCallback(async () => {
    setLoadingFiles(true);
    setError('');
    try {
      const response = await getFrameworkFiles(projectId);
      const returnedFiles = Array.isArray(response)
        ? response
        : response?.files;

      if (!Array.isArray(returnedFiles)) {
        throw new Error('The server returned an invalid file list.');
      }

      const visibleFiles = returnedFiles.filter(
        (file) => !file.split('/').includes('target')
      );

      const visibleFolders = (
        Array.isArray(response?.folders) ? response.folders : []
      ).filter((folder) => !folder.split('/').includes('target'));

      setFiles(visibleFiles);
      setFolders(visibleFolders);

      if (selectedPath && !visibleFiles.includes(selectedPath)) {
        setSelectedPath('');
        setCode('');
        setDirty(false);
      }

      // Update open tabs to drop deleted files
      setOpenTabs((prevTabs) =>
        prevTabs.filter((tab) => visibleFiles.includes(tab))
      );
    } catch (err) {
      setError(err.message || 'Could not load project files.');
    } finally {
      setLoadingFiles(false);
    }
  }, [projectId, selectedPath]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  async function handleCreateFile() {
    const path = window.prompt(
      'Enter the file path (for example, notes.txt or src/main.py):'
    );
    if (!path || !path.trim()) return;

    const filePath = path.trim();
    setError('');
    setMessage('');

    try {
      await createFrameworkFile(projectId, filePath);
      await loadFiles();
      await openFile(filePath);
      setMessage('File created successfully.');
    } catch (err) {
      setError(err.message || 'Could not create the file.');
    }
  }

  async function handleCreateFolder() {
    const path = window.prompt(
      'Enter the folder path (for example, test-folder or src/utils):'
    );
    if (!path || !path.trim()) return;

    setError('');
    setMessage('');

    try {
      await createFrameworkFolder(projectId, path.trim());
      await loadFiles();
      setMessage('Folder created successfully.');
    } catch (err) {
      setError(err.message || 'Could not create the folder.');
    }
  }

  function toggleFolder(folderPath) {
    setExpandedFolders((previous) => ({
      ...previous,
      [folderPath]: !previous[folderPath],
    }));
  }

  function renderFolderTree(folderPath, depth = 0) {
    const childFolders = folders.filter((folder) => {
      const lastSlash = folder.lastIndexOf('/');
      const parent = lastSlash === -1 ? '' : folder.substring(0, lastSlash);
      return parent === folderPath;
    });

    const childFiles = files.filter((file) => {
      const lastSlash = file.lastIndexOf('/');
      const parent = lastSlash === -1 ? '' : file.substring(0, lastSlash);
      return parent === folderPath;
    });

    const isExpanded = !!expandedFolders[folderPath];
    const folderName = folderPath.split('/').pop();

    return (
      <div key={folderPath} className="select-none">
        <button
          type="button"
          onClick={() => toggleFolder(folderPath)}
          className="group flex w-full items-center gap-1.5 py-1 px-2 text-left text-xs text-zinc-300 hover:bg-[#202531] hover:text-zinc-100 transition-colors"
          style={{ paddingLeft: `${10 + depth * 14}px` }}
        >
          <span className="text-zinc-500 group-hover:text-zinc-400">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
          <span className="text-amber-400/90">
            {isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5" />
            ) : (
              <Folder className="w-3.5 h-3.5" />
            )}
          </span>
          <span className="truncate text-zinc-300 font-medium">{folderName}</span>
        </button>

        {isExpanded && (
          <div className="tree-branch">
            {childFolders.map((child) => renderFolderTree(child, depth + 1))}
            {childFiles.map((file) => {
              const isSelected = selectedPath === file;
              const fileName = file.split('/').pop();
              return (
                <button
                  key={file}
                  type="button"
                  onClick={() => openFile(file)}
                  title={file}
                  className={`group flex w-full items-center gap-2 py-1 px-2 text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-[#1b2a40] text-blue-200 font-medium border-l-2 border-[#1389fd]'
                      : 'text-zinc-400 hover:bg-[#202531] hover:text-zinc-200'
                  }`}
                  style={{ paddingLeft: `${22 + depth * 14}px` }}
                >
                  {getFileIcon(file)}
                  <span className="truncate">{fileName}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function handleTerminalResize(event) {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = terminalHeight;

    const handleMouseMove = (moveEvent) => {
      const delta = startY - moveEvent.clientY;
      const maxHeight = Math.floor(window.innerHeight * 0.75);
      setTerminalHeight(Math.max(140, Math.min(maxHeight, startHeight + delta)));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  async function openFile(path) {
    if (dirty && selectedPath && path !== selectedPath) {
      const confirmed = window.confirm(
        'You have unsaved changes. Discard them and open another file?'
      );
      if (!confirmed) return;
    }

    setSelectedPath(path);
    // Add to open tabs if not present
    setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));

    setCode('');
    setLoadingFile(true);
    setError('');
    setMessage('');
    setDirty(false);

    try {
      const response = await getFrameworkFile(projectId, path);
      const content =
        typeof response === 'string' ? response : response?.content;
      if (typeof content !== 'string') {
        throw new Error('The server did not return file content.');
      }
      setCode(content);
    } catch (err) {
      setError(err.message || 'Could not open this file.');
    } finally {
      setLoadingFile(false);
    }
  }

  function handleCloseTab(tabPath, e) {
    e.stopPropagation();

    if (tabPath === selectedPath && dirty) {
      const confirmed = window.confirm(
        `"${tabPath.split('/').pop()}" has unsaved changes. Close without saving?`
      );
      if (!confirmed) return;
    }

    const nextTabs = openTabs.filter((t) => t !== tabPath);
    setOpenTabs(nextTabs);

    if (selectedPath === tabPath) {
      if (nextTabs.length > 0) {
        const lastTab = nextTabs[nextTabs.length - 1];
        openFile(lastTab);
      } else {
        setSelectedPath('');
        setCode('');
        setDirty(false);
      }
    }
  }

  async function handleSave() {
    if (!selectedPath) return false;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await saveFrameworkFile(projectId, selectedPath, code);
      setDirty(false);
      setMessage('File saved successfully.');
      return true;
    } catch (err) {
      setError(err.message || 'Could not save the file.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function refreshLogsAndStatus() {
    const [statusResult, logsResult] = await Promise.allSettled([
      getFrameworkProjectStatus(projectId),
      getFrameworkProjectLogs(projectId),
    ]);

    if (statusResult.status === 'fulfilled') {
      const st = statusResult.value;
      setProjectStatus(st.status || 'unknown');
      if (st.url) {
        setPreviewUrl(st.url);
      }
      if (st.framework && !projectMeta?.framework) {
        setProjectMeta((prev) => ({ ...prev, framework: st.framework }));
      }
    }

    if (logsResult.status === 'fulfilled') {
      const result = logsResult.value;
      setLogs(
        typeof result.logs === 'string'
          ? result.logs
          : JSON.stringify(result, null, 2)
      );
    }
  }

  async function handleRunProject() {
    setRunningAction(true);
    setError('');
    setMessage('');
    try {
      if (dirty) {
        const saved = await handleSave();
        if (!saved) {
          throw new Error(
            'Could not save your changes. Fix the error before running.'
          );
        }
      }

      const result = await runFrameworkProject(projectId);
      if (result?.url) {
        setPreviewUrl(result.url);
      }
      setMessage('Run request submitted successfully.');
      await refreshLogsAndStatus();
      setActivePanel('logs');
    } catch (err) {
      setError(err.message || 'Could not run the project.');
    } finally {
      setRunningAction(false);
    }
  }

  async function handleStopProject() {
    setRunningAction(true);
    setError('');
    setMessage('');
    try {
      await stopFrameworkProject(projectId);
      setMessage('Stop request submitted successfully.');
      await refreshLogsAndStatus();
    } catch (err) {
      setError(err.message || 'Could not stop the project.');
    } finally {
      setRunningAction(false);
    }
  }

  async function handleRefreshStatus() {
    setError('');
    try {
      const response = await getFrameworkProjectStatus(projectId);
      setProjectStatus(response.status || 'unknown');
      if (response.url) {
        setPreviewUrl(response.url);
      }
      if (response.framework && !projectMeta?.framework) {
        setProjectMeta((prev) => ({ ...prev, framework: response.framework }));
      }
    } catch (err) {
      setError(err.message || 'Could not retrieve project status.');
    }
  }

  async function handleRefreshLogs() {
    setError('');
    try {
      const response = await getFrameworkProjectLogs(projectId);
      setLogs(
        typeof response.logs === 'string'
          ? response.logs
          : JSON.stringify(response, null, 2)
      );
    } catch (err) {
      setError(err.message || 'Could not retrieve project logs.');
    }
  }

  const handleCopyLogs = async () => {
    try {
      await navigator.clipboard.writeText(logs);
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2000);
    } catch {
      // ignore
    }
  };

  // Mount xterm.js and connect it to the project's persistent shell.
  useEffect(() => {
    if (activePanel !== 'terminal' || !terminalContainerRef.current) {
      return undefined;
    }

    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.35,
      scrollback: 5000,
      theme: {
        background: '#0c0e14',
        foreground: '#e6edf3',
        cursor: '#38bdf8',
        selectionBackground: '#264f78',
        black: '#000000',
        red: '#f85149',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#b1bac4',
        brightBlack: '#6e7681',
        brightRed: '#ff7b72',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd',
        brightWhite: '#f0f6fc',
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalContainerRef.current);
    terminalInstanceRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const fitTerminal = () => {
      try {
        fitAddon.fit();
        const socket = terminalSocketRef.current;
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: 'resize',
              cols: terminal.cols,
              rows: terminal.rows,
            })
          );
        }
      } catch {
        // The terminal may be temporarily hidden during a layout change.
      }
    };

    const resizeObserver = new ResizeObserver(fitTerminal);
    resizeObserver.observe(terminalContainerRef.current);
    requestAnimationFrame(fitTerminal);

    terminal.write('\x1b[1;36mLiveCode Terminal\x1b[0m\r\n');
    terminal.write('Connecting to persistent container shell...\r\n');

    let socket;
    try {
      socket = new WebSocket(getFrameworkTerminalUrl(projectId));
      terminalSocketRef.current = socket;
    } catch (err) {
      terminal.write(
        `\r\n\x1b[31mTerminal connection failed: ${err.message}\x1b[0m\r\n`
      );
    }

    if (socket) {
      socket.onopen = () => {
        setTerminalConnected(true);
        terminal.write('\r\n\x1b[32m● Connected to container shell.\x1b[0m\r\n');
        fitTerminal();
      };

      socket.onmessage = (event) => {
        let messageData;
        try {
          messageData = JSON.parse(event.data);
        } catch {
          terminal.write(String(event.data));
          return;
        }

        if (messageData.type === 'output' && typeof messageData.data === 'string') {
          terminal.write(messageData.data);
        } else if (messageData.type === 'error') {
          terminal.write(
            `\r\n\x1b[31m${messageData.message || 'Terminal connection failed.'}\x1b[0m\r\n`
          );
        } else if (messageData.type === 'exit') {
          setTerminalConnected(false);
          terminal.write(
            `\r\n\x1b[33mTerminal session ended (exit code ${messageData.exitCode ?? 'unknown'}).\x1b[0m\r\n`
          );
        }
      };

      socket.onerror = () => {
        setTerminalConnected(false);
        terminal.write(
          '\r\n\x1b[31mWebSocket connection error. Ensure the project is running and the framework service is available.\x1b[0m\r\n'
        );
      };

      socket.onclose = () => {
        setTerminalConnected(false);
        if (terminalSocketRef.current === socket) {
          terminalSocketRef.current = null;
        }
      };

      terminal.onData((data) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'input', data }));
        }
      });
    }

    return () => {
      resizeObserver.disconnect();
      if (socket) socket.close();
      if (terminalSocketRef.current === socket) {
        terminalSocketRef.current = null;
      }
      terminal.dispose();
      terminalInstanceRef.current = null;
      fitAddonRef.current = null;
      setTerminalConnected(false);
    };
  }, [activePanel, projectId]);

  // Refresh status on initial mount
  useEffect(() => {
    handleRefreshStatus();
  }, [projectId]);

  const frameworkName =
    projectMeta?.framework === 'springboot'
      ? 'Spring Boot'
      : projectMeta?.framework === 'django'
        ? 'Django'
        : 'Framework Project';

  const isSpringBoot = projectMeta?.framework === 'springboot';
  const isDjango = projectMeta?.framework === 'django';

  const statusBg =
    projectStatus === 'running'
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      : projectStatus === 'stopped'
        ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
        : 'bg-amber-500/15 text-amber-400 border-amber-500/30';

  const statusDot =
    projectStatus === 'running'
      ? 'bg-emerald-400'
      : projectStatus === 'stopped'
        ? 'bg-zinc-500'
        : 'bg-amber-400 animate-pulse';

  return (
    <main className="flex h-screen min-h-[600px] flex-col overflow-hidden bg-[#15181e] text-[#d4d4d8] font-sans select-none">
      {/* ============================================================
          TOP TOOLBAR (StackBlitz Inspired)
      ============================================================ */}
      <header className="flex h-11 items-center justify-between border-b border-[#2a2f3b] bg-[#1a1d24] px-3 shrink-0 z-20">
        {/* Left: Brand, Breadcrumb, and Framework */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/frameworks')}
            className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-[#252a36] text-zinc-300 hover:text-white transition-colors"
            title="Return to Framework Workspace"
          >
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-[#007acc] to-[#38bdf8] flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-black">⚡</span>
            </div>
            <span className="font-semibold text-xs tracking-tight text-white hidden sm:inline">
              LiveCode
            </span>
          </button>

          <span className="text-zinc-600 hidden sm:inline">/</span>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/frameworks')}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors hidden md:inline truncate"
            >
              Projects
            </button>
            <span className="text-zinc-600 hidden md:inline">/</span>
            <span className="text-xs font-medium text-zinc-200 truncate max-w-[160px] lg:max-w-[240px]">
              {projectMeta?.name || projectId}
            </span>
          </div>

          {/* Framework Badge */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border border-[#303746] bg-[#202530]">
            {isSpringBoot && <Coffee className="w-3 h-3 text-amber-500" />}
            {isDjango && <span className="text-emerald-400 text-xs">🐍</span>}
            <span className="text-zinc-300">{frameworkName}</span>
          </div>
        </div>

        {/* Center / Right: Run, Stop, Save, Status */}
        <div className="flex items-center gap-2">
          {/* Status Indicator Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border ${statusBg}`}
            title="Container execution state"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
            <span className="capitalize">{projectStatus}</span>
          </div>

          <button
            type="button"
            onClick={handleRefreshStatus}
            title="Refresh project and container status"
            className="p-1.5 rounded hover:bg-[#252a36] text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-[#2a2f3b] mx-0.5 hidden sm:block" />

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedPath || saving || loadingFile || !dirty}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
              dirty
                ? 'bg-[#252a36] border-amber-500/50 text-amber-300 hover:bg-[#2d3342]'
                : 'bg-[#1e222b] border-[#2f3544] text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
            title="Save changes (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
            </span>
          </button>

          {/* Run Button */}
          <button
            type="button"
            onClick={handleRunProject}
            disabled={runningAction}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-[#10b981] hover:bg-[#059669] text-white shadow-sm transition-colors disabled:opacity-50"
            title="Build and run application in Docker"
          >
            <Play className="w-3 h-3 fill-white" />
            <span>{runningAction ? 'Running…' : 'Run'}</span>
          </button>

          {/* Stop Button */}
          <button
            type="button"
            onClick={handleStopProject}
            disabled={runningAction}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-[#2d1b22] hover:bg-[#3d202b] text-rose-300 border border-rose-900/40 transition-colors disabled:opacity-50"
            title="Stop running Docker container"
          >
            <Square className="w-3 h-3 fill-rose-300" />
            <span className="hidden sm:inline">Stop</span>
          </button>
        </div>
      </header>

      {/* Floating / Inline Notice Alerts */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between border-b border-rose-900/60 bg-rose-950/70 px-4 py-1.5 text-xs text-rose-200 z-10"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-rose-400 hover:text-rose-200 text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {message && (
        <div
          role="status"
          className="flex items-center justify-between border-b border-emerald-900/60 bg-emerald-950/70 px-4 py-1.5 text-xs text-emerald-200 z-10"
        >
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{message}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage('')}
            className="text-emerald-400 hover:text-emerald-200 text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ============================================================
          IDE WORKSPACE (Activity Bar + Explorer + Main Editor)
      ============================================================ */}
      <section className="flex flex-1 min-h-0 overflow-hidden">
        {/* Leftmost Activity Bar (StackBlitz / VS Code icon strip) */}
        <nav
          aria-label="Activity Bar"
          className="w-11 shrink-0 bg-[#14171e] border-r border-[#262a35] flex flex-col items-center justify-between py-2 z-10"
        >
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className={`p-2 rounded text-xs transition-colors ${
                !isSidebarCollapsed
                  ? 'text-white border-l-2 border-[#1389fd] bg-[#1e2330]'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-[#1a1e28]'
              }`}
              title="Toggle File Explorer (Files)"
            >
              <Folder className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/frameworks')}
              className="p-2 rounded text-zinc-500 hover:text-zinc-200 hover:bg-[#1a1e28] transition-colors"
              title="All Framework Projects"
            >
              <Layers className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleRunProject}
              disabled={runningAction}
              className="p-2 rounded text-zinc-500 hover:text-emerald-400 hover:bg-[#1a1e28] transition-colors"
              title="Run Project"
            >
              <Play className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setActivePanel('terminal')}
              className={`p-2 rounded text-xs transition-colors ${
                activePanel === 'terminal'
                  ? 'text-white border-l-2 border-[#1389fd] bg-[#1e2330]'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-[#1a1e28]'
              }`}
              title="Terminal Panel"
            >
              <TerminalIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setActivePanel('preview')}
              className={`p-2 rounded text-xs transition-colors ${
                activePanel === 'preview'
                  ? 'text-white border-l-2 border-[#1389fd] bg-[#1e2330]'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-[#1a1e28]'
              }`}
              title="Application Preview"
            >
              <Globe className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={loadFiles}
              disabled={loadingFiles}
              className="p-2 rounded text-zinc-500 hover:text-zinc-200 hover:bg-[#1a1e28] transition-colors"
              title="Refresh Workspace"
            >
              <RefreshCw
                className={`w-4 h-4 ${loadingFiles ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </nav>

        {/* File Explorer Sidebar */}
        {!isSidebarCollapsed && (
          <aside className="w-60 shrink-0 flex flex-col bg-[#181b23] border-r border-[#262a35] overflow-hidden select-none">
            {/* Explorer Toolbar Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#262a35] bg-[#1a1e27]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Explorer
              </span>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handleCreateFile}
                  disabled={loadingFiles}
                  title="Create new file"
                  className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#252b38] transition-colors disabled:opacity-40"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleCreateFolder}
                  disabled={loadingFiles}
                  title="Create new folder"
                  className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#252b38] transition-colors disabled:opacity-40"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={loadFiles}
                  disabled={loadingFiles}
                  title="Refresh files"
                  className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#252b38] transition-colors disabled:opacity-40"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin text-blue-400' : ''}`}
                  />
                </button>
              </div>
            </div>

            {/* Project Name sub-header in file tree */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#14171f] border-b border-[#232733] text-[11px] font-semibold text-zinc-400">
              <ChevronDown className="w-3 h-3 text-zinc-500" />
              <span className="uppercase tracking-wider truncate">
                {projectMeta?.name || 'PROJECT'}
              </span>
            </div>

            {/* File & Folder Tree */}
            <div className="flex-1 min-h-0 overflow-y-auto py-1 custom-scrollbar">
              {loadingFiles ? (
                <div className="p-4 text-xs text-zinc-500 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span>Loading files…</span>
                </div>
              ) : files.length === 0 && folders.length === 0 ? (
                <div className="p-4 text-xs text-zinc-500 text-center">
                  <p>No project files found.</p>
                  <button
                    type="button"
                    onClick={handleCreateFile}
                    className="mt-2 text-blue-400 hover:underline"
                  >
                    + Create a file
                  </button>
                </div>
              ) : (
                <>
                  {folders
                    .filter((folder) => !folder.includes('/'))
                    .map((folder) => renderFolderTree(folder))}

                  {files
                    .filter((file) => !file.includes('/'))
                    .map((file) => {
                      const isSelected = selectedPath === file;
                      return (
                        <button
                          key={file}
                          type="button"
                          onClick={() => openFile(file)}
                          title={file}
                          className={`group flex w-full items-center gap-2 py-1 px-3 text-left text-xs transition-colors ${
                            isSelected
                              ? 'bg-[#1b2a40] text-blue-200 font-medium border-l-2 border-[#1389fd]'
                              : 'text-zinc-400 hover:bg-[#202531] hover:text-zinc-200'
                          }`}
                        >
                          {getFileIcon(file)}
                          <span className="truncate">{file}</span>
                        </button>
                      );
                    })}
                </>
              )}
            </div>

            {/* Explorer Footer */}
            <div className="flex items-center justify-between border-t border-[#262a35] px-3 py-1.5 bg-[#14171f] text-[11px] text-zinc-500">
              <span>{files.length} files</span>
              <span className="font-mono text-[10px] capitalize">
                {projectMeta?.framework || 'docker'}
              </span>
            </div>
          </aside>
        )}

        {/* ============================================================
            MAIN EDITOR AREA (Tabs + Monaco/Code Area + Bottom Panel)
        ============================================================ */}
        <section className="flex flex-1 min-w-0 flex-col overflow-hidden bg-[#12151b]">
          {/* File Tabs Bar (Multi-tab StackBlitz style) */}
          <div className="flex h-9 items-center border-b border-[#262a35] bg-[#161921] px-1 overflow-x-auto shrink-0 select-none custom-scrollbar">
            {openTabs.length > 0 ? (
              openTabs.map((tab) => {
                const isActive = selectedPath === tab;
                const tabFileName = tab.split('/').pop();
                return (
                  <div
                    key={tab}
                    onClick={() => openFile(tab)}
                    className={`group flex items-center gap-2 h-full px-3 text-xs border-r border-[#262a35] cursor-pointer transition-colors max-w-[200px] shrink-0 ${
                      isActive
                        ? 'bg-[#12151b] text-white border-t-2 border-t-[#1389fd]'
                        : 'bg-[#161921] text-zinc-400 hover:bg-[#1c202a] hover:text-zinc-200'
                    }`}
                    title={tab}
                  >
                    {getFileIcon(tab)}
                    <span className="truncate">{tabFileName}</span>

                    {isActive && dirty && (
                      <span
                        className="w-2 h-2 rounded-full bg-amber-400 shrink-0"
                        title="Unsaved changes"
                      />
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleCloseTab(tab, e)}
                      className="ml-1 p-0.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-700/50 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Close tab"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center px-3 text-xs text-zinc-500 italic">
                No files open
              </div>
            )}
          </div>

          {/* Active File Breadcrumbs Bar */}
          {selectedPath && (
            <div className="flex h-7 items-center justify-between border-b border-[#232733] bg-[#14171f] px-3 text-[11px] font-mono text-zinc-400 shrink-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-zinc-600">app</span>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-300 truncate">{selectedPath}</span>
                {dirty && (
                  <span className="text-amber-400 font-sans ml-1">● unsaved</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-zinc-500 uppercase">
                  {selectedPath.split('.').pop()}
                </span>
              </div>
            </div>
          )}

          {/* Code Editor Surface */}
          <div className="flex-1 min-h-0 relative bg-[#12151b]">
            {loadingFile ? (
              <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400 mr-2" />
                <span>Opening file…</span>
              </div>
            ) : selectedPath ? (
              <MonacoEditor
                height="100%"
                width="100%"
                language={getMonacoLanguage(selectedPath)}
                value={code}
                theme="vs-dark"
                onChange={(val) => {
                  setCode(val ?? '');
                  setDirty(true);
                  setMessage('');
                }}
                onMount={(editor, monaco) => {
                  editorRef.current = editor;

                  editor.onDidChangeCursorPosition((e) => {
                    setCursorPos({
                      line: e.position.lineNumber,
                      col: e.position.column,
                    });
                  });

                  // Ctrl+S / Cmd+S save command inside Monaco
                  editor.addCommand(
                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
                    () => {
                      handleSave();
                    }
                  );
                }}
                options={{
                  fontSize: 13,
                  fontFamily:
                    '"JetBrains Mono", Menlo, Monaco, Consolas, "Courier New", monospace',
                  fontLigatures: true,
                  tabSize: 4,
                  insertSpaces: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  bracketPairColorization: { enabled: true },
                  lineNumbers: 'on',
                  renderLineHighlight: 'all',
                  wordWrap: 'on',
                  folding: true,
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  padding: { top: 10, bottom: 10 },
                }}
                loading={
                  <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-400 mr-2" />
                    <span>Loading editor...</span>
                  </div>
                }
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-center p-8 text-zinc-500 select-none">
                <div className="w-14 h-14 rounded-2xl bg-[#1a1e27] border border-[#2b3140] flex items-center justify-center mb-4 text-zinc-400 shadow-inner">
                  <FileCode className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="text-sm font-medium text-zinc-300">
                  Select a file from the explorer
                </h3>
                <p className="mt-1 max-w-sm text-xs text-zinc-500">
                  Browse the project files on the left to edit code, save changes, and run the container.
                </p>
                <div className="mt-5 flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={handleCreateFile}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1e2330] hover:bg-[#252b3b] border border-[#2d3546] text-zinc-300 hover:text-white transition-colors"
                  >
                    <FilePlus className="w-3.5 h-3.5 text-blue-400" />
                    <span>New File</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRunProject}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#10b981]/20 hover:bg-[#10b981]/30 border border-[#10b981]/40 text-emerald-300 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-emerald-300" />
                    <span>Run Project</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================
              BOTTOM PANEL (Terminal, Application Logs, Preview)
          ============================================================ */}
          <div
            className={`flex shrink-0 flex-col border-t border-[#262a35] bg-[#0c0e14] transition-all duration-150 ${
              isTerminalMaximized ? 'flex-1' : ''
            }`}
            style={
              isTerminalMaximized
                ? { height: '100%' }
                : { height: `${terminalHeight}px` }
            }
          >
            {/* Draggable Row Resizer */}
            {!isTerminalMaximized && (
              <div
                role="separator"
                aria-label="Resize bottom panel"
                onMouseDown={handleTerminalResize}
                className="h-1 shrink-0 cursor-row-resize bg-[#202531] hover:bg-[#1389fd] transition-colors"
              />
            )}

            {/* Bottom Panel Tabs Header */}
            <div className="flex h-9 items-center justify-between border-b border-[#262a35] bg-[#161921] px-2 shrink-0">
              <div className="flex items-center gap-1 h-full">
                <button
                  type="button"
                  onClick={() => setActivePanel('terminal')}
                  className={`flex items-center gap-1.5 h-full px-3 text-xs font-medium border-b-2 transition-colors ${
                    activePanel === 'terminal'
                      ? 'border-[#1389fd] text-white bg-[#0c0e14]'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#1b1f29]'
                  }`}
                >
                  <TerminalIcon className="w-3.5 h-3.5" />
                  <span>Terminal</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ml-1 ${
                      terminalConnected ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                    title={
                      terminalConnected
                        ? 'Terminal Connected'
                        : 'Terminal Connecting…'
                    }
                  />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActivePanel('logs');
                    handleRefreshLogs();
                  }}
                  className={`flex items-center gap-1.5 h-full px-3 text-xs font-medium border-b-2 transition-colors ${
                    activePanel === 'logs'
                      ? 'border-[#1389fd] text-white bg-[#0c0e14]'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#1b1f29]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Application Logs</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePanel('preview')}
                  className={`flex items-center gap-1.5 h-full px-3 text-xs font-medium border-b-2 transition-colors ${
                    activePanel === 'preview'
                      ? 'border-[#1389fd] text-white bg-[#0c0e14]'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#1b1f29]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Preview</span>
                  {previewUrl && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" />
                  )}
                </button>
              </div>

              {/* Panel Actions (Refresh logs, Copy, Maximize) */}
              <div className="flex items-center gap-1">
                {activePanel === 'logs' && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopyLogs}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-[#202531] transition-colors"
                      title="Copy application logs"
                    >
                      {copiedLogs ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleRefreshLogs}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-[#202531] transition-colors"
                      title="Refresh logs from container"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Refresh</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setIsTerminalMaximized((prev) => !prev)}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-[#202531] transition-colors"
                  title={isTerminalMaximized ? 'Restore Panel' : 'Maximize Panel'}
                >
                  {isTerminalMaximized ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Panel Tab 1: Terminal */}
            {activePanel === 'terminal' && (
              <div className="flex flex-1 min-h-0 flex-col bg-[#0c0e14]">
                <div className="flex h-6 shrink-0 items-center justify-between border-b border-[#202531] bg-[#12151d] px-3 text-[11px] font-mono text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Shell:</span>
                    <span>bash / persistent container</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`flex items-center gap-1.5 ${
                        terminalConnected ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          terminalConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                        }`}
                      />
                      <span>{terminalConnected ? 'Connected' : 'Connecting…'}</span>
                    </span>
                  </div>
                </div>

                <div
                  ref={terminalContainerRef}
                  className="lce-terminal flex-1 min-h-0"
                  aria-label="Persistent Linux terminal"
                />
              </div>
            )}

            {/* Panel Tab 2: Logs */}
            {activePanel === 'logs' && (
              <div className="flex flex-1 min-h-0 flex-col bg-[#0c0e14]">
                <pre className="flex-1 min-h-0 overflow-auto p-4 font-mono text-xs leading-5 text-zinc-300 whitespace-pre-wrap custom-scrollbar select-text">
                  {logs || 'No logs recorded yet. Click Run to start your project.'}
                </pre>
              </div>
            )}

            {/* Panel Tab 3: Preview */}
            {activePanel === 'preview' && (
              <div className="flex flex-1 min-h-0 flex-col bg-[#0c0e14]">
                {previewUrl ? (
                  <>
                    {/* Browser Chrome Toolbar */}
                    <div className="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-[#262a35] bg-[#161921] px-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            const frame = document.getElementById(
                              'project-preview-frame'
                            );
                            if (frame) frame.src = previewUrl;
                          }}
                          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#202531] transition-colors"
                          title="Reload preview frame"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        <div className="preview-address-bar flex items-center gap-2 px-3 py-0.5 rounded text-xs flex-1 max-w-md truncate">
                          <span className="text-zinc-500">🔒</span>
                          <span className="truncate">{previewUrl}</span>
                        </div>
                      </div>

                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-zinc-300 hover:text-white hover:bg-[#202531] border border-[#2a3040] transition-colors shrink-0"
                        title="Open preview in a new browser tab"
                      >
                        <span>Open in New Tab</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* Preview Iframe */}
                    <iframe
                      id="project-preview-frame"
                      title="Running application preview"
                      src={previewUrl}
                      className="w-full flex-1 min-h-0 border-0 bg-white"
                      sandbox="allow-scripts allow-forms allow-same-origin"
                    />
                  </>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-zinc-500">
                    <div className="w-12 h-12 rounded-xl bg-[#141822] border border-[#252b3a] flex items-center justify-center text-zinc-400 mb-3">
                      <Globe className="w-6 h-6 text-blue-400" />
                    </div>
                    <h4 className="text-sm font-medium text-zinc-300">
                      Application Preview
                    </h4>
                    <p className="mt-1 text-xs max-w-sm text-zinc-500">
                      Click <strong className="text-emerald-400">Run</strong> in the top toolbar to start the container and view your running application here.
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs font-mono text-zinc-400 bg-[#161a24] px-3 py-1.5 rounded border border-[#232938]">
                      <span>Project status:</span>
                      <span className="capitalize text-zinc-200">
                        {projectStatus}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </section>

      {/* ============================================================
          BOTTOM STATUS BAR (StackBlitz / VS Code Slim Bar)
      ============================================================ */}
      <footer className="h-6 bg-[#101319] border-t border-[#222631] px-3 flex items-center justify-between text-[11px] font-mono text-zinc-400 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-zinc-300 font-medium">
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
            <span className="capitalize">{frameworkName}</span>
          </span>

          <span className="text-zinc-600 hidden sm:inline">|</span>

          <span className="hidden sm:flex items-center gap-1.5">
            <TerminalIcon className="w-3 h-3 text-zinc-500" />
            <span
              className={
                terminalConnected ? 'text-zinc-300' : 'text-amber-400'
              }
            >
              {terminalConnected ? 'Shell Online' : 'Connecting Shell'}
            </span>
          </span>

          <span className="text-zinc-600 hidden md:inline">|</span>

          <span className="hidden md:inline text-zinc-500 truncate max-w-[200px]">
            {projectMeta?.name || projectId}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {selectedPath && (
            <>
              <span className="hidden sm:inline">
                Ln {cursorPos.line}, Col {cursorPos.col}
              </span>
              <span className="text-zinc-600 hidden sm:inline">|</span>
              <span className="hidden sm:inline">Spaces: 4</span>
              <span className="text-zinc-600 hidden sm:inline">|</span>
              <span>UTF-8</span>
              <span className="text-zinc-600 hidden sm:inline">|</span>
            </>
          )}

          <span className="text-blue-400 font-medium">
            {isSpringBoot ? 'Port: 8080' : isDjango ? 'Port: 8000' : 'Docker IDE'}
          </span>
        </div>
      </footer>
    </main>
  );
}
