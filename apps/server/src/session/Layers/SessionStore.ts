import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SessionChatHistory } from "@agent-plot/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";

import {
  defaultCanvasVisibility,
  type CanvasVisibility,
} from "../../canvasIntent.ts";
import {
  SessionStore,
  type Session,
  type SessionListEntry,
  type SessionMeta,
} from "../Services/SessionStore.ts";

const SERVER_SRC_DIR = fileURLToPath(new URL("../..", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../../../../..", import.meta.url));

/** Resolved sessions data directory (for startup logging). */
export const SESSIONS_ROOT_PATH = path.join(REPO_ROOT, "data", "sessions");

const META_FILE = "session-meta.json";
const CHAT_FILE = "chat-history.json";
const PREFS_FILE = "canvas-prefs.json";
const CURSOR_AGENT_FILE = "cursor-agent.json";

const emptyChatHistory = (): SessionChatHistory => ({ messages: [], activities: [] });

const sessionTitle = (id: string, meta: SessionMeta): string =>
  meta.title?.trim() || `Session ${id.slice(0, 8)}`;

const parseSessionMeta = (raw: string): SessionMeta => {
  try {
    const parsed = JSON.parse(raw) as Partial<SessionMeta>;
    return {
      archivedAt: typeof parsed.archivedAt === "string" ? parsed.archivedAt : null,
      ...(typeof parsed.title === "string" ? { title: parsed.title } : {}),
    };
  } catch {
    return { archivedAt: null };
  }
};

const makeSessionStore = (root: string) =>
  Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const starterCanvasPath = path.join(SERVER_SRC_DIR, "starter-canvas.json");

  const readSessionMeta = (session: Session) =>
    fileSystem.readFileString(path.join(session.dir, META_FILE)).pipe(
      Effect.map(parseSessionMeta),
      Effect.catch(() => Effect.succeed({ archivedAt: null } satisfies SessionMeta)),
    );

  const writeSessionMeta = (session: Session, meta: SessionMeta) =>
    fileSystem.writeFileString(path.join(session.dir, META_FILE), JSON.stringify(meta, null, 2));

  const createSession = Effect.gen(function* () {
    const id = randomUUID();
    const dir = path.join(root, id);
    yield* fileSystem.makeDirectory(path.join(dir, "artifacts"), { recursive: true });
    yield* fileSystem.copy(starterCanvasPath, path.join(dir, "canvas.json"));
    return { id, dir } satisfies Session;
  });

  const getSession = Effect.fn("sessionStore.getSession")(function* (id: string) {
    const dir = path.join(root, id);
    const exists = yield* fileSystem.exists(dir).pipe(Effect.orElseSucceed(() => false));
    if (!exists) {
      return Option.none<Session>();
    }
    const entries = yield* fileSystem.readDirectory(dir).pipe(
      Effect.catch(() => Effect.succeed([] as readonly string[])),
    );
    if (entries.length === 0) {
      return Option.none<Session>();
    }
    return Option.some({ id, dir } satisfies Session);
  });

  const listSessions = Effect.fn("sessionStore.listSessions")(function* (options?: {
    readonly archived?: boolean;
  }) {
    const wantArchived = options?.archived === true;
    const names = yield* fileSystem.readDirectory(root).pipe(
      Effect.catch(() => Effect.succeed([] as readonly string[])),
    );
    const entries: SessionListEntry[] = [];
    for (const id of names) {
      const session = yield* getSession(id);
      if (Option.isNone(session)) continue;
      const meta = yield* readSessionMeta(session.value);
      const isArchived = meta.archivedAt !== null;
      if (isArchived !== wantArchived) continue;

      let updatedAt = meta.archivedAt ?? new Date(0).toISOString();
      const stat = yield* fileSystem.stat(session.value.dir).pipe(Effect.option);
      if (Option.isSome(stat) && Option.isSome(stat.value.mtime)) {
        const mtime = stat.value.mtime.value.toISOString();
        updatedAt = isArchived ? (meta.archivedAt ?? mtime) : mtime;
      }
      entries.push({
        id,
        title: sessionTitle(id, meta),
        updatedAt,
        archivedAt: meta.archivedAt,
      });
    }
    entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return entries;
  });

  const archiveSession = Effect.fn("sessionStore.archiveSession")(function* (id: string) {
    const session = yield* getSession(id);
    if (Option.isNone(session)) return Option.none<Session>();
    const meta = yield* readSessionMeta(session.value);
    if (meta.archivedAt) return session;
    yield* writeSessionMeta(session.value, {
      ...meta,
      archivedAt: new Date().toISOString(),
    });
    return session;
  });

  const unarchiveSession = Effect.fn("sessionStore.unarchiveSession")(function* (id: string) {
    const session = yield* getSession(id);
    if (Option.isNone(session)) return Option.none<Session>();
    const meta = yield* readSessionMeta(session.value);
    if (!meta.archivedAt) return session;
    yield* writeSessionMeta(session.value, { ...meta, archivedAt: null });
    return session;
  });

  const saveUpload = Effect.fn("sessionStore.saveUpload")(function* (
    session: Session,
    buffer: Uint8Array,
    originalName: string,
  ) {
    const ext = path.extname(originalName).toLowerCase();
    const safe = ext === ".tif" || ext === ".tiff" ? ext : ".tif";
    yield* fileSystem.writeFile(path.join(session.dir, `input${safe}`), buffer);
  });

  const readCanvasTemplate = (session: Session) =>
    fileSystem.readFileString(path.join(session.dir, "canvas.json"));

  const writeCanvasTemplate = (session: Session, json: string) =>
    fileSystem.writeFileString(path.join(session.dir, "canvas.json"), json);

  const readCanvasVisibility = Effect.fn("sessionStore.readCanvasVisibility")(function* (
    session: Session,
  ) {
    return yield* fileSystem.readFileString(path.join(session.dir, PREFS_FILE)).pipe(
      Effect.map((raw) => ({
        ...defaultCanvasVisibility(),
        ...(JSON.parse(raw) as CanvasVisibility),
      })),
      Effect.catch(() => Effect.succeed(defaultCanvasVisibility())),
    );
  });

  const writeCanvasVisibility = (session: Session, visibility: CanvasVisibility) =>
    fileSystem.writeFileString(
      path.join(session.dir, PREFS_FILE),
      JSON.stringify(visibility, null, 2),
    );

  const readSessionAgentId = Effect.fn("sessionStore.readSessionAgentId")(function* (
    session: Session,
  ) {
    return yield* fileSystem.readFileString(path.join(session.dir, CURSOR_AGENT_FILE)).pipe(
      Effect.flatMap((raw) => {
        const parsed = JSON.parse(raw) as { agentId?: string };
        return typeof parsed.agentId === "string"
          ? Effect.succeed(Option.some(parsed.agentId))
          : Effect.succeed(Option.none<string>());
      }),
      Effect.catch(() => Effect.succeed(Option.none<string>())),
    );
  });

  const writeSessionAgentId = (session: Session, agentId: string) =>
    fileSystem.writeFileString(
      path.join(session.dir, CURSOR_AGENT_FILE),
      JSON.stringify({ agentId }, null, 2),
    );

  const readChatHistory = Effect.fn("sessionStore.readChatHistory")(function* (session: Session) {
    return yield* fileSystem.readFileString(path.join(session.dir, CHAT_FILE)).pipe(
      Effect.map((raw) => {
        const parsed = JSON.parse(raw) as SessionChatHistory;
        return {
          messages: Array.isArray(parsed.messages) ? parsed.messages : [],
          activities: Array.isArray(parsed.activities) ? parsed.activities : [],
        } satisfies SessionChatHistory;
      }),
      Effect.catch(() => Effect.succeed(emptyChatHistory())),
    );
  });

  const writeChatHistory = (session: Session, history: SessionChatHistory) =>
    fileSystem.writeFileString(
      path.join(session.dir, CHAT_FILE),
      JSON.stringify(history, null, 2),
    );

  const sessionArtifactsReady = Effect.fn("sessionStore.sessionArtifactsReady")(function* (
    session: Session,
  ) {
    return yield* fileSystem
      .exists(path.join(session.dir, "artifacts", "stats.csv"))
      .pipe(Effect.orElseSucceed(() => false));
  });

  return SessionStore.of({
    sessionsRoot: Effect.succeed(root) as Effect.Effect<string, never>,
    createSession,
    getSession,
    listSessions,
    archiveSession,
    unarchiveSession,
    saveUpload,
    readCanvasTemplate,
    writeCanvasTemplate,
    readCanvasVisibility,
    writeCanvasVisibility,
    readSessionAgentId,
    writeSessionAgentId,
    readChatHistory,
    writeChatHistory,
    sessionArtifactsReady,
  });
});

export const layerWithSessionsRoot = (root: string) => Layer.effect(SessionStore, makeSessionStore(root));

export const layer = layerWithSessionsRoot(SESSIONS_ROOT_PATH);
