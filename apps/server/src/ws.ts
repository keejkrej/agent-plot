import { decodeWsClientMessage } from "@agent-plot/contracts";
import type { WsInbound } from "@agent-plot/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Scope from "effect/Scope";
import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/unstable/http";
import type * as Socket from "effect/unstable/socket/Socket";

import { handleUserMessage } from "./chatHandlers.ts";
import { refreshSessionCanvas } from "./canvasRefresh.ts";
import { browseFilesystem } from "./fsBrowse.ts";
import { SessionChat } from "./session/Services/SessionChat.ts";
import { SessionStore } from "./session/Services/SessionStore.ts";
import { WsHub } from "./wsHub.ts";

const handleSocketMessage = Effect.fn("ws.handleSocketMessage")(function* (
  sessionId: string,
  raw: string,
  send: (message: WsInbound) => Effect.Effect<void>,
) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    yield* send({ type: "error", message: "invalid json" });
    return;
  }

  const decodedOpt = yield* decodeWsClientMessage(parsed).pipe(Effect.option);
  if (Option.isNone(decodedOpt)) {
    yield* send({ type: "error", message: "invalid message" });
    return;
  }
  const decoded = decodedOpt.value;

  if (decoded.type === "fs.browse") {
    const requestId = decoded.requestId.trim();
    const partialPath = decoded.partialPath.trim() || "~";
    if (!requestId) {
      yield* send({ type: "error", message: "missing requestId" });
      return;
    }
    const result = yield* Effect.tryPromise({
      try: () => browseFilesystem(partialPath),
      catch: (error) => (error instanceof Error ? error.message : String(error)),
    }).pipe(
      Effect.match({
        onFailure: (message) =>
          Effect.gen(function* () {
            yield* send({ type: "fs.browse.error", requestId, message });
          }),
        onSuccess: (browse) =>
          Effect.gen(function* () {
            yield* send({
              type: "fs.browse.ok",
              requestId,
              parentPath: browse.parentPath,
              entries: browse.entries,
            });
          }),
      }),
    );
    return result;
  }

  if (decoded.type === "user.message") {
    const text = decoded.text;
    const pathAttachments = decoded.pathAttachments;
    if (!text.trim() && !(pathAttachments && pathAttachments.length > 0)) {
      yield* send({ type: "error", message: "empty message" });
      return;
    }
    yield* handleUserMessage(
      sessionId,
      text,
      pathAttachments ? [...pathAttachments] : undefined,
    );
    return;
  }

  if (decoded.type === "json_render") {
    const wsHub = yield* WsHub;
    const sessionStore = yield* SessionStore;
    const sessionChat = yield* SessionChat;
    const session = yield* sessionStore.getSession(sessionId);
    if (Option.isNone(session)) {
      yield* send({ type: "error", message: "unknown session" });
      return;
    }

    let history = yield* sessionStore.readChatHistory(session.value);
    const { activityId, history: afterStart } = yield* sessionChat.broadcastActivityStart(
      session.value,
      history,
      "Rendering canvas",
    );
    history = afterStart;

    const refreshed = yield* refreshSessionCanvas(session.value, sessionId);
    if (refreshed.ok) {
      yield* wsHub.broadcast(sessionId, { type: "canvas.tree", spec: refreshed.spec });
      yield* sessionChat.broadcastActivityEnd(session.value, history, activityId, {
        detail: "Canvas updated",
        status: "done",
      });
      yield* wsHub.broadcast(sessionId, { type: "tool.end", name: "json_render" });
    } else if ("error" in refreshed && refreshed.error) {
      yield* wsHub.broadcast(sessionId, { type: "canvas.error", message: refreshed.error });
      yield* sessionChat.broadcastActivityEnd(session.value, history, activityId, {
        detail: refreshed.error,
        status: "error",
      });
    }
  }
});

const runSocket = Effect.fn("ws.runSocket")(function* (
  sessionId: string,
  socket: Socket.Socket,
) {
  const wsHub = yield* WsHub;
  const writer = yield* socket.writer;
  const connection = {
    send: (data: string) => {
      Effect.runSync(writer(data));
    },
  };

  yield* wsHub.register(sessionId, connection);
  yield* Effect.addFinalizer(() => wsHub.unregister(sessionId, connection));

  const send = (message: WsInbound) =>
    Effect.sync(() => {
      connection.send(JSON.stringify(message));
    });

  yield* socket.runString((message) =>
    handleSocketMessage(sessionId, message, send).pipe(
      Effect.catch((error) =>
        Effect.gen(function* () {
          const messageText =
            error instanceof Error ? error.message : "internal server error";
          yield* Effect.logError("ws.handleSocketMessage failed", error);
          yield* send({ type: "error", message: messageText });
        }),
      ),
    ),
  );
});

export const websocketRouteLayer = HttpRouter.add(
  "GET",
  "/ws",
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const url = HttpServerRequest.toURL(request);
    const sessionId = Option.isSome(url)
      ? (url.value.searchParams.get("sessionId") ?? "")
      : "";
    if (sessionId.length === 0) {
      return HttpServerResponse.text("missing sessionId", { status: 400 });
    }

    const socket = yield* Effect.orDie(request.upgrade);
    yield* Effect.forkScoped(runSocket(sessionId, socket));
    return HttpServerResponse.empty();
  }),
);
