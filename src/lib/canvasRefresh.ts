import type { CanvasSpec } from "#lib/contracts";
import { applyCanvasVisibility, type CanvasVisibility } from "#lib/canvasIntent";
import { jsonRender } from "#lib/mergeCanvas";
import { buildArtifacts, type PythonResult } from "#lib/python";
import type { SessionStore } from "#lib/store";

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

export type RefreshSessionCanvasOptions = {
  /** When true, run build_artifacts if stats.csv is missing (upload shortcut only). */
  readonly buildIfMissing?: boolean;
};

function formatMergeError(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

export async function refreshSessionCanvas(
  store: SessionStore,
  sessionId: string,
  options?: RefreshSessionCanvasOptions,
): Promise<CanvasRefreshResult> {
  const session = await store.getSession(sessionId);
  if (!session) {
    return { ok: false, artifactNote: "", error: "session not found" };
  }

  const visibility = store.readCanvasVisibility(sessionId);

  if (!store.sessionArtifactsReady(sessionId)) {
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
    const templateRaw = store.readCanvasTemplate(sessionId);
    const spec = jsonRender(
      session.dir,
      sessionId,
      ARTIFACT_PUBLIC_ORIGIN,
      defaultPayload,
      templateRaw,
    );
    return {
      ok: true,
      spec: applyCanvasVisibility(spec, visibility),
      artifactNote: "Canvas updated from session artifacts.\n",
    };
  } catch (cause) {
    return {
      ok: false,
      artifactNote: "Artifacts present but canvas merge failed.\n",
      error: formatMergeError(cause),
    };
  }
}

export type { CanvasVisibility };
