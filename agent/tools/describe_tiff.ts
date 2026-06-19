import * as fs from "node:fs";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { describeTiff } from "#lib/python";
import { sessionDir } from "#lib/store";

function formatPythonResult(result: { ok: true; data: unknown } | { ok: false; stderr: string; code: number | null }): Record<string, unknown> {
  if (result.ok) {
    return { ok: true, data: result.data };
  }
  return { ok: false, stderr: result.stderr, code: result.code };
}

export default defineTool({
  description:
    "Describe a TIFF file: shape, dtype, min/max, p1/p99 percentiles. " +
    "Use this before building artifacts or when the user points at a .tif/.tiff file.",
  inputSchema: z.object({
    path: z.string().describe("Absolute path to the TIFF file"),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    data: z.unknown().optional(),
    stderr: z.string().optional(),
    code: z.number().nullable().optional(),
    error: z.string().optional(),
  }),
  async execute({ path: target }, ctx) {
    if (!fs.existsSync(target)) return { ok: false, error: `file not found: ${target}` };
    const dir = sessionDir(ctx.session.id);
    const result = await describeTiff(dir, target);
    return formatPythonResult(result);
  },
});
