// @ts-nocheck
import { defineTool } from "eve/tools";
import { z } from "zod";
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
    "Update the user's experimental goal, scientific background, preferred output format, or local data folder. " +
    "Use this when the user tells you about their experiment, what they want to focus on, or where their data lives.",
  inputSchema: z.object({
    experimentalGoal: z.string().optional(),
    scientificBackground: z.string().optional(),
    preferredOutputFormat: z.string().optional(),
    dataFolder: z.string().optional(),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    context: z.record(z.string(), z.string()).optional(),
  }),
  async execute(context, ctx) {
    const store = getDefaultStore();
    const next = stripUndefined(context) as Record<string, string>;
    await store.updateSessionContext(ctx.session.id, next);
    return { ok: true, context: next };
  },
});
