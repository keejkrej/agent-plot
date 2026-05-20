import { access } from "node:fs/promises";
import path from "node:path";
import { applyCanvasVisibility } from "./canvasIntent.js";
import { jsonRender, type CanvasSpec } from "./mergeCanvas.js";
import { buildArtifacts } from "./pythonRun.js";
import { readCanvasVisibility, type Session } from "./session.js";

const ARTIFACT_PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN ?? "";

const defaultPayload = {
  raw: "./artifacts/raw_preview.png",
  fft: "./artifacts/fft_mag.png",
  stats: "./artifacts/stats.csv",
  meta: "./artifacts/meta.json",
  summary: "./artifacts/summary.json",
};

export type CanvasRefreshResult =
  | { ok: true; spec: CanvasSpec; artifactNote: string }
  | { ok: false; artifactNote: string; error?: string };

async function sessionArtifactsReady(sessionDir: string): Promise<boolean> {
  try {
    await access(path.join(sessionDir, "artifacts", "stats.csv"));
    return true;
  } catch {
    return false;
  }
}

export type RefreshSessionCanvasOptions = {
  /** When true, run build_artifacts if stats.csv is missing (upload shortcut only). */
  buildIfMissing?: boolean;
};

/** Merge canvas when session artifacts exist (written by the agent, or via optional upload shortcut). */
export async function refreshSessionCanvas(
  session: Session,
  sessionId: string,
  options?: RefreshSessionCanvasOptions,
): Promise<CanvasRefreshResult> {
  const visibility = await readCanvasVisibility(session);

  if (!(await sessionArtifactsReady(session.dir))) {
    if (options?.buildIfMissing) {
      const built = await buildArtifacts(session.dir);
      if (!built.ok) {
        return {
          ok: false,
          artifactNote: `Artifact build failed: ${built.stderr}\n`,
        };
      }
    } else {
      return { ok: false, artifactNote: "" };
    }
  }

  try {
    let spec = await jsonRender(session.dir, sessionId, ARTIFACT_PUBLIC_ORIGIN, defaultPayload);
    spec = applyCanvasVisibility(spec, visibility);
    return { ok: true, spec, artifactNote: "Canvas updated from session artifacts.\n" };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return { ok: false, artifactNote: "Artifacts present but canvas merge failed.\n", error: m };
  }
}
