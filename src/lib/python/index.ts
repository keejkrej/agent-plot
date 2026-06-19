import { spawn } from "node:child_process";
import * as fs from "node:fs";
import path from "node:path";
import { getVenvPython } from "./bootstrap";
import { PY_ANALYSIS_ROOT, UV_CACHE_DIR, UV_PYTHON_INSTALL_DIR } from "#lib/python/paths";

export type PythonResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly stderr: string; readonly code: number | null };

function runVenvPython(
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    getVenvPython()
      .then((python) => {
        const env: NodeJS.ProcessEnv = {
          ...process.env,
          UV_PYTHON_INSTALL_DIR,
          UV_CACHE_DIR,
          UV_TOOLCHAIN_DIR: UV_PYTHON_INSTALL_DIR,
          PYTHONPATH: [process.env.PYTHONPATH, PY_ANALYSIS_ROOT].filter(Boolean).join(path.delimiter),
        };
        const child = spawn(python, args, { cwd, windowsHide: true, env });
        let stdout = "";
        let stderr = "";
        const timer = setTimeout(() => {
          child.kill("SIGTERM");
          reject(new Error(`python timeout after ${timeoutMs}ms`));
        }, timeoutMs);
        child.stdout?.on("data", (d) => (stdout += d.toString()));
        child.stderr?.on("data", (d) => (stderr += d.toString()));
        child.on("error", (err) => {
          clearTimeout(timer);
          reject(err);
        });
        child.on("close", (code) => {
          clearTimeout(timer);
          resolve({ stdout, stderr, code });
        });
      })
      .catch(reject);
  });
}

export async function buildArtifacts(
  sessionDir: string,
  timeoutMs = 120_000,
): Promise<PythonResult<unknown>> {
  const script = path.join(PY_ANALYSIS_ROOT, "scripts", "build_artifacts.py");
  if (!fs.existsSync(script)) {
    return { ok: false, stderr: `builtin script not found: ${script}`, code: null };
  }
  try {
    const { stdout, stderr, code } = await runVenvPython([script, sessionDir], sessionDir, timeoutMs);
    if (code !== 0) {
      return { ok: false, stderr: stderr || stdout, code };
    }
    return { ok: true, data: JSON.parse(stdout.trim()) };
  } catch (cause) {
    return { ok: false, stderr: String(cause), code: null };
  }
}

export async function runPythonScript(
  sessionDir: string,
  scriptPath: string,
  args: string[] = [],
  timeoutMs = 120_000,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return runVenvPython([scriptPath, ...args], sessionDir, timeoutMs);
}
