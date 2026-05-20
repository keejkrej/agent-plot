import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assistantReply } from "./assistant.js";
import {
  broadcastActivityEnd,
  broadcastActivityStart,
  broadcastAssistantDelta,
  broadcastAssistantEnd,
  broadcastAssistantStart,
  broadcastChatUser,
  broadcastSystemNote,
  setChatBroadcastSender,
} from "./chatBroadcast.js";
import { readChatHistory } from "./chatHistory.js";
import type { PathAttachment } from "@agent-plot/contracts";
import { mergeCanvasVisibility, parseCanvasIntentDelta } from "./canvasIntent.js";
import { browseFilesystem } from "./fsBrowse.js";
import { buildAgentMessageText } from "./pathAttachments.js";
import { refreshSessionCanvas } from "./canvasRefresh.js";
import { describeTiff } from "./pythonRun.js";
import {
  archiveSession,
  createSession,
  getSession,
  listSessions,
  readCanvasVisibility,
  saveUpload,
  sessionsRoot,
  unarchiveSession,
  writeCanvasVisibility,
} from "./session.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8787);

const app = new Hono();

const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });

app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", `http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`],
    allowHeaders: ["*"],
    allowMethods: ["*"],
  }),
);

app.get("/health", (c) => c.json({ ok: true }));

app.get("/api/sessions", async (c) => {
  const archivedParam = c.req.query("archived");
  const archived = archivedParam === "true";
  const sessions = await listSessions({ archived });
  return c.json({ sessions });
});

app.post("/api/sessions", async (c) => {
  const s = await createSession();
  return c.json({ id: s.id });
});

app.post("/api/sessions/:id/archive", async (c) => {
  const id = c.req.param("id");
  const session = await archiveSession(id);
  if (!session) return c.json({ error: "session not found" }, 404);
  return c.json({ ok: true });
});

app.post("/api/sessions/:id/unarchive", async (c) => {
  const id = c.req.param("id");
  const session = await unarchiveSession(id);
  if (!session) return c.json({ error: "session not found" }, 404);
  return c.json({ ok: true });
});

app.get("/api/sessions/:id/chat", async (c) => {
  const id = c.req.param("id");
  const session = await getSession(id);
  if (!session) return c.json({ error: "session not found" }, 404);
  const history = await readChatHistory(session);
  return c.json(history);
});

app.post("/api/sessions/:id/upload", async (c) => {
  const id = c.req.param("id");
  const session = await getSession(id);
  if (!session) return c.json({ error: "session not found" }, 404);
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!file || typeof file === "string") {
    return c.json({ error: "expected file field (binary)" }, 400);
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const fileName = file.name ?? "input.tif";
  await saveUpload(session, buf, fileName);

  let history = await readChatHistory(session);
  const { history: afterUser } = await broadcastChatUser(
    session,
    `[upload] ${fileName}`,
  );
  history = afterUser;

  const { activityId, history: afterActStart } = await broadcastActivityStart(
    session,
    history,
    "Building artifacts",
  );
  history = afterActStart;

  const refreshed = await refreshSessionCanvas(session, id, { buildIfMissing: true });

  if (refreshed.artifactNote) {
    history = await broadcastSystemNote(session, history, refreshed.artifactNote.trim());
  }

  if (refreshed.ok) {
    broadcast(id, { type: "canvas.tree", spec: refreshed.spec });
    history = await broadcastActivityEnd(session, history, activityId, {
      detail: "Canvas updated",
      status: "done",
    });
    broadcast(id, { type: "tool.end", name: "json_render" });
  } else if (refreshed.error) {
    broadcast(id, { type: "canvas.error", message: refreshed.error });
    history = await broadcastActivityEnd(session, history, activityId, {
      detail: refreshed.error,
      status: "error",
    });
    history = await broadcastSystemNote(session, history, `Error: ${refreshed.error}`);
  } else {
    history = await broadcastActivityEnd(session, history, activityId, { status: "done" });
  }

  return c.json({ ok: true, name: fileName });
});

app.get("/api/sessions/:id/artifacts/*", async (c) => {
  const id = c.req.param("id");
  const session = await getSession(id);
  if (!session) return c.json({ error: "not found" }, 404);
  const url = new URL(c.req.url);
  const prefix = `/api/sessions/${id}/artifacts/`;
  const rel = url.pathname.slice(prefix.length);
  if (!rel || rel.includes("..")) return c.json({ error: "bad path" }, 400);
  const abs = path.join(session.dir, "artifacts", rel);
  if (!abs.startsWith(path.join(session.dir, "artifacts"))) return c.json({ error: "bad path" }, 400);
  try {
    const data = await readFile(abs);
    const ext = path.extname(rel).toLowerCase();
    const type =
      ext === ".png"
        ? "image/png"
        : ext === ".csv"
          ? "text/csv"
          : "application/octet-stream";
    return new Response(data, { headers: { "Content-Type": type } });
  } catch {
    return c.json({ error: "not found" }, 404);
  }
});

app.get("/api/sessions/:id/describe", async (c) => {
  const id = c.req.param("id");
  const session = await getSession(id);
  if (!session) return c.json({ error: "not found" }, 404);
  const r = await describeTiff(session.dir);
  if (!r.ok) return c.json({ error: r.stderr }, 500);
  return c.json(r.data);
});

function broadcast(sessionId: string, msg: unknown) {
  const set = sockets.get(sessionId);
  if (!set) return;
  const line = JSON.stringify(msg);
  for (const ws of set) {
    try {
      ws.send(line);
    } catch {
      /* ignore */
    }
  }
}

setChatBroadcastSender(broadcast);

const sockets = new Map<string, Set<{ send: (data: string) => void }>>();

function parsePathAttachments(raw: unknown): PathAttachment[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: PathAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const path = typeof o.path === "string" ? o.path.trim() : "";
    const kind = o.kind === "file" || o.kind === "folder" ? o.kind : null;
    if (!id || !path || !kind) continue;
    out.push({ id, path, kind });
  }
  return out.length > 0 ? out : undefined;
}

async function handleUserMessage(
  sessionId: string,
  text: string,
  pathAttachments?: PathAttachment[],
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) {
    broadcast(sessionId, { type: "error", message: "unknown session" });
    return;
  }

  const agentText = buildAgentMessageText(text, pathAttachments);

  const visibility = mergeCanvasVisibility(
    await readCanvasVisibility(session),
    parseCanvasIntentDelta(`${text}\n${agentText}`),
  );
  await writeCanvasVisibility(session, visibility);

  let { history } = await broadcastChatUser(session, text, pathAttachments);

  const { activityId: analyzeId, history: afterAnalyzeStart } = await broadcastActivityStart(
    session,
    history,
    "Analyzing data",
  );
  history = afterAnalyzeStart;

  const { assistantId, history: afterAssistantStart } = await broadcastAssistantStart(
    session,
    history,
  );
  history = afterAssistantStart;

  let streamed = false;
  await assistantReply(session, session.dir, agentText, visibility, {
    onDelta: async (chunk) => {
      streamed = true;
      history = await broadcastAssistantDelta(session, history, assistantId, chunk);
    },
  });

  if (!streamed) {
    history = await broadcastAssistantDelta(
      session,
      history,
      assistantId,
      "(no response)",
    );
  }

  history = await broadcastAssistantEnd(session, history, assistantId);
  history = await broadcastActivityEnd(session, history, analyzeId, { status: "done" });

  const { activityId: canvasId, history: afterCanvasStart } = await broadcastActivityStart(
    session,
    history,
    "Refreshing canvas",
  );
  history = afterCanvasStart;

  const refreshed = await refreshSessionCanvas(session, sessionId);
  if (refreshed.artifactNote) {
    history = await broadcastSystemNote(session, history, refreshed.artifactNote.trim());
  }
  if (refreshed.ok) {
    broadcast(sessionId, { type: "canvas.tree", spec: refreshed.spec });
    history = await broadcastActivityEnd(session, history, canvasId, {
      detail: "Canvas updated",
      status: "done",
    });
    broadcast(sessionId, { type: "tool.end", name: "json_render" });
  } else if (refreshed.error) {
    broadcast(sessionId, { type: "canvas.error", message: refreshed.error });
    history = await broadcastActivityEnd(session, history, canvasId, {
      detail: refreshed.error,
      status: "error",
    });
    history = await broadcastSystemNote(session, history, `Error: ${refreshed.error}`);
  } else if (Object.keys(parseCanvasIntentDelta(text)).length > 0) {
    history = await broadcastActivityEnd(session, history, canvasId, {
      detail: "Preferences saved",
      status: "done",
    });
    history = await broadcastSystemNote(
      session,
      history,
      "Canvas preferences saved. Point the agent at your data path and ask it to build previews when you want the canvas filled in.",
    );
  } else {
    history = await broadcastActivityEnd(session, history, canvasId, { status: "done" });
  }
}

app.get(
  "/ws",
  upgradeWebSocket((c) => {
    const sessionId = new URL(c.req.url).searchParams.get("sessionId") ?? "";
    return {
      onOpen(_evt, ws) {
        if (!sessionId) {
          ws.close(1008, "missing sessionId");
          return;
        }
        let set = sockets.get(sessionId);
        if (!set) {
          set = new Set();
          sockets.set(sessionId, set);
        }
        set.add(ws as { send: (data: string) => void });
      },
      onClose(_evt, ws) {
        const set = sockets.get(sessionId);
        if (set) {
          set.delete(ws as { send: (data: string) => void });
          if (set.size === 0) sockets.delete(sessionId);
        }
      },
      async onMessage(event, ws) {
        const raw = typeof event.data === "string" ? event.data : String(event.data);
        let msg: {
          type?: string;
          text?: string;
          requestId?: string;
          partialPath?: string;
          pathAttachments?: unknown;
          templatePath?: string;
          payload?: Record<string, unknown>;
        };
        try {
          msg = JSON.parse(raw) as typeof msg;
        } catch {
          ws.send(JSON.stringify({ type: "error", message: "invalid json" }));
          return;
        }
        if (msg.type === "fs.browse") {
          const requestId = typeof msg.requestId === "string" ? msg.requestId : "";
          const partialPath =
            typeof msg.partialPath === "string" ? msg.partialPath : "~";
          if (!requestId) {
            ws.send(JSON.stringify({ type: "error", message: "missing requestId" }));
            return;
          }
          try {
            const result = await browseFilesystem(partialPath);
            ws.send(
              JSON.stringify({
                type: "fs.browse.ok",
                requestId,
                parentPath: result.parentPath,
                entries: result.entries,
              }),
            );
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            ws.send(JSON.stringify({ type: "fs.browse.error", requestId, message }));
          }
          return;
        }
        if (msg.type === "user.message") {
          const session = await getSession(sessionId);
          if (!session) {
            ws.send(JSON.stringify({ type: "error", message: "unknown session" }));
            return;
          }
          const text = typeof msg.text === "string" ? msg.text : "";
          const pathAttachments = parsePathAttachments(msg.pathAttachments);
          if (!text.trim() && !pathAttachments?.length) {
            ws.send(JSON.stringify({ type: "error", message: "empty message" }));
            return;
          }
          await handleUserMessage(sessionId, text, pathAttachments);
          return;
        }
        if (msg.type === "json_render") {
          const session = await getSession(sessionId);
          if (!session) {
            ws.send(JSON.stringify({ type: "error", message: "unknown session" }));
            return;
          }
          let history = await readChatHistory(session);
          const { activityId, history: afterStart } = await broadcastActivityStart(
            session,
            history,
            "Rendering canvas",
          );
          history = afterStart;
          const refreshed = await refreshSessionCanvas(session, sessionId);
          if (refreshed.ok) {
            broadcast(sessionId, { type: "canvas.tree", spec: refreshed.spec });
            history = await broadcastActivityEnd(session, history, activityId, {
              detail: "Canvas updated",
              status: "done",
            });
            broadcast(sessionId, { type: "tool.end", name: "json_render" });
          } else if (refreshed.error) {
            broadcast(sessionId, { type: "canvas.error", message: refreshed.error });
            history = await broadcastActivityEnd(session, history, activityId, {
              detail: refreshed.error,
              status: "error",
            });
          }
          return;
        }
      },
    };
  }),
);

console.log(`Sessions directory: ${sessionsRoot()}`);

const server = serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log(`Server listening on http://localhost:${info.port}`);
  },
);

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the other process (e.g. lsof -ti :${PORT} | xargs kill) or set PORT to another value.`,
    );
    process.exit(1);
  }
  throw err;
});

injectWebSocket(server);
