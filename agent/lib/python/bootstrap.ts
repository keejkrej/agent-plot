import { spawn } from "node:child_process";
import * as fs from "node:fs";
import https from "node:https";
import path from "node:path";
import {
  PY_ANALYSIS_ROOT,
  UV_BIN_PATH,
  UV_CACHE_DIR,
  UV_PYTHON_BIN_PATH,
  UV_PYTHON_INSTALL_DIR,
  UV_ROOT,
  UV_TEMP_DIR,
  UV_VENV_PATH,
} from "#lib/python/paths";

const UV_VERSION = "0.11.21";

/** Platform/arch suffix used by uv GitHub releases. */
function uvReleaseSuffix(): { platform: string; arch: string; ext: string } {
  let platform: string;
  switch (process.platform) {
    case "win32":
      platform = "pc-windows-msvc";
      break;
    case "darwin":
      platform = "apple-darwin";
      break;
    default:
      platform = "unknown-linux-gnu";
      break;
  }
  const arch = process.arch === "arm64" ? "aarch64" : process.arch === "x64" ? "x86_64" : process.arch;
  const ext = process.platform === "win32" ? "zip" : "tar.gz";
  return { platform, arch, ext };
}

function uvDownloadUrl(): string {
  const { platform, arch, ext } = uvReleaseSuffix();
  return `https://github.com/astral-sh/uv/releases/download/${UV_VERSION}/uv-${arch}-${platform}.${ext}`;
}

function runCommand(
  command: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv; stdio?: "inherit" | "pipe" },
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  const stdio = options?.stdio ?? "inherit";
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options?.cwd,
      env: options?.env,
      windowsHide: true,
      stdio: stdio === "inherit" ? ["ignore", "inherit", "inherit"] : ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    if (stdio === "pipe") {
      child.stdout?.on("data", (d) => (stdout += d.toString()));
      child.stderr?.on("data", (d) => (stderr += d.toString()));
    }
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ stdout, stderr, code });
    });
  });
}

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https
      .get(url, { headers: { Accept: "application/octet-stream" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
          const loc = res.headers.location;
          if (!loc) {
            file.close();
            return reject(new Error(`redirect from ${url} without location`));
          }
          file.close();
          return downloadFile(new URL(loc, url).toString(), destPath).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          return reject(new Error(`download ${url} failed with status ${res.statusCode}`));
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        file.close();
        reject(err);
      });
  });
}

async function extractArchive(archivePath: string, destDir: string): Promise<void> {
  fs.mkdirSync(destDir, { recursive: true });
  if (archivePath.endsWith(".zip")) {
    if (process.platform === "win32") {
      await runCommand("powershell", [
        "-NoProfile",
        "-Command",
        `Expand-Archive -Path '${archivePath}' -DestinationPath '${destDir}' -Force`,
      ]);
    } else {
      await runCommand("unzip", ["-o", archivePath, "-d", destDir]);
    }
  } else {
    await runCommand("tar", ["-xzf", archivePath, "-C", destDir]);
  }
}

/** Locate the extracted uv binary inside a temp directory. */
function findExtractedUv(dir: string): string | null {
  const candidates = [
    path.join(dir, process.platform === "win32" ? "uv.exe" : "uv"),
    path.join(dir, `uv-${process.arch === "arm64" ? "aarch64" : "x86_64"}-${process.platform === "darwin" ? "apple-darwin" : "unknown-linux-gnu"}`, process.platform === "win32" ? "uv.exe" : "uv"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  // fallback: scan one level deep
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      const nested = path.join(full, process.platform === "win32" ? "uv.exe" : "uv");
      if (fs.existsSync(nested)) return nested;
    }
  }
  return null;
}

/** Download and install the private uv binary into ~/.agent-plot/.uv/bin/uv. */
export async function ensureUvBinary(): Promise<string> {
  if (fs.existsSync(UV_BIN_PATH)) {
    fs.chmodSync(UV_BIN_PATH, 0o755);
    return UV_BIN_PATH;
  }

  fs.mkdirSync(path.dirname(UV_BIN_PATH), { recursive: true });
  fs.mkdirSync(UV_TEMP_DIR, { recursive: true });

  const url = uvDownloadUrl();
  const archiveName = path.basename(new URL(url).pathname);
  const archivePath = path.join(UV_TEMP_DIR, archiveName);

  await downloadFile(url, archivePath);

  const extractDir = path.join(UV_TEMP_DIR, "extracted");
  await extractArchive(archivePath, extractDir);

  const extracted = findExtractedUv(extractDir);
  if (!extracted) {
    throw new Error(`could not locate uv binary after extracting ${archivePath}`);
  }

  fs.renameSync(extracted, UV_BIN_PATH);
  fs.chmodSync(UV_BIN_PATH, 0o755);

  // cleanup
  try {
    fs.rmSync(UV_TEMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore cleanup failures
  }

  return UV_BIN_PATH;
}

function uvEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    UV_PYTHON_INSTALL_DIR,
    UV_CACHE_DIR,
    UV_TOOLCHAIN_DIR: UV_PYTHON_INSTALL_DIR,
  };
}

/** Install managed Python, create the isolated venv, and install project deps. Idempotent. */
export async function ensureUvVenv(): Promise<string> {
  if (fs.existsSync(UV_PYTHON_BIN_PATH)) {
    return UV_PYTHON_BIN_PATH;
  }

  const uv = await ensureUvBinary();
  fs.mkdirSync(UV_ROOT, { recursive: true });

  const env = uvEnv();

  // 1. Install a managed Python into UV_PYTHON_INSTALL_DIR.
  const installResult = await runCommand(uv, ["python", "install", "3.13"], { cwd: UV_ROOT, env, stdio: "pipe" });
  if (installResult.code !== 0) {
    throw new Error(`uv python install failed: ${installResult.stderr || installResult.stdout}`);
  }

  // 2. Create the venv using that managed install.
  const venvResult = await runCommand(
    uv,
    ["venv", "--python-preference", "only-managed", UV_VENV_PATH],
    { cwd: UV_ROOT, env, stdio: "pipe" },
  );
  if (venvResult.code !== 0) {
    throw new Error(`uv venv failed: ${venvResult.stderr || venvResult.stdout}`);
  }

  // 3. Install project dependencies from pyproject.toml into the venv.
  const pyproject = path.join(PY_ANALYSIS_ROOT, "pyproject.toml");
  if (!fs.existsSync(pyproject)) {
    throw new Error(`pyproject.toml not found at ${pyproject}`);
  }
  const pipResult = await runCommand(
    uv,
    ["pip", "install", "-r", pyproject, "-p", UV_PYTHON_BIN_PATH],
    { cwd: UV_ROOT, env, stdio: "pipe" },
  );
  if (pipResult.code !== 0) {
    throw new Error(`uv pip install failed: ${pipResult.stderr || pipResult.stdout}`);
  }

  return UV_PYTHON_BIN_PATH;
}

let venvPromise: Promise<string> | null = null;

/** Lazy, cached bootstrap of the isolated Python environment. */
export function getVenvPython(): Promise<string> {
  if (!venvPromise) {
    venvPromise = ensureUvVenv().catch((err) => {
      venvPromise = null;
      throw err;
    });
  }
  return venvPromise;
}

/** For diagnostics: report which uv/python paths would be used. */
export function describePythonRuntime(): string {
  return [
    `uv binary: ${UV_BIN_PATH} (${fs.existsSync(UV_BIN_PATH) ? "present" : "missing"})`,
    `venv python: ${UV_PYTHON_BIN_PATH} (${fs.existsSync(UV_PYTHON_BIN_PATH) ? "present" : "missing"})`,
    `python install dir: ${UV_PYTHON_INSTALL_DIR}`,
    `uv cache dir: ${UV_CACHE_DIR}`,
  ].join("\n");
}
