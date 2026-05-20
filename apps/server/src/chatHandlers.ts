import type { PathAttachment } from "@agent-plot/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import { assistantReply } from "./assistant.ts";
import { mergeCanvasVisibility, parseCanvasIntentDelta } from "./canvasIntent.ts";
import { refreshSessionCanvas } from "./canvasRefresh.ts";
import { buildAgentMessageText } from "./pathAttachments.ts";
import { SessionChat } from "./session/Services/SessionChat.ts";
import { SessionStore } from "./session/Services/SessionStore.ts";
import { WsHub } from "./wsHub.ts";

export const handleUserMessage = Effect.fn("chatHandlers.handleUserMessage")(function* (
  sessionId: string,
  text: string,
  pathAttachments?: PathAttachment[],
) {
  const wsHub = yield* WsHub;
  const sessionStore = yield* SessionStore;
  const sessionChat = yield* SessionChat;

  const session = yield* sessionStore.getSession(sessionId);
  if (Option.isNone(session)) {
    yield* wsHub.broadcast(sessionId, { type: "error", message: "unknown session" });
    return;
  }

  const agentText = buildAgentMessageText(text, pathAttachments);
  const visibility = mergeCanvasVisibility(
    yield* sessionStore.readCanvasVisibility(session.value),
    parseCanvasIntentDelta(`${text}\n${agentText}`),
  );
  yield* sessionStore.writeCanvasVisibility(session.value, visibility);

  let { history } = yield* sessionChat.broadcastUser(session.value, text, pathAttachments);

  const { activityId: analyzeId, history: afterAnalyzeStart } = yield* sessionChat.broadcastActivityStart(
    session.value,
    history,
    "Analyzing data",
  );
  history = afterAnalyzeStart;

  const { assistantId, history: afterAssistantStart } = yield* sessionChat.broadcastAssistantStart(
    session.value,
    history,
  );
  history = afterAssistantStart;

  const agentPersistence = {
    readAgentId: (s: typeof session.value) =>
      Effect.runPromise(
        sessionStore.readSessionAgentId(s).pipe(Effect.map(Option.getOrNull)),
      ).then((id) => id ?? undefined),
    writeAgentId: (s: typeof session.value, agentId: string) =>
      Effect.runPromise(sessionStore.writeSessionAgentId(s, agentId)),
  };

  let streamed = false;
  yield* Effect.promise(() =>
    assistantReply(session.value, session.value.dir, agentText, visibility, {
      onDelta: async (chunk) => {
        streamed = true;
        history = await Effect.runPromise(
          sessionChat.broadcastAssistantDelta(session.value, history, assistantId, chunk),
        );
      },
      agentPersistence,
    }),
  );

  if (!streamed) {
    history = yield* sessionChat.broadcastAssistantDelta(
      session.value,
      history,
      assistantId,
      "(no response)",
    );
  }

  history = yield* sessionChat.broadcastAssistantEnd(session.value, history, assistantId);
  history = yield* sessionChat.broadcastActivityEnd(session.value, history, analyzeId, {
    status: "done",
  });

  const { activityId: canvasId, history: afterCanvasStart } = yield* sessionChat.broadcastActivityStart(
    session.value,
    history,
    "Refreshing canvas",
  );
  history = afterCanvasStart;

  const refreshed = yield* refreshSessionCanvas(session.value, sessionId);
  if (refreshed.artifactNote) {
    history = yield* sessionChat.broadcastSystemNote(
      session.value,
      history,
      refreshed.artifactNote.trim(),
    );
  }
  if (refreshed.ok) {
    yield* wsHub.broadcast(sessionId, { type: "canvas.tree", spec: refreshed.spec });
    history = yield* sessionChat.broadcastActivityEnd(session.value, history, canvasId, {
      detail: "Canvas updated",
      status: "done",
    });
    yield* wsHub.broadcast(sessionId, { type: "tool.end", name: "json_render" });
  } else if (!refreshed.ok && "error" in refreshed && refreshed.error) {
    yield* wsHub.broadcast(sessionId, { type: "canvas.error", message: refreshed.error });
    history = yield* sessionChat.broadcastActivityEnd(session.value, history, canvasId, {
      ...(refreshed.error ? { detail: refreshed.error } : {}),
      status: "error",
    });
    history = yield* sessionChat.broadcastSystemNote(
      session.value,
      history,
      `Error: ${refreshed.error}`,
    );
  } else if (Object.keys(parseCanvasIntentDelta(text)).length > 0) {
    history = yield* sessionChat.broadcastActivityEnd(session.value, history, canvasId, {
      detail: "Preferences saved",
      status: "done",
    });
    history = yield* sessionChat.broadcastSystemNote(
      session.value,
      history,
      "Canvas preferences saved. Point the agent at your data path and ask it to build previews when you want the canvas filled in.",
    );
  } else {
    history = yield* sessionChat.broadcastActivityEnd(session.value, history, canvasId, {
      status: "done",
    });
  }
});
