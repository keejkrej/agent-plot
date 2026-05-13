import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assistantReply } from "./assistant.js";
import { buildArtifacts, describeTiff } from "./pythonRun.js";
import { jsonRender } from "./mergeCanvas.js";
import { createSession, getSession, saveUpload, sessionsRoot } from "./session.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8787);
const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN ?? `http://localhost:${PORT}`;

const app = new Hono();

const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });

app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", PUBLIC_ORIGIN],
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
          const reply = await assistantReply(sessionId, session.dir, text);
          broadcast(sessionId, { type: "chat.delta", text: `\n${reply}\n\n` });
          try {
            const built = await buildArtifacts(session.dir);
            if (!built.ok) {
              broadcast(sessionId, {
                type: "chat.delta",
                text: `Artifact build skipped/failed: ${built.stderr}\n`,
              });
            } else {
              broadcast(sessionId, { type: "chat.delta", text: `Artifacts ready.\n` });
            }
            const defaultPayload = {
              raw: "./artifacts/raw_preview.png",
              fft: "./artifacts/fft_mag.png",
              stats: "./artifacts/stats.csv",
            };
            const spec = await jsonRender(session.dir, sessionId, PUBLIC_ORIGIN, defaultPayload);
            broadcast(sessionId, { type: "canvas.tree", spec });
            broadcast(sessionId, { type: "chat.delta", text: `Canvas updated (json_render).\n` });
          } catch (e) {
            const m = e instanceof Error ? e.message : String(e);
            broadcast(sessionId, { type: "canvas.error", message: m });
            broadcast(sessionId, { type: "chat.delta", text: `Error: ${m}\n` });
          }
          return;
        }
        if (msg.type === "json_render") {
          const session = await getSession(sessionId);
          if (!session) {
            ws.send(JSON.stringify({ type: "error", message: "unknown session" }));
            return;
          }
          try {
            const spec = await jsonRender(
              session.dir,
              sessionId,
              PUBLIC_ORIGIN,
              msg.payload ?? {},
            );
            broadcast(sessionId, { type: "canvas.tree", spec });
            broadcast(sessionId, { type: "tool.end", name: "json_render" });
          } catch (e) {
            const m = e instanceof Error ? e.message : String(e);
            broadcast(sessionId, { type: "canvas.error", message: m });
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
    console.log(`Server listening on ${PUBLIC_ORIGIN} (port ${info.port})`);
  },
);

injectWebSocket(server);
