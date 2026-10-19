
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
    <section className="flex-1 min-h-0 overflow-auto bg-[#141414] p-6 text-zinc-100">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Framework Workspace</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Create and manage Django and Spring Boot projects in your local Docker runner.
          </p>
        </div>

        <form
          onSubmit={handleCreateProject}
          className="space-y-4 rounded-lg border border-zinc-700 bg-[#1e1e1e] p-5"
        >
          <h2 className="text-lg font-medium">Create a project</h2>

          <div>
            <label htmlFor="framework" className="mb-2 block text-sm text-zinc-300">
              Framework
            </label>
            <select
              id="framework"
              value={framework}
              onChange={(event) => setFramework(event.target.value)}
              disabled={creating}
              className="w-full rounded border border-zinc-600 bg-[#252526] p-2"
            >
              <option value="django">Django</option>
              <option value="springboot">Spring Boot</option>
            </select>
          </div>

          <div>
            <label htmlFor="projectName" className="mb-2 block text-sm text-zinc-300">
              Project name
            </label>
            <input
              id="projectName"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="my-first-project"
              className="w-full rounded border border-zinc-600 bg-[#252526] p-2"
              disabled={creating}
              required
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="rounded bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create project'}
          </button>
        </form>

        {error && (
          <div role="alert" className="rounded bg-red-950 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div role="status" className="rounded bg-green-950 p-3 text-sm text-green-300">
            {message}
          </div>
        )}

        <div className="rounded-lg border border-zinc-700 bg-[#1e1e1e] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">Your projects</h2>

            <button
              type="button"
              onClick={loadProjects}
              disabled={loading || Boolean(deletingId)}
              className="text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-400">Loading projects...</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No projects found. Create your first project above.
            </p>
          ) : (
            <div className="space-y-3">
              {projects.map((project, index) => {
                const projectId = project.projectId || project.id;
                const isDeleting = deletingId === projectId;

                return (
                  <div
                    key={projectId || index}
                    className="rounded border border-zinc-700 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="font-medium">
                          {project.name || 'Unnamed project'}
                        </h3>

                        <p className="mt-1 text-sm text-zinc-400">
                          Framework: {project.framework || 'Unknown'}
                        </p>

                        <p className="mt-1 break-all text-xs text-zinc-500">
                          Project ID: {projectId || 'Not provided'}
                        </p>

                        {project.status && (
                          <p className="mt-1 text-xs text-zinc-400">
                            Status: {project.status}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenProject(project)}
                          disabled={!projectId || Boolean(deletingId)}
                          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Open Project
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProject(project)}
                          disabled={!projectId || Boolean(deletingId)}
                          className="rounded bg-red-700 px-4 py-2 text-sm font-medium hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
