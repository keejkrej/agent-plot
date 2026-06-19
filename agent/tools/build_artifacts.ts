// @ts-nocheck
import { defineTool } from "eve/tools";
import { z } from "zod";
import { refreshSessionCanvas } from "../../dist/agent-lib/canvasRefresh.js";
import { buildArtifacts } from "../../dist/agent-lib/python/index.js";
import { getDefaultStore, sessionDir } from "../../dist/agent-lib/store.js";

export default defineTool({
  description:
    "Build the json-render canvas artifacts for the session. " +
    "Call this after writing analysis CSV/JSON/PNG artifacts to refresh the canvas panel.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    ok: z.boolean(),
    spec: z.unknown().optional(),
    artifactNote: z.string().optional(),
    stderr: z.string().optional(),
    code: z.number().nullable().optional(),
    error: z.string().optional(),
  }),
  async execute(_input, ctx) {
    const store = getDefaultStore();
    const dir = sessionDir(ctx.session.id);
    const buildResult = await buildArtifacts(dir);
    if (!buildResult.ok) {
      return { ok: false, stderr: buildResult.stderr, code: buildResult.code };
    }
    const refresh = await refreshSessionCanvas(store, ctx.session.id);
    if (!refresh.ok) {
      return { ok: false, artifactNote: refresh.artifactNote, error: refresh.error };
    }
    return { ok: true, spec: refresh.spec, artifactNote: refresh.artifactNote };
  },
});
