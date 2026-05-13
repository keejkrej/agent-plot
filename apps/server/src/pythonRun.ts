import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../../");
const PY_ROOT = path.join(REPO_ROOT, "python", "analysis");

export type PythonResult<T> = { ok: true; data: T } | { ok: false; stderr: string; code: number | null };

function runUv(args: string[], cwd: string, timeoutMs: number): Promise<{ stdout: string; stderr: string; code: number | null }> {
  const uv = process.platform === "win32" ? "uv.cmd" : "uv";
  const fullArgs = ["run", "--directory", PY_ROOT, "python", ...args];
  return new Promise((resolve, reject) => {
    const child = spawn(uv, fullArgs, { cwd, windowsHide: true });
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
  });
}

export async function describeTiff(sessionDir: string): Promise<PythonResult<unknown>> {
  try {
    const script = path.join(PY_ROOT, "scripts", "describe_tiff.py");
    const { stdout, stderr, code } = await runUv([script, sessionDir], sessionDir, 60_000);
    if (code !== 0) return { ok: false, stderr: stderr || stdout, code };
    return { ok: true, data: JSON.parse(stdout.trim()) };
  } catch (e) {
    return { ok: false, stderr: String(e), code: null };
  }
}

export async function buildArtifacts(sessionDir: string): Promise<PythonResult<unknown>> {
  try {
    const script = path.join(PY_ROOT, "scripts", "build_artifacts.py");
    const { stdout, stderr, code } = await runUv([script, sessionDir], sessionDir, 120_000);
    if (code !== 0) return { ok: false, stderr: stderr || stdout, code };
    return { ok: true, data: JSON.parse(stdout.trim()) };
  } catch (e) {
    return { ok: false, stderr: String(e), code: null };
  }
}
