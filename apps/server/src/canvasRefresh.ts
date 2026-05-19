import { applyCanvasVisibility } from "./canvasIntent.js";
import { jsonRender, type CanvasSpec } from "./mergeCanvas.js";
import { buildArtifacts } from "./pythonRun.js";
import { readCanvasVisibility, type Session } from "./session.js";

const ARTIFACT_PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN ?? "";

const defaultPayload = {
  raw: "./artifacts/raw_preview.png",
  fft: "./artifacts/fft_mag.png",
  stats: "./artifacts/stats.csv",
};

export type CanvasRefreshResult =
  | { ok: true; spec: CanvasSpec; artifactNote: string }
  | { ok: false; artifactNote: string; error?: string };

/** Build artifacts (if possible) and return a canvas spec with session visibility prefs applied. */
export async function refreshSessionCanvas(
  session: Session,
  sessionId: string,
): Promise<CanvasRefreshResult> {
  const visibility = await readCanvasVisibility(session);
  const built = await buildArtifacts(session.dir);
  if (!built.ok) {
    return {
      ok: false,
      artifactNote: `Artifact build skipped/failed: ${built.stderr}\n`,
    };
  }

  try {
    let spec = await jsonRender(session.dir, sessionId, ARTIFACT_PUBLIC_ORIGIN, defaultPayload);
    spec = applyCanvasVisibility(spec, visibility);
    return { ok: true, spec, artifactNote: "Artifacts ready.\n" };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return { ok: false, artifactNote: "Artifacts built but canvas merge failed.\n", error: m };
  }
}
