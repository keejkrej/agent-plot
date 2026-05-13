import type { Spec } from "@json-render/core";
import type { WsInbound } from "@agent-plot/contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CanvasPanel } from "./canvas/CanvasPanel.js";

const wsBaseUrl = () => {
  const u = new URL("/ws", window.location.origin);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  return u.toString().replace(/\/$/, "");
};

export function App() {
  const [transcript, setTranscript] = useState(
    "Create a session, upload a TIFF, then send a message to rebuild artifacts and refresh the canvas.\n\n",
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [spec, setSpec] = useState<Spec | null>(null);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const api = useMemo(() => "/api", []);

  useEffect(() => {
    if (!sessionId) {
      wsRef.current = null;
      return;
    }
    const wsUrl = `${wsBaseUrl()}?sessionId=${encodeURIComponent(sessionId)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as WsInbound;
        if (msg.type === "chat.delta") setTranscript((t) => t + msg.text);
        if (msg.type === "canvas.tree") {
          setCanvasError(null);
          setSpec(msg.spec as Spec);
        }
        if (msg.type === "canvas.error") setCanvasError(msg.message);
        if (msg.type === "error") setTranscript((t) => t + `\n[error] ${msg.message}\n`);
      } catch {
        setTranscript((t) => t + String(ev.data));
      }
    };
    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
    };
    return () => {
      ws.close();
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [sessionId]);

  const newSession = useCallback(async () => {
    const r = await fetch(`${api}/sessions`, { method: "POST" });
    const j = (await r.json()) as { id: string };
    setSessionId(j.id);
    setSpec(null);
    setCanvasError(null);
    setTranscript((t) => t + `Session ${j.id}\n`);
  }, [api]);

  const sendMessage = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setTranscript((t) => t + "\n[ui] WebSocket not connected yet.\n");
      return;
    }
    ws.send(JSON.stringify({ type: "user.message", text }));
    setDraft("");
  }, [draft]);

  const onUpload = useCallback(
    async (file: File | undefined) => {
      if (!file || !sessionId) return;
      setUploadStatus("Uploading…");
      const fd = new FormData();
      fd.set("file", file);
      const r = await fetch(`${api}/sessions/${sessionId}/upload`, { method: "POST", body: fd });
      const j = (await r.json()) as { ok?: boolean; error?: string; name?: string };
      if (!r.ok) {
        setUploadStatus(j.error ?? `HTTP ${r.status}`);
        return;
      }
      setUploadStatus(`Uploaded ${j.name ?? file.name}`);
      setTranscript((t) => t + `\n[upload] ${j.name ?? file.name}\n`);
    },
    [api, sessionId],
  );

  return (
    <div
      style={{
        minHeight: "100%",
        display: "grid",
        gridTemplateRows: "auto 1fr",
        padding: "20px 24px 32px",
        gap: 20,
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <header>
        <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 650, letterSpacing: "-0.02em" }}>agent-plot</h1>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
          TIFF session workspace, Python artifacts, and a json-render canvas over WebSocket.
        </p>
      </header>

      <div className="layout-grid">
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <button type="button" onClick={() => void newSession()}>
              New session
            </button>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "var(--muted)",
              }}
            >
              <span>TIFF</span>
              <input
                type="file"
                accept=".tif,.tiff,image/tiff"
                disabled={!sessionId}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  void onUpload(f);
                  e.target.value = "";
                }}
              />
            </label>
            {sessionId ? (
              <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "ui-monospace, monospace" }}>
                {sessionId.slice(0, 8)}…
              </span>
            ) : null}
          </div>
          {uploadStatus ? (
            <p style={{ margin: 0, fontSize: 13, color: uploadStatus.startsWith("Upload") ? "var(--muted)" : "#f85149" }}>
              {uploadStatus}
            </p>
          ) : null}
          {canvasError ? (
            <p
              style={{
                margin: 0,
                padding: "10px 12px",
                borderRadius: 8,
                background: "#3d1117",
                border: "1px solid #f85149",
                color: "#ffb1af",
                fontSize: 13,
              }}
            >
              Canvas error: {canvasError}
            </p>
          ) : null}
          <CanvasPanel spec={spec} />
        </section>

        <aside
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 14,
            minHeight: 420,
            position: "sticky",
            top: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--muted)" }}>Chat</h2>
          <pre
            style={{
              flex: 1,
              margin: 0,
              padding: 12,
              background: "#010409",
              borderRadius: 8,
              border: "1px solid var(--border)",
              color: "#c9d1d9",
              fontSize: 12,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              overflow: "auto",
              maxHeight: 280,
            }}
          >
            {transcript}
          </pre>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={sessionId ? "Message… (rebuilds artifacts + canvas)" : "Create a session first"}
            disabled={!sessionId}
            rows={3}
            style={{
              resize: "vertical",
              padding: 10,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "#0d1117",
              color: "var(--text)",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button type="button" onClick={sendMessage} disabled={!sessionId || !draft.trim()}>
            Send
          </button>
        </aside>
      </div>
    </div>
  );
}
