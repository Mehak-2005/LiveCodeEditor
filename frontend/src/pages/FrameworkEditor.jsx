import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
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
} from '../services/frameworkApi';

export default function FrameworkEditor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const terminalContainerRef = useRef(null);
  const terminalSocketRef = useRef(null);
  const terminalInstanceRef = useRef(null);
  const fitAddonRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [selectedPath, setSelectedPath] = useState('');
  const [code, setCode] = useState('');
  const [terminalHeight, setTerminalHeight] = useState(280);
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
  const loadFiles = useCallback(async () => {
    setLoadingFiles(true);
    setError('');
    try {
      
const response = await getFrameworkFiles(projectId);

const returnedFiles = Array.isArray(response)
  ? response
  : response?.files;

if (!Array.isArray(returnedFiles)) {
  throw new Error("The server returned an invalid file list.");
}

const visibleFiles = returnedFiles.filter(
  (file) => !file.split("/").includes("target")
);

const visibleFolders = (Array.isArray(response?.folders)
  ? response.folders
  : []
).filter(
  (folder) => !folder.split("/").includes("target")
);

setFiles(visibleFiles);
setFolders(visibleFolders);


      if (selectedPath && !visibleFiles.includes(selectedPath)) {
        setSelectedPath('');
        setCode('');
        setDirty(false);
      }} catch (err) {
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
    const lastSlash = folder.lastIndexOf("/");
    const parent =
      lastSlash === -1 ? "" : folder.substring(0, lastSlash);

    return parent === folderPath;
  });

  const childFiles = files.filter((file) => {
    const lastSlash = file.lastIndexOf("/");
    const parent =
      lastSlash === -1 ? "" : file.substring(0, lastSlash);

    return parent === folderPath;
  });

  return (
    <div key={folderPath}>
      <button
        type="button"
        onClick={() => toggleFolder(folderPath)}
        className="mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-amber-300 hover:bg-[#242733]"
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <span>
          {expandedFolders[folderPath] ? "▾" : "▸"}
        </span>
        <span>📁</span>
        <span className="truncate">
          {folderPath.split("/").pop()}
        </span>
      </button>

      {expandedFolders[folderPath] && (
        <div>
          {childFolders.map((child) =>
            renderFolderTree(child, depth + 1)
          )}

          {childFiles.map((file) => (
            <button
              key={file}
              type="button"
              onClick={() => openFile(file)}
              title={file}
              className={`mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                selectedPath === file
                  ? "bg-[#263653] text-blue-200"
                  : "text-zinc-300 hover:bg-[#242733]"
              }`}
              style={{ paddingLeft: `${28 + depth * 16}px` }}
            >
              <span className="text-blue-400">◇</span>
              <span className="truncate">
                {file.split("/").pop()}
              </span>
            </button>
          ))}
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
      const maxHeight = Math.floor(window.innerHeight * 0.7);
      setTerminalHeight(Math.max(180, Math.min(maxHeight, startHeight + delta)));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  async function openFile(path) {
    if (dirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Discard them and open another file?'
      );
      if (!confirmed) return;
    }
    setSelectedPath(path);
    setCode('');
    setLoadingFile(true);
    setError('');
    setMessage('');
    setDirty(false);
    try {
      const response = await getFrameworkFile(projectId, path);
      const content =typeof response === 'string' ? response : response?.content;
      if (typeof content !== 'string') {
        throw new Error('The server did not return file content.');
      } setCode(content);
    } catch (err) {
      setError(err.message || 'Could not open this file.');
    } finally {
      setLoadingFile(false);
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

      setProjectStatus(statusResult.value.status || 'unknown');

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
        background: '#0c0e13',
        foreground: '#d4d4d8',
        cursor: '#e4e4e7',
        selectionBackground: '#334155',
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
          socket.send(JSON.stringify({
            type: 'resize',
            cols: terminal.cols,
            rows: terminal.rows,
          }));
        }
      } catch {
        // The terminal may be temporarily hidden during a layout change.
      }
    };

    const resizeObserver = new ResizeObserver(fitTerminal);
    resizeObserver.observe(terminalContainerRef.current);
    requestAnimationFrame(fitTerminal);

    terminal.write('\x1b[1;36mLiveCodeEditor Terminal\x1b[0m\r\n');
    terminal.write('Connecting to project shell...\r\n');

    let socket;
    try {
      socket = new WebSocket(getFrameworkTerminalUrl(projectId));
      terminalSocketRef.current = socket;
    } catch (err) {
      terminal.write(`\r\n\x1b[31mTerminal connection failed: ${err.message}\x1b[0m\r\n`);
    }

    if (socket) {
      socket.onopen = () => {
        setTerminalConnected(true);
        terminal.write('\r\n\x1b[32mConnected to project terminal.\x1b[0m\r\n');
        fitTerminal();
      };

      socket.onmessage = (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          terminal.write(String(event.data));
          return;
        }

        if (message.type === 'output' && typeof message.data === 'string') {
          terminal.write(message.data);
        } else if (message.type === 'error') {
          terminal.write(`\r\n\x1b[31m${message.message || 'Terminal connection failed.'}\x1b[0m\r\n`);
        } else if (message.type === 'exit') {
          setTerminalConnected(false);
          terminal.write(`\r\n\x1b[33mTerminal session ended (exit code ${message.exitCode ?? 'unknown'}).\x1b[0m\r\n`);
        }
      };

      socket.onerror = () => {
        setTerminalConnected(false);
        terminal.write('\r\n\x1b[31mWebSocket connection error. Ensure the project is running and the framework service is available.\x1b[0m\r\n');
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

  const statusColor =

    projectStatus === 'running'

      ? 'text-emerald-400'

      : projectStatus === 'stopped'

        ? 'text-zinc-400'

        : 'text-amber-400';

  return (

    <main className="flex h-screen min-h-[600px] flex-col overflow-hidden bg-[#0f1117] text-zinc-200">

      {/* Top toolbar */}

      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30333d] bg-[#171923] px-4 py-3">

        <div className="flex items-center gap-3">

          <button

            type="button"

            onClick={() => navigate('frameworks')}

            className="rounded-md border border-[#393d49] px-3 py-2 text-sm hover:bg-[#272b37]"

          >

            ← Projects

          </button>

          <div>

            <h1 className="font-semibold tracking-wide">

              LiveCodeEditor

            </h1>

            <p className="max-w-[260px] truncate text-xs text-zinc-500">

              Project: {projectId}

            </p>

          </div>

        </div>

        <div className="flex flex-wrap items-center gap-2">

          <span className={`mr-2 text-xs ${statusColor}`}>

            ● {projectStatus}

          </span>

          <button

            type="button"

            onClick={handleRefreshStatus}

            className="rounded-md border border-[#393d49] px-3 py-2 text-sm hover:bg-[#272b37]"

          >

            Refresh

          </button>

          <button

            type="button"

            onClick={handleSave}

            disabled={!selectedPath || saving || loadingFile || !dirty}

            className="rounded-md border border-[#393d49] px-3 py-2 text-sm hover:bg-[#272b37] disabled:cursor-not-allowed disabled:opacity-40"

          >

            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}

          </button>

          <button

            type="button"

            onClick={handleRunProject}

            disabled={runningAction}

            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"

          >

            {runningAction ? 'Working…' : '▶ Run'}

          </button>

          <button

            type="button"

            onClick={handleStopProject}

            disabled={runningAction}

            className="rounded-md bg-[#38252b] px-4 py-2 text-sm text-red-300 hover:bg-[#513039] disabled:opacity-50"

          >

            ■ Stop

          </button>

        </div>

      </header>

      {/* Notices */}

      {error && (

        <div

          role="alert"

          className="border-b border-red-900 bg-red-950/60 px-4 py-2 text-sm text-red-300"

        >

          {error}

        </div>

      )}

      {message && (

        <div

          role="status"

          className="border-b border-emerald-900 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-300"

        >

          {message}

        </div>

      )}

      {/* IDE workspace */}

      <section className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[230px_minmax(0,1fr)]">

        {/* File explorer */}

        <aside className="flex min-h-0 flex-col border-b border-[#30333d] bg-[#171923] md:border-b-0 md:border-r">

          
<div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30333d] px-3 py-3">
  <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
    Explorer
  </h2>

  <div className="flex items-center gap-1">
    <button
      type="button"
      onClick={handleCreateFile}
      disabled={loadingFiles}
      title="Create a new file"
      className="rounded px-2 py-1 text-xs text-emerald-300 hover:bg-[#272b37] disabled:opacity-40"
    >
      + File
    </button>

    <button
      type="button"
      onClick={handleCreateFolder}
      disabled={loadingFiles}
      title="Create a new folder"
      className="rounded px-2 py-1 text-xs text-blue-300 hover:bg-[#272b37] disabled:opacity-40"
    >
      + Folder
    </button>

    <button
      type="button"
      onClick={loadFiles}
      disabled={loadingFiles}
      title="Refresh file list"
      className="rounded px-2 py-1 text-xs text-zinc-300 hover:bg-[#272b37] disabled:opacity-40"
    >
      {loadingFiles ? '…' : '↻'}
    </button>
  </div>
</div>



          <div className="min-h-0 flex-1 overflow-y-auto p-2">

            <div className="mb-2 px-2 py-1 text-xs font-semibold text-zinc-500">

              PROJECT FILES

            </div>

{loadingFiles ? (
  <p className="p-3 text-sm text-zinc-500">
    Loading files…
  </p>
) : files.length === 0 && folders.length === 0 ? (
  <p className="p-3 text-sm text-zinc-500">
    No editable files or folders found.
  </p>
) : (
  <>
    {folders
      .filter((folder) => !folder.includes("/"))
      .map((folder) => renderFolderTree(folder))}

    {files
      .filter((file) => !file.includes("/"))
      .map((file) => (
        <button
          key={file}
          type="button"
          onClick={() => openFile(file)}
          title={file}
          className={`mb-1 block w-full truncate rounded-md px-3 py-2 text-left text-sm ${
            selectedPath === file
              ? "bg-[#263653] text-blue-200"
              : "text-zinc-300 hover:bg-[#242733]"
          }`}
        >
          <span className="mr-2 text-blue-400">◇</span>
          {file}
        </button>
      ))}
  </>
)}


          </div>

          <div className="border-t border-[#30333d] p-3 text-xs text-zinc-500">

            {files.length} file{files.length === 1 ? '' : 's'}

          </div>

        </aside>

        {/* Editor and bottom panels */}

        <section className="flex min-h-0 min-w-0 flex-col">

          <div className="flex min-h-11 items-center justify-between border-b border-[#30333d] bg-[#171923] px-4">

            <div className="truncate py-3 text-sm">

              <span className="mr-2 text-blue-400">◇</span>

              {selectedPath || 'No file selected'}

              {dirty && (

                <span className="ml-2 text-amber-400">●</span>

              )}

            </div>

            <span className="ml-3 text-xs text-zinc-500">

              {selectedPath?.split('.').pop()?.toUpperCase() || 'TEXT'}

            </span>

          </div>

          {/* Code editor */}

          <div className="flex min-h-0 flex-1 flex-col bg-[#101218]">

            {loadingFile ? (

              <div className="p-5 text-sm text-zinc-500">

                Opening file…

              </div>

            ) : selectedPath ? (

              <textarea

                aria-label="Project file contents"

                value={code}

                onChange={(event) => {

                  setCode(event.target.value);

                  setDirty(true);

                  setMessage('');

                }}

                spellCheck={false}

                autoCapitalize="off"

                autoComplete="off"

                className="min-h-[240px] w-full flex-1 resize-none bg-transparent p-5 font-mono text-sm leading-6 text-[#d6deeb] outline-none selection:bg-blue-900"

              />

            ) : (

              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-zinc-500">

                <div>

                  <div className="mb-3 text-3xl text-zinc-700">

                    ⌘

                  </div>

                  <p>Select a file from Explorer to start editing.</p>

                  <p className="mt-2 text-xs">

                    Edit your project, save it, then run the application.

                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Bottom panel tabs */}

          <div className="flex min-h-11 items-center gap-1 border-y border-[#30333d] bg-[#171923] px-3">

            <button

              type="button"

              onClick={() => setActivePanel('terminal')}

              className={`px-4 py-3 text-xs ${

                activePanel === 'terminal'

                  ? 'border-b-2 border-blue-400 text-white'

                  : 'text-zinc-400 hover:text-white'

              }`}

            >

              &gt;_ Terminal

            </button>

            <button

              type="button"

              onClick={() => {

                setActivePanel('logs');

                handleRefreshLogs();

              }}

              className={`px-4 py-3 text-xs ${

                activePanel === 'logs'

                  ? 'border-b-2 border-blue-400 text-white'

                  : 'text-zinc-400 hover:text-white'

              }`}

            >

              Application Logs

            </button>

            <button

              type="button"

              onClick={() => setActivePanel('preview')}

              className={`px-4 py-3 text-xs ${

                activePanel === 'preview'

                  ? 'border-b-2 border-blue-400 text-white'

                  : 'text-zinc-400 hover:text-white'

              }`}

            >

              Preview

            </button>

          </div>

          {/* Bottom panel: resizable height with scrollable contents */}

          <div className="flex min-h-[180px] shrink-0 flex-col bg-[#0c0e13]" style={{ height: `${terminalHeight}px` }}>
            <div
              role="separator"
              aria-label="Resize terminal panel"
              onMouseDown={handleTerminalResize}
              className="h-1 shrink-0 cursor-row-resize bg-zinc-800 hover:bg-blue-500"
            />

            {activePanel === 'terminal' && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex shrink-0 items-center justify-between border-b border-[#30333d] px-4 py-2">
                  <span className="text-xs text-zinc-400">Linux shell</span>
                  <span className={`text-xs ${terminalConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                    ● {terminalConnected ? 'Connected' : 'Connecting…'}
                  </span>
                </div>
                <div
                  ref={terminalContainerRef}
                  className="lce-terminal min-h-0 flex-1"
                  aria-label="Persistent Linux terminal"
                />
              </div>
            )}

            {activePanel === 'logs' && (

              <div className="flex min-h-0 flex-1 flex-col">

                <div className="flex shrink-0 items-center justify-between border-b border-[#30333d] px-4 py-2">

                  <span className="text-xs text-zinc-400">

                    Application output

                  </span>

                  <button

                    type="button"

                    onClick={handleRefreshLogs}

                    className="text-xs text-blue-400 hover:text-blue-300"

                  >

                    Refresh logs

                  </button>

                </div>

                <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-5 text-zinc-300">

                  {logs || 'No logs loaded. Run the project or refresh logs.'}

                </pre>

              </div>

            )}

            
{activePanel === 'preview' && (
  <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
    {previewUrl ? (
      <>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-100 px-3 py-2">
          <span className="min-w-0 truncate text-xs text-zinc-600">
            {previewUrl}
          </span>

          <button
            type="button"
            onClick={() => {
              const frame = document.getElementById('project-preview-frame');
              if (frame) {
                frame.src = previewUrl;
              }
            }}
            className="shrink-0 rounded border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-200"
          >
            Reload
          </button>
        </div>

        <iframe
          id="project-preview-frame"
          title="Running application preview"
          src={previewUrl}
          className="min-h-0 w-full flex-1 border-0 bg-white"
          sandbox="allow-scripts allow-forms allow-same-origin"
        />
      </>
    ) : (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-zinc-500">
        <div>
          <div className="mb-2 text-2xl">▣</div>
          <p>Application preview</p>
          <p className="mt-2 text-xs">
            Click Run to start your project and load its preview here.
          </p>
          <p className="mt-2 text-xs">
            Current project status: {projectStatus}
          </p>
        </div>
      </div>
    )}
  </div>
)}


          </div>

        </section>

      </section>

    </main>

  );

}
