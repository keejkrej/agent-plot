import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";

import { jsonRenderEffect } from "./mergeCanvas.ts";
import { SessionStore } from "./session/Services/SessionStore.ts";
import { layerWithSessionsRoot } from "./session/Layers/SessionStore.ts";

const minimalCanvasTemplate = {
  root: "main",
  elements: {
    main: {
      type: "Stack",
      props: { direction: "column" },
      children: ["line"],
    },
    line: {
      type: "LinePlot",
      props: {
        title: "Profile",
        x: { $payload: "lineX" },
        y: { $payload: "lineY" },
      },
      children: [],
    },
  },
};

const defaultPayload = {
  raw: "./artifacts/raw_preview.png",
  fft: "./artifacts/fft_mag.png",
  stats: "./artifacts/stats.csv",
  meta: "./artifacts/meta.json",
  summary: "./artifacts/summary.json",
};

const statsCsv = `kind,x,y
profile,0,1
profile,1,2
hist,0,3
row_mean,0,4
`;

const makeTestLayer = (sessionsRoot: string) =>
  layerWithSessionsRoot(sessionsRoot).pipe(Layer.provideMerge(NodeServices.layer));

describe("mergeCanvas", () => {
  it.effect("jsonRenderEffect merges stats.csv into canvas template without meta.json", () =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const sessionsRoot = yield* fileSystem.makeTempDirectory({ prefix: "agent-plot-merge-canvas-" });

      return yield* Effect.gen(function* () {
        const store = yield* SessionStore;
        const session = yield* store.createSession;

        yield* store.writeCanvasTemplate(
          session,
          JSON.stringify(minimalCanvasTemplate, null, 2),
        );

        const artifactsDir = path.join(session.dir, "artifacts");
        yield* fileSystem.makeDirectory(artifactsDir, { recursive: true });
        yield* fileSystem.writeFileString(path.join(artifactsDir, "stats.csv"), statsCsv);

        const spec = yield* jsonRenderEffect(session, session.id, "", defaultPayload);
        expect(spec.root).toBe("main");
        expect(spec.elements.line).toBeDefined();

        yield* fileSystem.remove(sessionsRoot, { recursive: true });
      }).pipe(Effect.provide(makeTestLayer(sessionsRoot)));
    }).pipe(Effect.provide(NodeServices.layer)),
  );
});
