// @ts-nocheck
import { defineTool } from "eve/tools";
import { z } from "zod";
import { mergeCanvasVisibility, type CanvasVisibility } from "../../dist/agent-lib/canvasIntent.js";
import { getDefaultStore } from "../../dist/agent-lib/store.js";

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export default defineTool({
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
  outputSchema: z.object({
    ok: z.boolean(),
    visibility: z.record(z.string(), z.boolean()).optional(),
  }),
  async execute(delta, ctx) {
    const store = getDefaultStore();
    const prev = store.readCanvasVisibility(ctx.session.id);
    const deltaClean = stripUndefined(delta) as Partial<CanvasVisibility>;
    const next = mergeCanvasVisibility(prev, deltaClean);
    store.writeCanvasVisibility(ctx.session.id, next);
    return { ok: true, visibility: next };
  },
});
