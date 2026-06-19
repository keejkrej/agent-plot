import * as fs from "node:fs";
import path from "node:path";
import { tool } from "ai";
import { z } from "zod";
import { buildArtifacts, describeTiff, runPythonScript, type PythonResult } from "../python/index.js";
import {
  applyCanvasVisibility,
  defaultCanvasVisibility,
  mergeCanvasVisibility,
  parseCanvasIntentDelta,
  type CanvasVisibility,
} from "../canvasIntent.js";
import type { SessionStore } from "../store.js";

export type ToolCallbacks = {
  onActivity?: (label: string, detail?: string) => Promise<void> | void;
};

function stripUndefined<T extends Record<string, unknown>>(obj: T): { [K in keyof T]?: Exclude<T[K], undefined> } {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out as { [K in keyof T]?: Exclude<T[K], undefined> };
}

type ToolDeps = {
  sessionId: string;
  sessionDir: string;
  store: SessionStore;
  callbacks?: ToolCallbacks;
};

function ensureInsideSessionDir(sessionDir: string, target: string): string {
  const abs = path.resolve(sessionDir, target);
  const root = path.resolve(sessionDir);
  if (!abs.startsWith(root + path.sep) && abs !== root) {
    throw new Error(`path escapes session directory: ${target}`);
  }
  return abs;
}

function existsSync(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function readTextFile(p: string, offset?: number, limit?: number): string {
  const content = fs.readFileSync(p, "utf8");
  const lines = content.split("\n");
  const start = offset && offset > 0 ? offset - 1 : 0;
  const end = limit && limit > 0 ? start + limit : lines.length;
  const selected = lines.slice(start, end);
  const truncated = end < lines.length;
  let out = selected.join("\n");
  if (truncated) out += "\n... (truncated)";
  return out;
}

async function runShell(
  sessionDir: string,
  command: string,
  args: string[],
  timeoutMs = 60_000,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  const { spawn } = await import("node:child_process");
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: sessionDir, shell: false });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`shell timeout after ${timeoutMs}ms`));
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

function formatPythonResult(result: PythonResult<unknown>): Record<string, unknown> {
  if (result.ok) {
    return { ok: true, data: result.data };
  }
  return { ok: false, stderr: result.stderr, code: result.code };
}

export function createAgentTools(deps: ToolDeps) {
  const { sessionDir, store, callbacks } = deps;

  return {
    read_file: tool({
      description:
        "Read the contents of a file. Use for inspecting data, configs, or script output. " +
        "For CSV/data files, prefer small offsets/limits. For binary files, returns a note.",
      inputSchema: z.object({
        path: z.string().describe("Absolute path or path relative to the session directory"),
        offset: z.number().optional().describe("Start line (1-indexed)"),
        limit: z.number().optional().describe("Max number of lines to return"),
      }),
      execute: async ({ path: target, offset, limit }) => {
        const abs = path.isAbsolute(target) ? target : path.resolve(sessionDir, target);
        if (!existsSync(abs)) return { error: `file not found: ${target}` };
        const stat = fs.statSync(abs);
        if (stat.isDirectory()) return { error: `path is a directory: ${target}` };
        if (!stat.isFile()) return { error: `not a regular file: ${target}` };
        try {
          const content = readTextFile(abs, offset, limit);
          return { path: target, content, size: stat.size };
        } catch (cause) {
          return { error: `failed to read ${target}: ${cause instanceof Error ? cause.message : String(cause)}` };
        }
      },
    }),

    list_directory: tool({
      description:
        "List files and directories inside a path. Use to discover data files before reading them.",
      inputSchema: z.object({
        path: z.string().describe("Absolute path or path relative to the session directory"),
      }),
      execute: async ({ path: target }) => {
        const abs = path.isAbsolute(target) ? target : path.resolve(sessionDir, target);
        if (!existsSync(abs)) return { error: `directory not found: ${target}` };
        const stat = fs.statSync(abs);
        if (!stat.isDirectory()) return { error: `path is not a directory: ${target}` };
        try {
          const entries = fs.readdirSync(abs, { withFileTypes: true }).map((entry) => ({
            name: entry.name,
            type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other",
          }));
          return { path: target, entries };
        } catch (cause) {
          return { error: `failed to list ${target}: ${cause instanceof Error ? cause.message : String(cause)}` };
        }
      },
    }),

    write_file: tool({
      description:
        "Write a text file inside the session workspace. Use for creating Python scripts, README notes, or intermediate data files. " +
        "The path is relative to the session directory and cannot escape it.",
      inputSchema: z.object({
        path: z.string().describe("Relative path inside the session directory (e.g. scripts/my_analysis.py)"),
        content: z.string().describe("File content"),
      }),
      execute: async ({ path: target, content }) => {
        try {
          const abs = ensureInsideSessionDir(sessionDir, target);
          fs.mkdirSync(path.dirname(abs), { recursive: true });
          fs.writeFileSync(abs, content, "utf8");
          await callbacks?.onActivity?.("Wrote file", target);
          return { ok: true, path: target };
        } catch (cause) {
          return {
            ok: false,
            error: cause instanceof Error ? cause.message : String(cause),
          };
        }
      },
    }),

    run_shell: tool({
      description:
        "Run a shell command inside the session directory. Use for uv/python invocations, file operations, or quick checks. " +
        "Prefer run_python for Python analysis scripts.",
      inputSchema: z.object({
        command: z.string().describe("Command to run (e.g. 'uv', 'ls', 'python')"),
        args: z.array(z.string()).optional().describe("Command arguments"),
        timeoutSeconds: z.number().optional().describe("Timeout in seconds (default 60)"),
      }),
      execute: async ({ command, args, timeoutSeconds }) => {
        await callbacks?.onActivity?.("Running shell", `${command} ${(args ?? []).join(" ")}`);
        try {
          const result = await runShell(sessionDir, command, args ?? [], (timeoutSeconds ?? 60) * 1000);
          return { ok: true, ...result };
        } catch (cause) {
          return {
            ok: false,
            error: cause instanceof Error ? cause.message : String(cause),
          };
        }
      },
    }),

    run_python: tool({
      description:
        "Write a Python script inside the session workspace and execute it with uv. " +
        "Use this for data analysis, plotting, and producing CSV/JSON artifacts. " +
        "The script_name is used to create scripts/<script_name>.py.",
      inputSchema: z.object({
        script_name: z.string().describe("Name for the script (without .py extension)"),
        code: z.string().describe("Python code to write and run"),
        args: z.array(z.string()).optional().describe("Arguments to pass to the script"),
        timeoutSeconds: z.number().optional().describe("Timeout in seconds (default 120)"),
      }),
      execute: async ({ script_name, code, args, timeoutSeconds }) => {
        const scriptPath = `scripts/${script_name}.py`;
        const abs = ensureInsideSessionDir(sessionDir, scriptPath);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, code, "utf8");
        await callbacks?.onActivity?.("Running Python", scriptPath);
        try {
          const result = await runPythonScript(sessionDir, abs, args ?? [], (timeoutSeconds ?? 120) * 1000);
          return { ok: true, scriptPath, ...result };
        } catch (cause) {
          return {
            ok: false,
            scriptPath,
            error: cause instanceof Error ? cause.message : String(cause),
          };
        }
      },
    }),

    describe_tiff: tool({
      description:
        "Describe a TIFF file: shape, dtype, min/max, p1/p99 percentiles. " +
        "Use this before building artifacts or when the user points at a .tif/.tiff file.",
      inputSchema: z.object({
        path: z.string().describe("Absolute path to the TIFF file"),
      }),
      execute: async ({ path: target }) => {
        if (!existsSync(target)) return { error: `file not found: ${target}` };
        const result = await describeTiff(sessionDir, target);
        return formatPythonResult(result);
      },
    }),

    build_artifacts: tool({
      description:
        "Build the json-render canvas artifacts for the session. " +
        "For TIFF data, pass the TIFF path. After this succeeds, the canvas will refresh.",
      inputSchema: z.object({
        tiff_path: z.string().optional().describe("Optional absolute path to a TIFF file"),
      }),
      execute: async ({ tiff_path }) => {
        await callbacks?.onActivity?.("Building canvas artifacts");
        const result = await buildArtifacts(sessionDir, tiff_path);
        return formatPythonResult(result);
      },
    }),

    set_canvas_visibility: tool({
      description:
        "Show or hide canvas panels (raw preview, FFT, line plot, histogram, metadata, row mean). " +
        "Use when the user asks to change what is displayed.",
      inputSchema: z.object({
        raw: z.boolean().optional(),
        fft: z.boolean().optional(),
        line: z.boolean().optional(),
        hist: z.boolean().optional(),
        meta: z.boolean().optional(),
        rowMean: z.boolean().optional(),
      }),
      execute: async (delta) => {
        const prev = store.readCanvasVisibility(deps.sessionId);
        const next = mergeCanvasVisibility(prev, stripUndefined(delta));
        store.writeCanvasVisibility(deps.sessionId, next);
        return { ok: true, visibility: next };
      },
    }),

    set_user_context: tool({
      description:
        "Update the user's experimental goal, scientific background, or preferred output format. " +
        "Use this when the user tells you about their experiment or what they want to focus on.",
      inputSchema: z.object({
        experimentalGoal: z.string().optional(),
        scientificBackground: z.string().optional(),
        preferredOutputFormat: z.string().optional(),
      }),
      execute: async (context) => {
        await store.updateSessionContext(deps.sessionId, stripUndefined(context));
        return { ok: true, context };
      },
    }),
  };
}

export type AgentTools = ReturnType<typeof createAgentTools>;
