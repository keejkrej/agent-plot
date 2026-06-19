// @ts-nocheck
import * as fs from "node:fs";
import path from "node:path";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { sessionDir } from "../../dist/agent-lib/store.js";

function existsSync(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

export default defineTool({
  description:
    "List files and directories inside a path. Use to discover data files before reading them.",
  inputSchema: z.object({
    path: z.string().describe("Absolute path or path relative to the session directory"),
  }),
  outputSchema: z.object({
    path: z.string().optional(),
    entries: z
      .array(
        z.object({
          name: z.string(),
          type: z.enum(["directory", "file", "other"]),
        }),
      )
      .optional(),
    error: z.string().optional(),
  }),
  async execute({ path: target }, ctx) {
    const dir = sessionDir(ctx.session.id);
    const abs = path.isAbsolute(target) ? target : path.resolve(dir, target);
    if (!existsSync(abs)) return { error: `directory not found: ${target}` };
    const stat = fs.statSync(abs);
    if (!stat.isDirectory()) return { error: `path is not a directory: ${target}` };
    try {
      const entries = fs.readdirSync(abs, { withFileTypes: true }).map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? ("directory" as const) : entry.isFile() ? ("file" as const) : ("other" as const),
      }));
      return { path: target, entries };
    } catch (cause) {
      return { error: `failed to list ${target}: ${cause instanceof Error ? cause.message : String(cause)}` };
    }
  },
});
