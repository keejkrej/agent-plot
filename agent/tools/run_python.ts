import * as fs from "node:fs";
import path from "node:path";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { runPythonScript } from "#lib/python";
import { sessionDir } from "#lib/store";

function ensureInsideSessionDir(sessionDir: string, target: string): string {
  const abs = path.resolve(sessionDir, target);
  const root = path.resolve(sessionDir);
  if (!abs.startsWith(root + path.sep) && abs !== root) {
    throw new Error(`path escapes session directory: ${target}`);
  }
  return abs;
}

export default defineTool({
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
  outputSchema: z.object({
    ok: z.boolean(),
    scriptPath: z.string().optional(),
    stdout: z.string().optional(),
    stderr: z.string().optional(),
    code: z.number().nullable().optional(),
    error: z.string().optional(),
  }),
  async execute({ script_name, code, args, timeoutSeconds }, ctx) {
    const dir = sessionDir(ctx.session.id);
    const scriptPath = `scripts/${script_name}.py`;
    const abs = ensureInsideSessionDir(dir, scriptPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, code, "utf8");
    try {
      const result = await runPythonScript(dir, abs, args ?? [], (timeoutSeconds ?? 120) * 1000);
      return { ok: true, scriptPath, ...result };
    } catch (cause) {
      return {
        ok: false,
        scriptPath,
        error: cause instanceof Error ? cause.message : String(cause),
      };
    }
  },
});
