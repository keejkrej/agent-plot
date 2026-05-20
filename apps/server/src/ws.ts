import type { PathAttachment } from "@agent-plot/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Scope from "effect/Scope";
import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/unstable/http";
import type * as Socket from "effect/unstable/socket/Socket";

import { handleUserMessage } from "./chatHandlers.ts";
import {
  broadcastActivityEnd,
  broadcastActivityStart,
} from "./chatBroadcast.ts";
import { readChatHistory } from "./chatHistory.ts";
import { browseFilesystem } from "./fsBrowse.ts";
import { refreshSessionCanvas } from "./canvasRefresh.ts";
import { getSession } from "./session.ts";
import { WsHub } from "./wsHub.ts";

function parsePathAttachments(raw: unknown): PathAttachment[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: PathAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const path = typeof record.path === "string" ? record.path.trim() : "";
    const kind = record.kind === "file" || record.kind === "folder" ? record.kind : null;
    if (!id || !path || !kind) continue;
    out.push({ id, path, kind });
  }
  return out.length > 0 ? out : undefined;
}

const handleSocketMessage = Effect.fn("ws.handleSocketMessage")(function* (
  sessionId: string,
  raw: string,
  send: (message: unknown) => Effect.Effect<void>,
) {
  let msg: {
    type?: string;
    text?: string;
    requestId?: string;
    partialPath?: string;
    pathAttachments?: unknown;
  };
  try {
    msg = JSON.parse(raw) as typeof msg;
  } catch {
    yield* send({ type: "error", message: "invalid json" });
    return;
  }

  if (msg.type === "fs.browse") {
    const requestId = typeof msg.requestId === "string" ? msg.requestId : "";
    const partialPath = typeof msg.partialPath === "string" ? msg.partialPath : "~";
    if (!requestId) {
      yield* send({ type: "error", message: "missing requestId" });
      return;
    }
    try {
      const result = yield* Effect.promise(() => browseFilesystem(partialPath));
      yield* send({
        type: "fs.browse.ok",
        requestId,
        parentPath: result.parentPath,
        entries: result.entries,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      yield* send({ type: "fs.browse.error", requestId, message });
    }
    return;
  }

  if (msg.type === "user.message") {
    const session = yield* Effect.promise(() => getSession(sessionId));
    if (!session) {
      yield* send({ type: "error", message: "unknown session" });
      return;
    }
    const text = typeof msg.text === "string" ? msg.text : "";
    const pathAttachments = parsePathAttachments(msg.pathAttachments);
    if (!text.trim() && !pathAttachments?.length) {
      yield* send({ type: "error", message: "empty message" });
      return;
    }
    yield* handleUserMessage(sessionId, text, pathAttachments);
    return;
  }

  if (msg.type === "json_render") {
    const wsHub = yield* WsHub;
    const session = yield* Effect.promise(() => getSession(sessionId));
    if (!session) {
      yield* send({ type: "error", message: "unknown session" });
      return;
    }
    let history = yield* Effect.promise(() => readChatHistory(session));
    const { activityId, history: afterStart } = yield* Effect.promise(() =>
      broadcastActivityStart(session, history, "Rendering canvas"),
    );
    history = afterStart;
    const refreshed = yield* Effect.promise(() => refreshSessionCanvas(session, sessionId));
    if (refreshed.ok) {
      yield* wsHub.broadcast(sessionId, { type: "canvas.tree", spec: refreshed.spec });
      yield* Effect.promise(() =>
        broadcastActivityEnd(session, history, activityId, {
          detail: "Canvas updated",
          status: "done",
        }),
      );
      yield* wsHub.broadcast(sessionId, { type: "tool.end", name: "json_render" });
    } else if (refreshed.error) {
      yield* wsHub.broadcast(sessionId, { type: "canvas.error", message: refreshed.error });
      yield* Effect.promise(() =>
        broadcastActivityEnd(session, history, activityId, {
          ...(refreshed.error ? { detail: refreshed.error } : {}),
          status: "error",
        }),
      );
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

  const send = (message: unknown) =>
    Effect.sync(() => {
      connection.send(JSON.stringify(message));
    });

  yield* socket.runString((message) =>
    handleSocketMessage(sessionId, message, send).pipe(Effect.orDie),
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
