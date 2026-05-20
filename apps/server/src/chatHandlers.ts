import type { PathAttachment } from "@agent-plot/contracts";
import * as Effect from "effect/Effect";

import { assistantReply } from "./assistant.ts";
import {
  broadcastActivityEnd,
  broadcastActivityStart,
  broadcastAssistantDelta,
  broadcastAssistantEnd,
  broadcastAssistantStart,
  broadcastChatUser,
  broadcastSystemNote,
} from "./chatBroadcast.ts";
import { mergeCanvasVisibility, parseCanvasIntentDelta } from "./canvasIntent.ts";
import { refreshSessionCanvas } from "./canvasRefresh.ts";
import { buildAgentMessageText } from "./pathAttachments.ts";
import {
  getSession,
  readCanvasVisibility,
  writeCanvasVisibility,
} from "./session.ts";
import { WsHub } from "./wsHub.ts";

export const handleUserMessage = Effect.fn("chatHandlers.handleUserMessage")(function* (
  sessionId: string,
  text: string,
  pathAttachments?: PathAttachment[],
) {
  const wsHub = yield* WsHub;
  const session = yield* Effect.promise(() => getSession(sessionId));
  if (!session) {
    yield* wsHub.broadcast(sessionId, { type: "error", message: "unknown session" });
    return;
  }

  const agentText = buildAgentMessageText(text, pathAttachments);
  const visibility = mergeCanvasVisibility(
    yield* Effect.promise(() => readCanvasVisibility(session)),
    parseCanvasIntentDelta(`${text}\n${agentText}`),
  );
  yield* Effect.promise(() => writeCanvasVisibility(session, visibility));

  let { history } = yield* Effect.promise(() => broadcastChatUser(session, text, pathAttachments));

  const { activityId: analyzeId, history: afterAnalyzeStart } = yield* Effect.promise(() =>
    broadcastActivityStart(session, history, "Analyzing data"),
  );
  history = afterAnalyzeStart;

  const { assistantId, history: afterAssistantStart } = yield* Effect.promise(() =>
    broadcastAssistantStart(session, history),
  );
  history = afterAssistantStart;

  let streamed = false;
  yield* Effect.promise(() =>
    assistantReply(session, session.dir, agentText, visibility, {
      onDelta: async (chunk) => {
        streamed = true;
        history = await broadcastAssistantDelta(session, history, assistantId, chunk);
      },
    }),
  );

  if (!streamed) {
    history = yield* Effect.promise(() =>
      broadcastAssistantDelta(session, history, assistantId, "(no response)"),
    );
  }

  history = yield* Effect.promise(() => broadcastAssistantEnd(session, history, assistantId));
  history = yield* Effect.promise(() =>
    broadcastActivityEnd(session, history, analyzeId, { status: "done" }),
  );

  const { activityId: canvasId, history: afterCanvasStart } = yield* Effect.promise(() =>
    broadcastActivityStart(session, history, "Refreshing canvas"),
  );
  history = afterCanvasStart;

  const refreshed = yield* Effect.promise(() => refreshSessionCanvas(session, sessionId));
  if (refreshed.artifactNote) {
    history = yield* Effect.promise(() =>
      broadcastSystemNote(session, history, refreshed.artifactNote!.trim()),
    );
  }
  if (refreshed.ok) {
    yield* wsHub.broadcast(sessionId, { type: "canvas.tree", spec: refreshed.spec });
    history = yield* Effect.promise(() =>
      broadcastActivityEnd(session, history, canvasId, {
        detail: "Canvas updated",
        status: "done",
      }),
    );
    yield* wsHub.broadcast(sessionId, { type: "tool.end", name: "json_render" });
  } else if (refreshed.error) {
    yield* wsHub.broadcast(sessionId, { type: "canvas.error", message: refreshed.error });
    history = yield* Effect.promise(() =>
      broadcastActivityEnd(session, history, canvasId, {
        ...(refreshed.error ? { detail: refreshed.error } : {}),
        status: "error",
      }),
    );
    history = yield* Effect.promise(() =>
      broadcastSystemNote(session, history, `Error: ${refreshed.error}`),
    );
  } else if (Object.keys(parseCanvasIntentDelta(text)).length > 0) {
    history = yield* Effect.promise(() =>
      broadcastActivityEnd(session, history, canvasId, {
        detail: "Preferences saved",
        status: "done",
      }),
    );
    history = yield* Effect.promise(() =>
      broadcastSystemNote(
        session,
        history,
        "Canvas preferences saved. Point the agent at your data path and ask it to build previews when you want the canvas filled in.",
      ),
    );
  } else {
    history = yield* Effect.promise(() =>
      broadcastActivityEnd(session, history, canvasId, { status: "done" }),
    );
  }
});
