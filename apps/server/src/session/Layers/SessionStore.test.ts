import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";

import { SessionStore } from "../Services/SessionStore.ts";
import { layerWithSessionsRoot } from "./SessionStore.ts";

const makeTestLayer = (sessionsRoot: string) =>
  layerWithSessionsRoot(sessionsRoot).pipe(Layer.provideMerge(NodeServices.layer));

describe("SessionStore", () => {
  it.effect("creates a session and round-trips chat history", () =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const sessionsRoot = yield* fileSystem.makeTempDirectory({ prefix: "agent-plot-session-store-" });

      return yield* Effect.gen(function* () {
        const store = yield* SessionStore;

        const session = yield* store.createSession;
        const loaded = yield* store.getSession(session.id);
        expect(Option.isSome(loaded)).toBe(true);

        const empty = yield* store.readChatHistory(session);
        expect(empty.messages).toEqual([]);
        expect(empty.activities).toEqual([]);

        const history = {
          messages: [
            {
              id: "m1",
              role: "user" as const,
              text: "hello",
              createdAt: new Date().toISOString(),
            },
          ],
          activities: [],
        };
        yield* store.writeChatHistory(session, history);
        const readBack = yield* store.readChatHistory(session);
        expect(readBack.messages).toHaveLength(1);
        expect(readBack.messages[0]?.text).toBe("hello");

        const canvasPath = path.join(session.dir, "canvas.json");
        const canvasExists = yield* fileSystem.exists(canvasPath);
        expect(canvasExists).toBe(true);

        yield* fileSystem.remove(sessionsRoot, { recursive: true });
      }).pipe(Effect.provide(makeTestLayer(sessionsRoot)));
    }).pipe(Effect.provide(NodeServices.layer)),
  );
});
