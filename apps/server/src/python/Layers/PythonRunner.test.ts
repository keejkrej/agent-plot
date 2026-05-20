import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";

import { PythonRunner } from "../Services/PythonRunner.ts";
import { layer as PythonRunnerLayer } from "./PythonRunner.ts";

const testLayer = PythonRunnerLayer.pipe(Layer.provideMerge(NodeServices.layer));

describe("PythonRunner", () => {
  it.effect("describeTiff returns ok:false when the session dir has no TIFF", () =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const sessionDir = yield* fileSystem.makeTempDirectory({ prefix: "agent-plot-python-runner-" });

      return yield* Effect.gen(function* () {
        const python = yield* PythonRunner;
        const result = yield* python.describeTiff(sessionDir);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.stderr.length).toBeGreaterThan(0);
        }
        yield* fileSystem.remove(sessionDir, { recursive: true });
      }).pipe(Effect.provide(testLayer));
    }).pipe(Effect.provide(NodeServices.layer)),
  );
});
