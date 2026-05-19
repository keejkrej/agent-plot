import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assistantReply } from "./assistant.js";
import { mergeCanvasVisibility, parseCanvasIntentDelta } from "./canvasIntent.js";
import { refreshSessionCanvas } from "./canvasRefresh.js";
import { describeTiff } from "./pythonRun.js";
import {
  createSession,
  getSession,
  readCanvasVisibility,
  saveUpload,
  sessionsRoot,
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

app.post("/api/sessions", async (c) => {
  const s = await createSession();
  return c.json({ id: s.id });
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
  await saveUpload(session, buf, file.name ?? "input.tif");

  const refreshed = await refreshSessionCanvas(session, id);
  broadcast(id, { type: "chat.delta", text: `\n[upload] ${file.name ?? "input.tif"}\n` });
  broadcast(id, { type: "chat.delta", text: refreshed.artifactNote });
  if (refreshed.ok) {
    broadcast(id, { type: "canvas.tree", spec: refreshed.spec });
    broadcast(id, { type: "chat.delta", text: "Canvas updated (json_render).\n" });
  } else if (refreshed.error) {
    broadcast(id, { type: "canvas.error", message: refreshed.error });
    broadcast(id, { type: "chat.delta", text: `Error: ${refreshed.error}\n` });
  }

  return c.json({ ok: true, name: file.name });
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

const sockets = new Map<string, Set<{ send: (data: string) => void }>>();

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
        let msg: { type?: string; text?: string; templatePath?: string; payload?: Record<string, unknown> };
        try {
          msg = JSON.parse(raw) as typeof msg;
        } catch {
          ws.send(JSON.stringify({ type: "error", message: "invalid json" }));
          return;
        }
        if (msg.type === "user.message") {
          const session = await getSession(sessionId);
          if (!session) {
            ws.send(JSON.stringify({ type: "error", message: "unknown session" }));
            return;
          }
          const text = msg.text ?? "";
          broadcast(sessionId, { type: "chat.delta", text: `\nYou: ${text}\n` });
          const visibility = mergeCanvasVisibility(
            await readCanvasVisibility(session),
            parseCanvasIntentDelta(text),
          );
          await writeCanvasVisibility(session, visibility);
          let streamed = false;
          broadcast(sessionId, { type: "chat.delta", text: "\n" });
          await assistantReply(session, session.dir, text, visibility, {
            onDelta: (chunk) => {
              streamed = true;
              broadcast(sessionId, { type: "chat.delta", text: chunk });
            },
          });
          broadcast(sessionId, { type: "chat.delta", text: streamed ? "\n\n" : "\n(no response)\n\n" });
          const refreshed = await refreshSessionCanvas(session, sessionId);
          broadcast(sessionId, { type: "chat.delta", text: refreshed.artifactNote });
          if (refreshed.ok) {
            broadcast(sessionId, { type: "canvas.tree", spec: refreshed.spec });
            broadcast(sessionId, { type: "chat.delta", text: "Canvas updated (json_render).\n" });
          } else if (refreshed.error) {
            broadcast(sessionId, { type: "canvas.error", message: refreshed.error });
            broadcast(sessionId, { type: "chat.delta", text: `Error: ${refreshed.error}\n` });
          } else if (Object.keys(parseCanvasIntentDelta(text)).length > 0) {
            broadcast(sessionId, {
              type: "chat.delta",
              text: "Canvas preferences saved — upload a TIFF (or send another message after upload) to apply them.\n",
            });
          }
          return;
        }
        if (msg.type === "json_render") {
          const session = await getSession(sessionId);
          if (!session) {
            ws.send(JSON.stringify({ type: "error", message: "unknown session" }));
            return;
          }
          const refreshed = await refreshSessionCanvas(session, sessionId);
          if (refreshed.ok) {
            broadcast(sessionId, { type: "canvas.tree", spec: refreshed.spec });
            broadcast(sessionId, { type: "tool.end", name: "json_render" });
          } else if (refreshed.error) {
            broadcast(sessionId, { type: "canvas.error", message: refreshed.error });
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
