import * as fs from "node:fs";
import path from "node:path";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { getDefaultStore, sessionDir } from "#lib/store";

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

export default defineTool({
  description:
    "Read the contents of a file. Use for inspecting data, configs, or script output. " +
    "For CSV/data files, prefer small offsets/limits. For binary files, returns a note.",
  inputSchema: z.object({
    path: z.string().describe("Absolute path or path relative to the session directory"),
    offset: z.number().optional().describe("Start line (1-indexed)"),
    limit: z.number().optional().describe("Max number of lines to return"),
  }),
  outputSchema: z.object({
    path: z.string().optional(),
    content: z.string().optional(),
    size: z.number().optional(),
    error: z.string().optional(),
  }),
  async execute({ path: target, offset, limit }, ctx) {
    const dir = sessionDir(ctx.session.id);
    const abs = path.isAbsolute(target) ? target : path.resolve(dir, target);
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
});
