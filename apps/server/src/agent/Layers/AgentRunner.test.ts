import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import type { WsInbound } from "@agent-plot/contracts";

import { defaultCanvasVisibility } from "../../canvasIntent.ts";
import { WsHub } from "../../wsHub.ts";
import { SessionChat } from "../../session/Services/SessionChat.ts";
import { SessionStore } from "../../session/Services/SessionStore.ts";
import { layer as SessionChatLayer } from "../../session/Layers/SessionChat.ts";
import { layerWithSessionsRoot } from "../../session/Layers/SessionStore.ts";
import { AgentRunner } from "../Services/AgentRunner.ts";
import { layer as AgentRunnerLayer } from "./AgentRunner.ts";

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
    const wsLayer = Layer.mergeAll(
      Layer.succeed(WsHub, hub),
      Layer.succeed(RecordedWsHubSent, sent),
    );
    return AgentRunnerLayer.pipe(
      Layer.provideMerge(SessionChatLayer),
      Layer.provideMerge(layerWithSessionsRoot(sessionsRoot)),
      Layer.provideMerge(wsLayer),
      Layer.provideMerge(NodeServices.layer),
    );
  });

describe("AgentRunner", () => {
  it.effect("stub backend streams assistant deltas without CURSOR_API_KEY", () =>
    Effect.gen(function* () {
      const prevKey = process.env.CURSOR_API_KEY;
      const prevUrl = process.env.AGENT_PLOT_AGENT_URL;
      delete process.env.CURSOR_API_KEY;
      delete process.env.AGENT_PLOT_AGENT_URL;

      try {
        const fileSystem = yield* FileSystem.FileSystem;
        const sessionsRoot = yield* fileSystem.makeTempDirectory({ prefix: "agent-plot-agent-runner-" });
        const testLayer = yield* makeTestLayer(sessionsRoot);

        return yield* Effect.gen(function* () {
          const sessionStore = yield* SessionStore;
          const sessionChat = yield* SessionChat;
          const agentRunner = yield* AgentRunner;
          const sent = yield* RecordedWsHubSent;

          const session = yield* sessionStore.createSession;
          const { assistantId, history: afterStart } = yield* sessionChat.broadcastAssistantStart(
            session,
            { messages: [], activities: [] },
          );

          const { streamed, history } = yield* agentRunner.runAssistantTurn({
            session,
            history: afterStart,
            assistantId,
            agentText: "hello agent",
            visibility: defaultCanvasVisibility(),
          });

          expect(streamed).toBe(true);
          expect(history.messages.find((m) => m.id === assistantId)?.text.length).toBeGreaterThan(0);

          const recorded = yield* Ref.get(sent);
          expect(recorded.some((e) => e.message.type === "chat.assistant.delta")).toBe(true);

          yield* fileSystem.remove(sessionsRoot, { recursive: true });
        }).pipe(Effect.provide(testLayer));
      } finally {
        if (prevKey !== undefined) process.env.CURSOR_API_KEY = prevKey;
        else delete process.env.CURSOR_API_KEY;
        if (prevUrl !== undefined) process.env.AGENT_PLOT_AGENT_URL = prevUrl;
        else delete process.env.AGENT_PLOT_AGENT_URL;
      }
    }).pipe(Effect.provide(NodeServices.layer)),
  );
});
