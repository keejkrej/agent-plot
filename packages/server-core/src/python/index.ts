import { spawn } from "node:child_process";
import path from "node:path";
import { PY_ANALYSIS_ROOT } from "./paths.js";

const PY_ROOT = PY_ANALYSIS_ROOT;

export type PythonResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly stderr: string; readonly code: number | null };

function runUv(
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
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

async function runScript<T = unknown>(
  scriptName: "describe_tiff.py" | "build_artifacts.py",
  sessionDir: string,
  tiffPath: string | undefined,
  timeoutMs: number,
): Promise<PythonResult<T>> {
  try {
    const script = path.join(PY_ROOT, "scripts", scriptName);
    const args = [script, sessionDir];
    if (tiffPath) args.push(tiffPath);
    const { stdout, stderr, code } = await runUv(args, sessionDir, timeoutMs);
    if (code !== 0) {
      return { ok: false, stderr: stderr || stdout, code };
    }
    return { ok: true, data: JSON.parse(stdout.trim()) as T };
  } catch (cause) {
    return { ok: false, stderr: String(cause), code: null };
  }
}

export function describeTiff(
  sessionDir: string,
  tiffPath?: string,
): Promise<PythonResult<unknown>> {
  return runScript("describe_tiff.py", sessionDir, tiffPath, 60_000);
}

export function buildArtifacts(
  sessionDir: string,
  tiffPath?: string,
): Promise<PythonResult<unknown>> {
  return runScript("build_artifacts.py", sessionDir, tiffPath, 120_000);
}
