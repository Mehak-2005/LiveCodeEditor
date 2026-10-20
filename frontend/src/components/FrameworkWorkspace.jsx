import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  ChevronLeft,
  Coffee,
  AlertCircle,
  Check,
  FolderCode,
} from 'lucide-react';

import {
  getFrameworkProjects,
  createFrameworkProject,
  deleteFrameworkProject,
} from '../services/frameworkApi';

export default function FrameworkWorkspace() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [framework, setFramework] = useState('django');
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadProjects() {
    setLoading(true);
    setError('');

    try {
      const response = await getFrameworkProjects();
      const items = Array.isArray(response)
        ? response
        : response?.projects;

      if (!Array.isArray(items)) {
        throw new Error('Unexpected response while loading projects.');
      }

      setProjects(items);
    } catch (err) {
      setError(err.message || 'Could not load framework projects.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function handleCreateProject(event) {
    event.preventDefault();

    const trimmedName = projectName.trim();

    if (!trimmedName) {
      setError('Please enter a project name.');
      return;
    }

    setCreating(true);
    setError('');
    setMessage('');

    try {
      await createFrameworkProject(framework, trimmedName);
      setProjectName('');
      setMessage('Project created successfully.');
      await loadProjects();
    } catch (err) {
      setError(err.message || 'Could not create the project.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteProject(project) {
    const projectId = project.projectId || project.id;

    if (!projectId) {
      setError('Cannot delete this project: project ID is missing.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name || 'Unnamed project'}"?\n\nThis will stop its Docker container if running and permanently delete its project files. This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(projectId);
    setError('');
    setMessage('');

    try {
      await deleteFrameworkProject(projectId);

      setProjects((currentProjects) =>
        currentProjects.filter(
          (item) => (item.projectId || item.id) !== projectId
        )
      );

      setMessage(`Project "${project.name || projectId}" deleted successfully.`);
    } catch (err) {
      setError(err.message || 'Could not delete the project.');
    } finally {
      setDeletingId('');
    }
  }

  function handleOpenProject(project) {
    const projectId = project.projectId || project.id;

    if (!projectId) {
      setError('Cannot open this project: project ID is missing.');
      return;
    }

    navigate(`/frameworks/${encodeURIComponent(projectId)}`);
  }

  return (
    <div className="flex h-screen flex-col bg-[#14171f] text-zinc-100 font-sans select-none overflow-hidden">
      {/* Top Navbar */}
      <header className="flex h-12 items-center justify-between border-b border-[#242936] bg-[#191d26] px-5 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-[#007acc] to-[#38bdf8] flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-black">⚡</span>
            </div>
            <span className="font-semibold text-sm tracking-tight text-white">
              LiveCode
            </span>
          </div>

          <span className="text-zinc-600">/</span>

          <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Framework Workspace</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/questions')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[#202531] hover:bg-[#282f3d] border border-[#2d3546] text-zinc-300 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />
          <span>Problems Library</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 min-h-0 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header Description */}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Cloud Framework Projects</span>
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Create and manage isolated Spring Boot and Django projects running in persistent Docker environments.
            </p>
          </div>

          {/* Notices */}
          {error && (
            <div
              role="alert"
              className="flex items-center justify-between rounded-md border border-rose-900/50 bg-rose-950/60 p-3 text-xs text-rose-200"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-rose-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {message && (
            <div
              role="status"
              className="flex items-center justify-between rounded-md border border-emerald-900/50 bg-emerald-950/60 p-3 text-xs text-emerald-200"
            >
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{message}</span>
              </div>
              <button
                type="button"
                onClick={() => setMessage('')}
                className="text-emerald-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {/* Create Project Card */}
          <form
            onSubmit={handleCreateProject}
            className="rounded-lg border border-[#262c3a] bg-[#181c25] p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Create New Project</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="framework"
                  className="mb-1.5 block text-xs font-medium text-zinc-300"
                >
                  Select Framework
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFramework('django')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded border text-xs font-medium transition-colors ${
                      framework === 'django'
                        ? 'bg-[#1b2b40] border-[#1389fd] text-blue-200 shadow-sm'
                        : 'bg-[#14171f] border-[#29303f] text-zinc-400 hover:bg-[#1d222e]'
                    }`}
                  >
                    <span className="text-emerald-400 text-sm">🐍</span>
                    <span>Django</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFramework('springboot')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded border text-xs font-medium transition-colors ${
                      framework === 'springboot'
                        ? 'bg-[#1b2b40] border-[#1389fd] text-blue-200 shadow-sm'
                        : 'bg-[#14171f] border-[#29303f] text-zinc-400 hover:bg-[#1d222e]'
                    }`}
                  >
                    <Coffee className="w-3.5 h-3.5 text-amber-500" />
                    <span>Spring Boot</span>
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="projectName"
                  className="mb-1.5 block text-xs font-medium text-zinc-300"
                >
                  Project Name
                </label>
                <input
                  id="projectName"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="e.g., my-api-service"
                  className="w-full rounded border border-[#2b3342] bg-[#14171f] px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#1389fd] focus:ring-1 focus:ring-[#1389fd]"
                  disabled={creating}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-2 rounded bg-[#10b981] hover:bg-[#059669] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{creating ? 'Creating Environment…' : 'Create Project'}</span>
              </button>
            </div>
          </form>

          {/* Your Projects Card */}
          <div className="rounded-lg border border-[#262c3a] bg-[#181c25] p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <FolderCode className="w-4 h-4 text-blue-400" />
                <span>Your Projects</span>
                <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-[#202633] text-zinc-400 font-mono">
                  {projects.length}
                </span>
              </h2>

              <button
                type="button"
                onClick={loadProjects}
                disabled={loading || Boolean(deletingId)}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-2 py-1 rounded hover:bg-[#222836] transition-colors disabled:opacity-50"
                title="Refresh projects list"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`}
                />
                <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-8 text-xs text-zinc-500">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400 mr-2" />
                <span>Loading projects…</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                <p>No projects found. Create your first framework project above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {projects.map((project, index) => {
                  const projectId = project.projectId || project.id;
                  const isDeleting = deletingId === projectId;
                  const isSpring = project.framework === 'springboot';
                  const isDjg = project.framework === 'django';

                  return (
                    <div
                      key={projectId || index}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[#262c3a] bg-[#14171f] p-4 hover:border-[#384255] transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-blue-300 transition-colors truncate">
                            {project.name || 'Unnamed project'}
                          </h3>

                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border border-[#2b3342] bg-[#1a1e28]">
                            {isSpring && (
                              <Coffee className="w-3 h-3 text-amber-500" />
                            )}
                            {isDjg && (
                              <span className="text-emerald-400 text-xs">🐍</span>
                            )}
                            <span className="text-zinc-300 capitalize">
                              {project.framework || 'Custom'}
                            </span>
                          </span>

                          {project.status && (
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full capitalize ${
                                project.status === 'running'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                              }`}
                            >
                              ● {project.status}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 font-mono text-[11px] text-zinc-500 truncate">
                          ID: {projectId}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenProject(project)}
                          disabled={!projectId || Boolean(deletingId)}
                          className="flex items-center gap-1.5 rounded bg-[#1389fd] hover:bg-[#0070e0] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-50"
                        >
                          <span>Open IDE</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProject(project)}
                          disabled={!projectId || Boolean(deletingId)}
                          className="flex items-center gap-1 rounded bg-[#2b191e] hover:bg-[#3d1e25] border border-rose-900/40 px-2.5 py-1.5 text-xs font-medium text-rose-300 transition-colors disabled:opacity-50"
                          title="Delete project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isDeleting ? 'Deleting…' : 'Delete'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
