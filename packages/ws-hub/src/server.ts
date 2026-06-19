import http from "node:http";
import url from "node:url";
import { WebSocket, WebSocketServer } from "ws";
import type { HubMessage } from "./types.js";

export type HubServerOptions = {
  port?: number;
  host?: string;
};

const DEFAULT_PORT = Number(process.env.AGENT_PLOT_WS_HUB_PORT ?? "8788");
const DEFAULT_HOST = process.env.AGENT_PLOT_WS_HUB_HOST ?? "127.0.0.1";

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
  };
}

export function startHub(options: HubServerOptions = {}) {
  const port = options.port ?? DEFAULT_PORT;
  const host = options.host ?? DEFAULT_HOST;

  const socketsBySession = new Map<string, Set<WebSocket>>();

  function broadcast(sessionId: string, message: HubMessage) {
    const set = socketsBySession.get(sessionId);
    if (!set) return;
    const line = JSON.stringify(message);
    for (const ws of set) {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(line);
        } catch {
          // ignore
        }
      }
    }
  }

  const server = http.createServer((req, res) => {
    const parsed = url.parse(req.url ?? "/", true);
    const pathname = parsed.pathname ?? "/";

    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders());
      res.end();
      return;
    }

    if (pathname === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders() });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    const broadcastMatch = pathname.match(/^\/broadcast\/([^/]+)$/);
    if (broadcastMatch && req.method === "POST") {
      const sessionId = broadcastMatch[1]!;
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const message = JSON.parse(body) as HubMessage;
          broadcast(sessionId, message);
          res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders() });
          res.end(JSON.stringify({ ok: true }));
        } catch (error) {
          const message = error instanceof Error ? error.message : "invalid message";
          res.writeHead(400, { "Content-Type": "application/json", ...corsHeaders() });
          res.end(JSON.stringify({ error: message }));
        }
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json", ...corsHeaders() });
    res.end(JSON.stringify({ error: "not found" }));
  });

  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const parsed = url.parse(req.url ?? "/", true);
    const sessionId = parsed.query["sessionId"];
    if (typeof sessionId !== "string" || !sessionId) {
      ws.close(1002, "missing sessionId");
      return;
    }

    let set = socketsBySession.get(sessionId);
    if (!set) {
      set = new Set();
      socketsBySession.set(sessionId, set);
    }
    set.add(ws);

    ws.on("close", () => {
      set?.delete(ws);
      if (set?.size === 0) {
        socketsBySession.delete(sessionId);
      }
    });

    ws.on("error", () => {
      set?.delete(ws);
      if (set?.size === 0) {
        socketsBySession.delete(sessionId);
      }
    });
  });

  return new Promise<http.Server>((resolve, reject) => {
    server.listen(port, host, () => {
      console.log(`ws-hub listening on ws://${host}:${port}/ws, http://${host}:${port}`);
      resolve(server);
    });
    server.once("error", reject);
  });
}
