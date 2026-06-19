// @ts-nocheck
import { spawn } from "node:child_process";
import path from "node:path";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { sessionDir } from "../../dist/agent-lib/store.js";

function runShell(
  cwd: string,
  command: string,
  args: string[],
  timeoutMs = 60_000,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false });
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

export default defineTool({
  description:
    "Run a shell command inside the session directory. Use for uv/python invocations, file operations, or quick checks. " +
    "Prefer run_python for Python analysis scripts.",
  inputSchema: z.object({
    command: z.string().describe("Command to run (e.g. 'uv', 'ls', 'python')"),
    args: z.array(z.string()).optional().describe("Command arguments"),
    timeoutSeconds: z.number().optional().describe("Timeout in seconds (default 60)"),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    stdout: z.string().optional(),
    stderr: z.string().optional(),
    code: z.number().nullable().optional(),
    error: z.string().optional(),
  }),
  async execute({ command, args, timeoutSeconds }, ctx) {
    try {
      const dir = sessionDir(ctx.session.id);
      const result = await runShell(dir, command, args ?? [], (timeoutSeconds ?? 60) * 1000);
      return { ok: true, ...result };
    } catch (cause) {
      return {
        ok: false,
        error: cause instanceof Error ? cause.message : String(cause),
      };
    }
  },
});
