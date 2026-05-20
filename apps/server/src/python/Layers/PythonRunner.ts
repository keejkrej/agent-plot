import { spawn } from "node:child_process";
import path from "node:path";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { PY_ANALYSIS_ROOT } from "../paths.ts";
import { PythonRunner, type PythonResult } from "../Services/PythonRunner.ts";

const PY_ROOT = PY_ANALYSIS_ROOT;

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

const runScript = (
  scriptName: "describe_tiff.py" | "build_artifacts.py",
  sessionDir: string,
  tiffPath: string | undefined,
  timeoutMs: number,
): Effect.Effect<PythonResult<unknown>, never> =>
  Effect.tryPromise({
    try: async () => {
      const script = path.join(PY_ROOT, "scripts", scriptName);
      const args = [script, sessionDir];
      if (tiffPath) args.push(tiffPath);
      const { stdout, stderr, code } = await runUv(args, sessionDir, timeoutMs);
      if (code !== 0) return { ok: false as const, stderr: stderr || stdout, code };
      return { ok: true as const, data: JSON.parse(stdout.trim()) as unknown };
    },
    catch: (cause) => cause,
  }).pipe(
    Effect.catch((cause) =>
      Effect.succeed({
        ok: false as const,
        stderr: String(cause),
        code: null,
      }),
    ),
  );

export const layer = Layer.succeed(
  PythonRunner,
  PythonRunner.of({
    describeTiff: (sessionDir, tiffPath) =>
      runScript("describe_tiff.py", sessionDir, tiffPath, 60_000),
    buildArtifacts: (sessionDir, tiffPath) =>
      runScript("build_artifacts.py", sessionDir, tiffPath, 120_000),
  }),
);
