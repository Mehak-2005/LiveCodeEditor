import express from "express";
import path from "node:path";
import pty from "node-pty";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readdir, readFile, cp, rm, lstat, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import cors from "cors";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, maxPayload: 16 * 1024 });
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || "0.0.0.0";
const PREVIEW_URL_TEMPLATE = process.env.PREVIEW_URL_TEMPLATE || "";
const DOCKER_PORT_BIND_HOST = process.env.DOCKER_PORT_BIND_HOST || "127.0.0.1";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECTS_DIR = path.resolve(__dirname, "../projects");
const TEMPLATES_DIR = path.resolve(__dirname, "../templates");
const DEV_IMAGE = "lce-dev-java-python:local";
const DEV_DOCKERFILE = path.join(__dirname, "Dockerfile.dev");
const execFileAsync = promisify(execFile);
const ALLOWED_FRAMEWORKS = new Set(["django", "springboot"]);
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.has(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

function getFrameworkConfig(framework) {
  if (framework === "django") return { containerPort: 8000, imagePrefix: "livecode-project", displayName: "Django" };
  if (framework === "springboot") return { containerPort: 8080, imagePrefix: "livecode-project", displayName: "Spring Boot" };
  return null;
}

function isValidProjectId(projectId) {
  return typeof projectId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId);
}

function getProjectPaths(projectId) {
  const projectPath = path.join(PROJECTS_DIR, projectId);
  return { projectPath, metadataPath: path.join(projectPath, "project.json"), appPath: path.join(projectPath, "app") };
}

async function readProjectMetadata(projectId) {
  const { metadataPath } = getProjectPaths(projectId);
  const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
  if (metadata.projectId !== projectId || !ALLOWED_FRAMEWORKS.has(metadata.framework)) throw new Error("Invalid project metadata.");
  return metadata;
}

function validateRelativePath(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 500 &&
    !value.includes("\\") && !value.startsWith("/") && !/^[a-zA-Z]:/.test(value) &&
    !value.split("/").some((part) => !part || part === "." || part === "..");
}

async function resolveExistingFile(appPath, requestedPath) {
  if (!validateRelativePath(requestedPath)) throw Object.assign(new Error("Provide a valid relative file path."), { statusCode: 400 });
  const root = await realpath(appPath);
  const candidate = path.resolve(root, ...requestedPath.split("/"));
  if (!candidate.startsWith(`${root}${path.sep}`)) throw Object.assign(new Error("Path is outside the project."), { statusCode: 400 });
  let current = root;
  for (const part of requestedPath.split("/")) {
    current = path.join(current, part);
    const info = await lstat(current);
    if (info.isSymbolicLink()) throw Object.assign(new Error("Symbolic links are not allowed."), { statusCode: 400 });
  }
  const info = await lstat(candidate);
  if (!info.isFile()) throw Object.assign(new Error("Requested path is not a file."), { statusCode: 400 });
  return candidate;
}

async function resolveCreationPath(appPath, requestedPath) {
  if (!validateRelativePath(requestedPath)) throw Object.assign(new Error("Provide a valid relative path."), { statusCode: 400 });
  const root = await realpath(appPath);
  const parts = requestedPath.split("/");
  const finalName = parts.pop();
  let parent = root;
  for (const part of parts) {
    parent = path.join(parent, part);
    const info = await lstat(parent);
    if (info.isSymbolicLink() || !info.isDirectory()) throw Object.assign(new Error("Parent paths must be existing folders without symbolic links."), { statusCode: 400 });
  }
  const candidate = path.resolve(parent, finalName);
  if (!candidate.startsWith(`${root}${path.sep}`)) throw Object.assign(new Error("Path is outside the project."), { statusCode: 400 });
  return candidate;
}

async function getContainerUrl(containerName, containerPort) {
  const { stdout } = await execFileAsync("docker", ["port", containerName, `${containerPort}/tcp`], { timeout: 10000, maxBuffer: 1024 * 1024 });
  const match = stdout.trim().match(/127\.0\.0\.1:(\d+)/) || stdout.trim().match(/0\.0\.0\.0:(\d+)/);
  if (!match) throw new Error(`Unable to determine host port for ${containerName}. Docker returned: ${stdout.trim()}`);
  const publishedPort = Number(match[1]);
  if (!Number.isInteger(publishedPort) || publishedPort < 1 || publishedPort > 65535) {
    throw new Error(`Docker returned an invalid published port for ${containerName}.`);
  }
  // For deployment, configure a reverse proxy and a URL template such as
  // https://preview.example.com/{port}. The proxy must route that port to the
  // Docker-published port. Without a template, this remains local-development only.
  if (PREVIEW_URL_TEMPLATE) {
    return PREVIEW_URL_TEMPLATE.replaceAll("{port}", String(publishedPort));
  }
  return `http://127.0.0.1:${publishedPort}`;
}

async function containerExists(name) {
  try { await execFileAsync("docker", ["inspect", name], { timeout: 10000 }); return true; }
  catch { return false; }
}

async function stopAndRemoveContainer(name) {
  if (!await containerExists(name)) return;
  await execFileAsync("docker", ["rm", "-f", name], { timeout: 15000, maxBuffer: 1024 * 1024 });
}

async function ensureDevImage() {
  try {
    await execFileAsync("docker", ["image", "inspect", DEV_IMAGE], { timeout: 10000 });
  } catch {
    // Build a development-only image with Java, Maven, and Python. The actual
    // Spring Boot application image remains unchanged and Java-only.
    await execFileAsync("docker", ["build", "-t", DEV_IMAGE, "-f", DEV_DOCKERFILE, __dirname], {
      timeout: 300000, maxBuffer: 2 * 1024 * 1024, windowsHide: true,
    });
  }
}

async function ensureSpringBootDevContainer(projectId, appPath) {
  const containerName = `lce-dev-${projectId}`;
  await ensureDevImage();

  if (await containerExists(containerName)) {
    try {
      await execFileAsync("docker", ["exec", containerName, "python", "--version"], { timeout: 10000 });
      return containerName;
    } catch {
      // Existing projects may still have the old Java-only development image.
      await stopAndRemoveContainer(containerName);
    }
  }

  await execFileAsync("docker", [
    "run", "-d", "--name", containerName, "--memory=1g", "--cpus=1",
    "--pids-limit=128", "--security-opt=no-new-privileges:true", "--cap-drop=ALL",
    "-v", `${path.resolve(appPath)}:/workspace`, "-w", "/workspace",
    DEV_IMAGE, "sleep", "infinity",
  ], { timeout: 120000, maxBuffer: 256 * 1024, windowsHide: true });
  return containerName;
}

app.get("/health", (_req, res) => res.json({ success: true, service: "Live Code Editor Framework Service", status: "running", frameworks: [...ALLOWED_FRAMEWORKS] }));

app.get("/api/projects", async (_req, res) => {
  try {
    await mkdir(PROJECTS_DIR, { recursive: true });
    const entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
    const projects = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const metadata = JSON.parse(await readFile(path.join(PROJECTS_DIR, entry.name, "project.json"), "utf8"));
        if (metadata.projectId === entry.name && ALLOWED_FRAMEWORKS.has(metadata.framework)) projects.push(metadata);
      } catch { /* Ignore folders that are not managed projects. */ }
    }
    projects.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    res.json({ success: true, projects });
  } catch (error) {
    console.error("Failed to list projects:", error);
    res.status(500).json({ success: false, error: "Unable to list projects." });
  }
});

app.post("/api/projects", async (req, res) => {
  let projectPath;
  try {
    const { name, framework } = req.body ?? {};
    if (typeof name !== "string" || !/^[a-zA-Z0-9_-]{1,40}$/.test(name)) return res.status(400).json({ success: false, error: "Project name must contain 1-40 letters, numbers, underscores, or hyphens." });
    if (typeof framework !== "string" || !ALLOWED_FRAMEWORKS.has(framework.toLowerCase())) return res.status(400).json({ success: false, error: "Framework must be django or springboot." });
    const normalizedFramework = framework.toLowerCase();
    const templatePath = path.join(TEMPLATES_DIR, normalizedFramework);
    await readFile(path.join(templatePath, "Dockerfile"), "utf8");
    const projectId = randomUUID();
    projectPath = path.join(PROJECTS_DIR, projectId);
    const appPath = path.join(projectPath, "app");
    await mkdir(PROJECTS_DIR, { recursive: true });
    await mkdir(projectPath);
    await cp(templatePath, appPath, { recursive: true, errorOnExist: true, force: false });
    const metadata = { projectId, name, framework: normalizedFramework, createdAt: new Date().toISOString(), status: "created" };
    await writeFile(path.join(projectPath, "project.json"), JSON.stringify(metadata, null, 2), { flag: "wx" });
    if (normalizedFramework === "springboot") {
      await ensureSpringBootDevContainer(projectId, appPath);
    }
    res.status(201).json({ success: true, project: metadata, message: `${normalizedFramework} project created with template files.` });
  } catch (error) {
    console.error("Failed to create project:", error);
    if (projectPath) await rm(projectPath, { recursive: true, force: true }).catch((cleanupError) => console.error("Project cleanup failed:", cleanupError));
    res.status(500).json({ success: false, error: "Unable to create project. Check that the framework template exists and Docker is available.", details: error.message });
  }
});

app.get("/api/projects/:projectId/files", async (req, res) => {
  const { projectId } = req.params;
  if (!isValidProjectId(projectId)) return res.status(400).json({ success: false, error: "Invalid project ID." });
  try {
    await readProjectMetadata(projectId);
    const { appPath } = getProjectPaths(projectId);
    const files = [], folders = [];
    async function collectFiles(directory, relative = "") {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) continue;
        const relativePath = relative ? `${relative}/${entry.name}` : entry.name;
        if (entry.isDirectory()) { folders.push(relativePath); await collectFiles(path.join(directory, entry.name), relativePath); }
        else if (entry.isFile()) files.push(relativePath);
      }
    }
    await collectFiles(appPath);
    files.sort(); folders.sort();
    res.json({ success: true, projectId, files, folders });
  } catch (error) {
    if (error.code === "ENOENT") return res.status(404).json({ success: false, error: "Project or project files not found." });
    console.error("Failed to list project files:", error);
    res.status(500).json({ success: false, error: "Unable to list project files." });
  }
});

app.get("/api/projects/:projectId/file", async (req, res) => {
  const { projectId } = req.params;
  const requestedPath = req.query.path;
  if (!isValidProjectId(projectId)) return res.status(400).json({ success: false, error: "Invalid project ID." });
  try {
    await readProjectMetadata(projectId);
    const filePath = await resolveExistingFile(getProjectPaths(projectId).appPath, requestedPath);
    res.json({ success: true, projectId, path: requestedPath, content: await readFile(filePath, "utf8") });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, error: error.message });
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return res.status(404).json({ success: false, error: "Project or project file not found." });
    console.error("Failed to read project file:", error);
    res.status(500).json({ success: false, error: "Unable to read project file." });
  }
});

app.put("/api/projects/:projectId/file", async (req, res) => {
  const { projectId } = req.params;
  const requestedPath = req.query.path ?? req.body?.path;
  const { content } = req.body ?? {};
  if (!isValidProjectId(projectId)) return res.status(400).json({ success: false, error: "Invalid project ID." });
  if (typeof content !== "string") return res.status(400).json({ success: false, error: "File content must be a string." });
  if (Buffer.byteLength(content, "utf8") > 100_000) return res.status(413).json({ success: false, error: "File content cannot exceed 100 KB." });
  try {
    await readProjectMetadata(projectId);
    const filePath = await resolveExistingFile(getProjectPaths(projectId).appPath, requestedPath);
    await writeFile(filePath, content, "utf8");
    res.json({ success: true, projectId, path: requestedPath, message: "Project file saved successfully." });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, error: error.message });
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return res.status(404).json({ success: false, error: "Project or project file not found." });
    console.error("Failed to save project file:", error);
    res.status(500).json({ success: false, error: "Unable to save project file." });
  }
});

app.post("/api/projects/:projectId/files", async (req, res) => {
  const { projectId } = req.params;
  const requestedPath = req.body?.path;
  if (!isValidProjectId(projectId)) return res.status(400).json({ success: false, error: "Invalid project ID." });
  if (!validateRelativePath(requestedPath)) return res.status(400).json({ success: false, error: "Provide a valid relative file path." });
  try {
    await readProjectMetadata(projectId);
    const filePath = await resolveCreationPath(getProjectPaths(projectId).appPath, requestedPath);
    await writeFile(filePath, "", { encoding: "utf8", flag: "wx" });
    res.status(201).json({ success: true, projectId, path: requestedPath, message: "File created successfully." });
  } catch (error) {
    if (error.code === "EEXIST") return res.status(409).json({ success: false, error: "A file or folder with that name already exists." });
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, error: error.message });
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return res.status(404).json({ success: false, error: "The parent folder does not exist." });
    console.error("Failed to create file:", error);
    res.status(500).json({ success: false, error: "Unable to create file." });
  }
});

app.post("/api/projects/:projectId/folders", async (req, res) => {
  const { projectId } = req.params;
  const requestedPath = req.body?.path;
  if (!isValidProjectId(projectId)) return res.status(400).json({ success: false, error: "Invalid project ID." });
  if (!validateRelativePath(requestedPath)) return res.status(400).json({ success: false, error: "Provide a valid relative folder path." });
  try {
    await readProjectMetadata(projectId);
    const folderPath = await resolveCreationPath(getProjectPaths(projectId).appPath, requestedPath);
    await mkdir(folderPath);
    res.status(201).json({ success: true, projectId, path: requestedPath, message: "Folder created successfully." });
  } catch (error) {
    if (error.code === "EEXIST") return res.status(409).json({ success: false, error: "A file or folder with that name already exists." });
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, error: error.message });
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return res.status(404).json({ success: false, error: "The parent folder does not exist." });
    console.error("Failed to create folder:", error);
    res.status(500).json({ success: false, error: "Unable to create folder." });
  }
});


app.post("/api/projects/:projectId/run", async (req, res) => {
  const { projectId } = req.params;

  if (!isValidProjectId(projectId)) {
    return res.status(400).json({
      success: false,
      error: "Invalid project ID.",
    });
  }

  const containerName = `lce-${projectId}`;
  let containerStarted = false;

  try {
    const metadata = await readProjectMetadata(projectId);
    const config = getFrameworkConfig(metadata.framework);

    if (!config) {
      return res.status(400).json({
        success: false,
        error: "Unsupported framework.",
      });
    }

    const { appPath } = getProjectPaths(projectId);

    // Reuse an already-running container.
    if (await containerExists(containerName)) {
      const { stdout: runningOutput } = await execFileAsync(
        "docker",
        [
          "inspect",
          "--format",
          "{{.State.Running}}",
          containerName,
        ],
        { timeout: 10000 }
      );

      if (runningOutput.trim() === "true") {
        const { stdout: idOutput } = await execFileAsync(
          "docker",
          ["inspect", "--format", "{{.Id}}", containerName],
          { timeout: 10000 }
        );

        const url = await getContainerUrl(
          containerName,
          config.containerPort
        );

        return res.json({
          success: true,
          projectId,
          framework: metadata.framework,
          status: "running",
          containerId: idOutput.trim(),
          url,
          message: "Project is already running.",
        });
      }

      await stopAndRemoveContainer(containerName);
    }

    // Confirm that the project has a Dockerfile.
    await readFile(path.join(appPath, "Dockerfile"), "utf8");

    // Build the project image.
    const imageName = `${config.imagePrefix}-${projectId}:local`;

    await execFileAsync(
      "docker",
      ["build", "-t", imageName, appPath],
      {
        timeout: 300000,
        maxBuffer: 2 * 1024 * 1024,
      }
    );

    // Prepare Docker run arguments.
    const dockerArgs = [
      "run",
      "-d",
      "--rm",
      "--name",
      containerName,
      "--memory=768m",
      "--cpus=1",
      "--pids-limit=128",
      "--security-opt=no-new-privileges:true",
      "--cap-drop=ALL",
      "--tmpfs",
      "/tmp:rw,noexec,nosuid,size=128m",
      "-p",
      `${DOCKER_PORT_BIND_HOST}::${config.containerPort}`,
    ];

    // Django runs using the mounted project workspace.
    // Spring Boot uses the JAR built into its Docker image.
    if (metadata.framework === "django") {
      dockerArgs.push(
        "-v",
        `${path.resolve(appPath)}:/workspace`,
        "-w",
        "/workspace"
      );
    }

    dockerArgs.push(imageName);

    const { stdout } = await execFileAsync(
      "docker",
      dockerArgs,
      {
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      }
    );

    containerStarted = true;

    const containerId = stdout.trim();

    // Confirm Docker has published the requested port.
    const url = await getContainerUrl(
      containerName,
      config.containerPort
    );

    return res.json({
      success: true,
      projectId,
      framework: metadata.framework,
      status: "starting",
      containerId,
      url,
      message: `${config.displayName} container started. Wait a few seconds for the application to become ready.`,
    });
  } catch (error) {
    console.error("Failed to run framework project:", error);

    if (error.stdout) {
      console.error("Docker stdout:", error.stdout);
    }

    if (error.stderr) {
      console.error("Docker stderr:", error.stderr);
    }

    // Clean up the failed container if it exists.
    try {
      if (containerStarted || (await containerExists(containerName))) {
        await stopAndRemoveContainer(containerName);
      }
    } catch (cleanupError) {
      console.error("Container cleanup failed:", cleanupError.message);
    }

    return res.status(500).json({
      success: false,
      error: "Unable to start the project. Check Docker, project files, build output, and container logs.",
      details: error.message,
    });
  }
});


app.post("/api/projects/:projectId/terminal", async (req, res) => {
  const { projectId } = req.params;
  const command = req.body?.command;
  if (!isValidProjectId(projectId)) return res.status(400).json({ success: false, error: "Invalid project ID." });
  if (typeof command !== "string" || !command.trim() || command.length > 1000) return res.status(400).json({ success: false, error: "Enter a command of up to 1000 characters." });
  try {
    const metadata = await readProjectMetadata(projectId);
    const { appPath } = getProjectPaths(projectId);
    const containerName = metadata.framework === "springboot"
      ? await ensureSpringBootDevContainer(projectId, appPath)
      : `lce-${projectId}`;
    const { stdout: state } = await execFileAsync("docker", ["inspect", "--format", "{{.State.Running}}", containerName], { timeout: 10000 });
    if (state.trim() !== "true") return res.status(409).json({ success: false, error: "Start the project before using its terminal." });
    const { stdout, stderr } = await execFileAsync("docker", ["exec", containerName, "/bin/sh", "-lc", command], { timeout: 15000, maxBuffer: 256 * 1024, windowsHide: true });
    res.json({ success: true, projectId, output: [stdout, stderr].filter(Boolean).join("\n"), exitCode: 0 });
  } catch (error) {
    const output = [error.stdout, error.stderr].filter(Boolean).join("\n");
    if (error.killed || error.signal === "SIGTERM") return res.status(408).json({ success: false, error: "Command timed out after 15 seconds.", output: output.slice(0, 20000) });
    if (typeof error.code === "number") return res.json({ success: true, projectId, output: output || error.message || "Command failed without output.", exitCode: error.code });
    console.error("Terminal command failed:", error);
    res.status(500).json({ success: false, error: "Could not execute the command in the project container.", details: output.slice(0, 20000) });
  }
});

app.get("/api/projects/:projectId/status", async (req, res) => {
  const { projectId } = req.params;
  if (!isValidProjectId(projectId)) return res.status(400).json({ success: false, error: "Invalid project ID." });
  try {
    const metadata = await readProjectMetadata(projectId);
    const config = getFrameworkConfig(metadata.framework);
    const containerName = `lce-${projectId}`;
    if (!await containerExists(containerName)) return res.json({ success: true, projectId, framework: metadata.framework, status: "stopped", url: null, message: "The project exists, but its container is not running." });
    const { stdout } = await execFileAsync("docker", ["inspect", "--format", "{{.State.Status}}", containerName], { timeout: 10000 });
    const status = stdout.trim();
    res.json({ success: true, projectId, framework: metadata.framework, status, url: status === "running" ? await getContainerUrl(containerName, config.containerPort) : null });
  } catch (error) {
    if (error.code === "ENOENT") return res.status(404).json({ success: false, projectId, status: "not_found", error: "Project metadata was not found." });
    console.error("Failed to check project status:", error);
    res.status(500).json({ success: false, projectId, error: "Unable to check project status." });
  }
});

app.get("/api/projects/:projectId/logs", async (req, res) => {
  const { projectId } = req.params;
  if (!isValidProjectId(projectId)) return res.status(400).json({ success: false, error: "Invalid project ID." });
  try {
    const metadata = await readProjectMetadata(projectId);
    const { stdout, stderr } = await execFileAsync("docker", ["logs", "--tail", "100", `lce-${projectId}`], { timeout: 10000, maxBuffer: 1024 * 1024 });
    res.json({ success: true, projectId, framework: metadata.framework, logs: `${stdout || ""}${stderr || ""}` });
  } catch (error) {
    console.error("Failed to retrieve project logs:", error);
    res.status(404).json({ success: false, projectId, error: "Unable to retrieve logs. Check whether the container is running." });
  }
});

app.post("/api/projects/:projectId/stop", async (req, res) => {
  const { projectId } = req.params;
  if (!isValidProjectId(projectId)) return res.status(400).json({ success: false, error: "Invalid project ID." });
  try {
    const metadata = await readProjectMetadata(projectId);
    await stopAndRemoveContainer(`lce-${projectId}`);
    res.json({ success: true, projectId, framework: metadata.framework, status: "stopped", message: `${metadata.framework} project container stopped successfully.` });
  } catch (error) {
    console.error("Failed to stop project:", error);
    res.status(500).json({ success: false, projectId, error: "Unable to stop the project. Check Docker and the project container." });
  }
});

app.delete("/api/projects/:projectId", async (req, res) => {
  const { projectId } = req.params;
  if (!isValidProjectId(projectId)) return res.status(400).json({ success: false, error: "Invalid project ID." });
  try {
    await readProjectMetadata(projectId);
    const { projectPath } = getProjectPaths(projectId);
    await stopAndRemoveContainer(`lce-${projectId}`).catch(() => {});
    await stopAndRemoveContainer(`lce-dev-${projectId}`).catch(() => {});
    await rm(projectPath, { recursive: true, force: false });
    res.json({ success: true, projectId, message: "Project deleted successfully." });
  } catch (error) {
    console.error("Failed to delete project:", error);
    if (error.code === "ENOENT") return res.status(404).json({ success: false, error: "Project not found." });
    res.status(500).json({ success: false, error: "Unable to delete the project." });
  }
});

wss.on("connection", async (ws, req) => {
  let terminal;
  try {
    const origin = req.headers.origin;
    if (origin && !ALLOWED_ORIGINS.has(origin)) { ws.close(1008, "Origin not allowed"); return; }
    // Bound incoming WebSocket messages to avoid oversized terminal payloads.
    if (ws.readyState !== 1) return;
    const requestUrl = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
    const projectId = requestUrl.searchParams.get("projectId");
    if (!projectId || !isValidProjectId(projectId)) { ws.close(1008, "Invalid project ID"); return; }
    const metadata = await readProjectMetadata(projectId);
    if (ws.readyState !== 1) return;
    const { appPath } = getProjectPaths(projectId);
    const containerName = metadata.framework === "springboot"
      ? await ensureSpringBootDevContainer(projectId, appPath)
      : `lce-${projectId}`;
    const { stdout: state } = await execFileAsync("docker", ["inspect", "--format", "{{.State.Running}}", containerName], { timeout: 10000 });
    if (state.trim() !== "true") throw new Error("Project terminal container is not running.");
    terminal = pty.spawn("docker", ["exec", "-it", containerName, "/bin/sh"], { name: "xterm-color", cols: 80, rows: 24, cwd: process.cwd(), env: process.env });
    terminal.onData((data) => { if (ws.readyState === 1) ws.send(JSON.stringify({ type: "output", data })); });
    terminal.onExit(({ exitCode }) => { if (ws.readyState === 1) { ws.send(JSON.stringify({ type: "exit", exitCode })); ws.close(); } });
    ws.on("message", (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        if (message.type === "input" && typeof message.data === "string" && message.data.length <= 4096) terminal?.write(message.data);
        else if (message.type === "resize") {
          const cols = Number(message.cols), rows = Number(message.rows);
          if (Number.isInteger(cols) && Number.isInteger(rows) && cols >= 20 && cols <= 240 && rows >= 5 && rows <= 100) terminal?.resize(cols, rows);
        }
      } catch { /* Ignore malformed terminal messages. */ }
    });
    ws.on("close", () => terminal?.kill());
    ws.on("error", () => terminal?.kill());
  } catch (error) {
    console.error("Persistent terminal connection failed:", error);
    if (ws.readyState === 1) { ws.send(JSON.stringify({ type: "error", message: "Could not open the project terminal. Make sure the project is running." })); ws.close(1011, "Terminal connection failed"); }
    terminal?.kill();
  }
});

// Consistent JSON errors for malformed JSON and rejected CORS requests.
app.use((error, _req, res, _next) => {
  if (res.headersSent) return;
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ success: false, error: "Invalid JSON request body." });
  }
  if (error.message === "Origin not allowed by CORS") {
    return res.status(403).json({ success: false, error: "Origin not allowed." });
  }
  console.error("Unhandled request error:", error);
  return res.status(500).json({ success: false, error: "Internal server error." });
});

server.listen(PORT, HOST, () => {
  console.log(`Framework service listening on ${HOST}:${PORT}`);
  console.log(`Health endpoint: http://localhost:${PORT}/health`);
  console.log(`Project API: http://localhost:${PORT}/api/projects`);
  console.log("WebSocket server is ready for terminal connections.");
});
