
const FRAMEWORK_API_URL =
  import.meta.env.VITE_FRAMEWORK_API_URL ||
  'http://127.0.0.1:4000/api';

// WebSocket URL for the persistent Docker terminal.
const FRAMEWORK_WS_URL = (() => {
  const apiUrl =
    import.meta.env.VITE_FRAMEWORK_API_URL ||
    'http://127.0.0.1:4000/api';

  const url = new URL(apiUrl);

  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `${url.pathname.replace(/\/$/, '')}/terminal`.replace(
    /\/api\/terminal$/,
    '/terminal'
  );

  url.search = '';
  url.hash = '';

  return url.origin.replace(/^http/, 'ws');
})();

async function handleFrameworkResponse(response) {
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Framework runner returned HTTP ${response.status}`
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

// Build the WebSocket URL for a project's persistent terminal.
export function getFrameworkTerminalUrl(projectId) {
  const apiUrl = new URL(FRAMEWORK_API_URL);
  const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';

  return (
    `${protocol}//${apiUrl.host}/?projectId=` +
    encodeURIComponent(projectId)
  );
}

// Get available framework projects
export async function getFrameworkProjects() {
  const response = await fetch(`${FRAMEWORK_API_URL}/projects`);

  return handleFrameworkResponse(response);
}

// Create a Django or Spring Boot project
export async function createFrameworkProject(framework, name) {
  const response = await fetch(`${FRAMEWORK_API_URL}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      framework,
      name,
    }),
  });

  return handleFrameworkResponse(response);
}

// List files in a framework project
export async function getFrameworkFiles(projectId) {
  const response = await fetch(
    `${FRAMEWORK_API_URL}/projects/${encodeURIComponent(projectId)}/files`
  );

  return handleFrameworkResponse(response);
}

// Read a specific project file
export async function getFrameworkFile(projectId, path) {
  const params = new URLSearchParams({ path });

  const response = await fetch(
    `${FRAMEWORK_API_URL}/projects/${encodeURIComponent(projectId)}/file?${params}`
  );

  return handleFrameworkResponse(response);
}

// Save a specific project file
export async function saveFrameworkFile(projectId, path, content) {
  const response = await fetch(
    `${FRAMEWORK_API_URL}/projects/${encodeURIComponent(projectId)}/file`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path,
        content,
      }),
    }
  );

  return handleFrameworkResponse(response);
}

// Run a framework project
export async function runFrameworkProject(projectId) {
  const response = await fetch(
    `${FRAMEWORK_API_URL}/projects/${encodeURIComponent(projectId)}/run`,
    {
      method: 'POST',
    }
  );

  return handleFrameworkResponse(response);
}

// Check project status
export async function getFrameworkProjectStatus(projectId) {
  const response = await fetch(
    `${FRAMEWORK_API_URL}/projects/${encodeURIComponent(projectId)}/status`
  );

  return handleFrameworkResponse(response);
}

// Retrieve framework project logs
export async function getFrameworkProjectLogs(projectId) {
  const response = await fetch(
    `${FRAMEWORK_API_URL}/projects/${encodeURIComponent(projectId)}/logs`
  );

  return handleFrameworkResponse(response);
}

// Stop a running framework project
export async function stopFrameworkProject(projectId) {
  const response = await fetch(
    `${FRAMEWORK_API_URL}/projects/${encodeURIComponent(projectId)}/stop`,
    {
      method: 'POST',
    }
  );

  return handleFrameworkResponse(response);
}

// Delete a framework project
export async function deleteFrameworkProject(projectId) {
  const response = await fetch(
    `${FRAMEWORK_API_URL}/projects/${encodeURIComponent(projectId)}`,
    {
      method: 'DELETE',
    }
  );

  return handleFrameworkResponse(response);
}

 // Create a new file in a framework project
export async function createFrameworkFile(projectId, path) {
  const response = await fetch(
    `${FRAMEWORK_API_URL}/projects/${encodeURIComponent(projectId)}/files`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path }),
    }
  );

  return handleFrameworkResponse(response);
}

// Create a new folder in a framework project
export async function createFrameworkFolder(projectId, path) {
  const response = await fetch(
    `${FRAMEWORK_API_URL}/projects/${encodeURIComponent(projectId)}/folders`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path }),
    }
  );

  return handleFrameworkResponse(response);
}
