import * as FileSystem from "effect/FileSystem";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/unstable/http";
import type * as Multipart from "effect/unstable/http/Multipart";

import { handleUserMessage } from "./chatHandlers.ts";
import { refreshSessionCanvas } from "./canvasRefresh.ts";
import { PythonRunner } from "./python/Services/PythonRunner.ts";
import { browserApiCorsHeaders } from "./httpCors.ts";
import { ServerEnvironment } from "./environment/ServerEnvironment.ts";
import { SessionChat } from "./session/Services/SessionChat.ts";
import { SessionStore } from "./session/Services/SessionStore.ts";
import { requirePathParam, respondMissingRouteParam } from "./routeParams.ts";
import { WsHub } from "./wsHub.ts";

const json = <A>(body: A, status = 200) =>
  HttpServerResponse.jsonUnsafe(body, { status, headers: browserApiCorsHeaders });

const jsonError = (message: string, status: number) => json({ error: message }, status);

export const healthRouteLayer = HttpRouter.add("GET", "/health", json({ ok: true }));

export const environmentRouteLayer = HttpRouter.add(
  "GET",
  "/.well-known/agent-plot/environment",
  Effect.gen(function* () {
    const environment = yield* ServerEnvironment;
    const descriptor = yield* environment.getDescriptor;
    return json(descriptor);
  }),
);

export const sessionsRoutesLayer = Layer.mergeAll(
  HttpRouter.add("GET", "/api/sessions", (request) =>
    Effect.gen(function* () {
      const url = HttpServerRequest.toURL(request);
      const archived =
        Option.isSome(url) && url.value.searchParams.get("archived") === "true";
      const sessionStore = yield* SessionStore;
      const sessions = yield* sessionStore.listSessions({ archived });
      return json({ sessions });
    }),
  ),
  HttpRouter.add("POST", "/api/sessions", () =>
    Effect.gen(function* () {
      const sessionStore = yield* SessionStore;
      const session = yield* sessionStore.createSession;
      return json({ id: session.id });
    }),
  ),
  HttpRouter.add("POST", "/api/sessions/:id/archive", () =>
    Effect.gen(function* () {
      const id = yield* requirePathParam("id");
      const sessionStore = yield* SessionStore;
      const session = yield* sessionStore.archiveSession(id);
      if (Option.isNone(session)) {
        return jsonError("session not found", 404);
      }
      return json({ ok: true });
    }),
  ),
  HttpRouter.add("POST", "/api/sessions/:id/unarchive", () =>
    Effect.gen(function* () {
      const id = yield* requirePathParam("id");
      const sessionStore = yield* SessionStore;
      const session = yield* sessionStore.unarchiveSession(id);
      if (Option.isNone(session)) {
        return jsonError("session not found", 404);
      }
      return json({ ok: true });
    }),
  ),
  HttpRouter.add("GET", "/api/sessions/:id/chat", () =>
    Effect.gen(function* () {
      const id = yield* requirePathParam("id");
      const sessionStore = yield* SessionStore;
      const session = yield* sessionStore.getSession(id);
      if (Option.isNone(session)) {
        return jsonError("session not found", 404);
      }
      const history = yield* sessionStore.readChatHistory(session.value);
      return json(history);
    }),
  ),
  HttpRouter.add("POST", "/api/sessions/:id/upload", () =>
    Effect.gen(function* () {
      const id = yield* requirePathParam("id");
      const wsHub = yield* WsHub;
      const sessionStore = yield* SessionStore;
      const sessionChat = yield* SessionChat;
      const fileSystem = yield* FileSystem.FileSystem;
      const request = yield* HttpServerRequest.HttpServerRequest;
      const session = yield* sessionStore.getSession(id);
      if (Option.isNone(session)) {
        return jsonError("session not found", 404);
      }

      const multipart = yield* request.multipart;
      const fileEntry = multipart.file;
      const filePart = Array.isArray(fileEntry)
        ? (fileEntry.find(
            (part): part is Multipart.PersistedFile =>
              typeof part === "object" && part !== null && "_tag" in part && part._tag === "PersistedFile",
          ) ?? null)
        : null;
      if (!filePart) {
        return jsonError("expected file field (binary)", 400);
      }

      const buf = yield* fileSystem.readFile(filePart.path);
      const fileName = filePart.name || "input.tif";
      yield* sessionStore.saveUpload(session.value, buf, fileName);

      let history = yield* sessionStore.readChatHistory(session.value);
      const { history: afterUser } = yield* sessionChat.broadcastUser(
        session.value,
        `[upload] ${fileName}`,
      );
      history = afterUser;

      const { activityId, history: afterActStart } = yield* sessionChat.broadcastActivityStart(
        session.value,
        history,
        "Building artifacts",
      );
      history = afterActStart;

      const refreshed = yield* refreshSessionCanvas(session.value, id, { buildIfMissing: true });

      if (refreshed.artifactNote) {
        history = yield* sessionChat.broadcastSystemNote(
          session.value,
          history,
          refreshed.artifactNote.trim(),
        );
      }

      if (refreshed.ok) {
        yield* wsHub.broadcast(id, { type: "canvas.tree", spec: refreshed.spec });
        history = yield* sessionChat.broadcastActivityEnd(session.value, history, activityId, {
          detail: "Canvas updated",
          status: "done",
        });
        yield* wsHub.broadcast(id, { type: "tool.end", name: "json_render" });
      } else if (!refreshed.ok && "error" in refreshed && refreshed.error) {
        yield* wsHub.broadcast(id, { type: "canvas.error", message: refreshed.error });
        history = yield* sessionChat.broadcastActivityEnd(session.value, history, activityId, {
          detail: refreshed.error,
          status: "error",
        });
        history = yield* sessionChat.broadcastSystemNote(
          session.value,
          history,
          `Error: ${refreshed.error}`,
        );
      } else {
        history = yield* sessionChat.broadcastActivityEnd(session.value, history, activityId, {
          status: "done",
        });
      }

      return json({ ok: true, name: fileName });
    }),
  ),
  HttpRouter.add("GET", "/api/sessions/:id/describe", () =>
    Effect.gen(function* () {
      const id = yield* requirePathParam("id");
      const sessionStore = yield* SessionStore;
      const session = yield* sessionStore.getSession(id);
      if (Option.isNone(session)) {
        return jsonError("not found", 404);
      }
      const pythonRunner = yield* PythonRunner;
      const result = yield* pythonRunner.describeTiff(session.value.dir);
      if (!result.ok) {
        return jsonError(result.stderr, 500);
      }
      return json(result.data);
    }),
  ),
);

export const artifactsRouteLayer = HttpRouter.add(
  "GET",
  "/api/sessions/:id/artifacts/*",
  Effect.gen(function* () {
    const id = yield* requirePathParam("id");
    const request = yield* HttpServerRequest.HttpServerRequest;
    const fileSystem = yield* FileSystem.FileSystem;
    const sessionStore = yield* SessionStore;
    const session = yield* sessionStore.getSession(id);
    if (Option.isNone(session)) {
      return jsonError("not found", 404);
    }

    const url = HttpServerRequest.toURL(request);
    if (Option.isNone(url)) {
      return HttpServerResponse.text("Bad Request", { status: 400 });
    }

    const prefix = `/api/sessions/${id}/artifacts/`;
    const rel = url.value.pathname.slice(prefix.length);
    if (!rel || rel.includes("..")) {
      return jsonError("bad path", 400);
    }

    const path = yield* Path.Path;
    const artifactsRoot = path.join(session.value.dir, "artifacts");
    const abs = path.join(artifactsRoot, rel);
    if (!abs.startsWith(artifactsRoot)) {
      return jsonError("bad path", 400);
    }

    const exists = yield* fileSystem.exists(abs).pipe(Effect.orElseSucceed(() => false));
    if (!exists) {
      return jsonError("not found", 404);
    }

    const ext = rel.toLowerCase().endsWith(".png")
      ? "image/png"
      : rel.toLowerCase().endsWith(".csv")
        ? "text/csv"
        : "application/octet-stream";

    return yield* HttpServerResponse.file(abs, {
      status: 200,
      headers: {
        "Content-Type": ext,
        ...browserApiCorsHeaders,
      },
    }).pipe(
      Effect.catch(() =>
        Effect.succeed(HttpServerResponse.text("Internal Server Error", { status: 500 })),
      ),
    );
  }).pipe(Effect.catchTag("MissingRouteParamError", respondMissingRouteParam)) as Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    never,
    | FileSystem.FileSystem
    | Path.Path
    | HttpServerRequest.HttpServerRequest
    | HttpRouter.RouteContext
    | SessionStore
  >,
);

export const browserApiCorsLayer = HttpRouter.cors({
  allowedMethods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["authorization", "content-type"],
  maxAge: 600,
});

export const makeHttpRoutesLayer = Layer.mergeAll(
  healthRouteLayer,
  environmentRouteLayer,
  sessionsRoutesLayer,
  artifactsRouteLayer,
);
