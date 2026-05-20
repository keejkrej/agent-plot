import * as Effect from "effect/Effect";

import { applyCanvasVisibility } from "./canvasIntent.ts";
import { jsonRenderEffect, type CanvasSpec } from "./mergeCanvas.ts";
import { PythonRunner } from "./python/Services/PythonRunner.ts";
import { SessionStore, type Session } from "./session/Services/SessionStore.ts";

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

const formatMergeError = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

/** Merge canvas when session artifacts exist (written by the agent, or via optional upload shortcut). */
export const refreshSessionCanvas = Effect.fn("canvasRefresh.refreshSessionCanvas")(function* (
  session: Session,
  sessionId: string,
  options?: RefreshSessionCanvasOptions,
) {
  const store = yield* SessionStore;
  const visibility = yield* store.readCanvasVisibility(session);

  if (!(yield* store.sessionArtifactsReady(session))) {
    if (options?.buildIfMissing) {
      const pythonRunner = yield* PythonRunner;
      const built = yield* pythonRunner.buildArtifacts(session.dir);
      if (!built.ok) {
        return {
          ok: false as const,
          artifactNote: `Artifact build failed: ${built.stderr}\n`,
        };
      }
    } else {
      return { ok: false as const, artifactNote: "" };
    }
  }

  return yield* jsonRenderEffect(session, sessionId, ARTIFACT_PUBLIC_ORIGIN, defaultPayload).pipe(
    Effect.map((spec) => ({
      ok: true as const,
      spec: applyCanvasVisibility(spec, visibility),
      artifactNote: "Canvas updated from session artifacts.\n",
    })),
    Effect.catch((cause) =>
      Effect.succeed({
        ok: false as const,
        artifactNote: "Artifacts present but canvas merge failed.\n",
        error: formatMergeError(cause),
      }),
    ),
  );
});
