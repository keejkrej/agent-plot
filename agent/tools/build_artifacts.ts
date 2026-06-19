import { defineTool } from "eve/tools";
import { z } from "zod";
import { refreshSessionCanvas } from "#lib/canvasRefresh";
import { buildArtifacts } from "#lib/python";
import { getDefaultStore, sessionDir } from "#lib/store";

export default defineTool({
  description:
    "Build the json-render canvas artifacts for the session. " +
    "For TIFF data, pass the TIFF path. After this succeeds, the canvas will refresh and the returned spec can be rendered.",
  inputSchema: z.object({
    tiff_path: z.string().optional().describe("Optional absolute path to a TIFF file"),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    spec: z.unknown().optional(),
    artifactNote: z.string().optional(),
    stderr: z.string().optional(),
    code: z.number().nullable().optional(),
    error: z.string().optional(),
  }),
  async execute({ tiff_path }, ctx) {
    const store = getDefaultStore();
    const dir = sessionDir(ctx.session.id);
    const buildResult = await buildArtifacts(dir, tiff_path);
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
