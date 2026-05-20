import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import type { WsInbound } from "@agent-plot/contracts";

import { WsHub } from "../../wsHub.ts";
import { SessionChat } from "../Services/SessionChat.ts";
import { SessionStore } from "../Services/SessionStore.ts";
import { layer as SessionChatLayer } from "./SessionChat.ts";
import { layerWithSessionsRoot } from "./SessionStore.ts";

class RecordedWsHubSent extends Context.Service<
  RecordedWsHubSent,
  Ref.Ref<Array<{ sessionId: string; message: WsInbound }>>
>()("test/RecordedWsHubSent") {}

const makeTestLayer = (sessionsRoot: string) =>
  Effect.gen(function* () {
    const sent = yield* Ref.make<Array<{ sessionId: string; message: WsInbound }>>([]);
    const hub = WsHub.of({
      register: () => Effect.void,
      unregister: () => Effect.void,
      broadcast: Effect.fn("test.wsHub.broadcast")(function* (sessionId: string, message: WsInbound) {
        yield* Ref.update(sent, (current) => [...current, { sessionId, message }]);
      }),
    });
    return SessionChatLayer.pipe(
      Layer.provideMerge(layerWithSessionsRoot(sessionsRoot)),
      Layer.provideMerge(
        Layer.mergeAll(Layer.succeed(WsHub, hub), Layer.succeed(RecordedWsHubSent, sent)),
      ),
      Layer.provideMerge(NodeServices.layer),
    );
  });

describe("SessionChat", () => {
  it.effect("broadcastUser persists history and sends ws event", () =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const sessionsRoot = yield* fileSystem.makeTempDirectory({ prefix: "agent-plot-session-chat-" });
      const testLayer = yield* makeTestLayer(sessionsRoot);

      return yield* Effect.gen(function* () {
        const sessionChat = yield* SessionChat;
        const sessionStore = yield* SessionStore;
        const sent = yield* RecordedWsHubSent;

        const session = yield* sessionStore.createSession;
        const { history } = yield* sessionChat.broadcastUser(session, "hi there");

        expect(history.messages).toHaveLength(1);
        const recorded = yield* Ref.get(sent);
        expect(recorded).toHaveLength(1);
        expect(recorded[0]?.sessionId).toBe(session.id);
        expect(recorded[0]?.message.type).toBe("chat.user");

        const onDisk = yield* sessionStore.readChatHistory(session);
        expect(onDisk.messages).toHaveLength(1);

        yield* fileSystem.remove(sessionsRoot, { recursive: true });
      }).pipe(Effect.provide(testLayer));
    }).pipe(Effect.provide(NodeServices.layer)),
  );
});
