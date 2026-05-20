import * as Context from "effect/Context";
import * as Data from "effect/Data";
import type * as Effect from "effect/Effect";

export type PythonResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly stderr: string; readonly code: number | null };

export class PythonRunError extends Data.TaggedError("PythonRunError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export interface PythonRunnerShape {
  readonly describeTiff: (
    sessionDir: string,
    tiffPath?: string,
  ) => Effect.Effect<PythonResult<unknown>, never>;
  readonly buildArtifacts: (
    sessionDir: string,
    tiffPath?: string,
  ) => Effect.Effect<PythonResult<unknown>, never>;
}

export class PythonRunner extends Context.Service<PythonRunner, PythonRunnerShape>()(
  "agent-plot/server/PythonRunner",
) {}
