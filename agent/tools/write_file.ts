import * as fs from "node:fs";
import path from "node:path";
import { defineTool } from "eve/tools";
import { z } from "zod";
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
    "Write a text file inside the session workspace. Use for creating Python scripts, README notes, or intermediate data files. " +
    "The path is relative to the session directory and cannot escape it.",
  inputSchema: z.object({
    path: z.string().describe("Relative path inside the session directory (e.g. scripts/my_analysis.py)"),
    content: z.string().describe("File content"),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    path: z.string().optional(),
    error: z.string().optional(),
  }),
  async execute({ path: target, content }, ctx) {
    try {
      const dir = sessionDir(ctx.session.id);
      const abs = ensureInsideSessionDir(dir, target);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content, "utf8");
      return { ok: true, path: target };
    } catch (cause) {
      return {
        ok: false,
        error: cause instanceof Error ? cause.message : String(cause),
      };
    }
  },
});
