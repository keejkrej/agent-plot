import type { Spec } from "@json-render/core";
import type { WsInbound } from "@agent-plot/contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppSidebar, type SessionEntry } from "@/components/AppSidebar.js";
import { CanvasSection } from "@/components/CanvasSection.js";
import { ChatPanel } from "@/components/ChatPanel.js";

const INITIAL_TRANSCRIPT =
  "Create a session, then tell the assistant which TIFF to analyze by including the file path in your message. You can also ask to hide or show canvas panels (raw, FFT, charts).\n\n";

const wsBaseUrl = () => {
  const u = new URL("/ws", window.location.origin);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  return u.toString().replace(/\/$/, "");
};

function sessionTitle(id: string): string {
  return `Session ${id.slice(0, 8)}`;
}

export function App() {
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [spec, setSpec] = useState<Spec | null>(null);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const wsReadyRef = useRef(false);
  const pendingMessagesRef = useRef<string[]>([]);

  const api = useMemo(() => "/api", []);

  const transcript = sessionId
    ? (transcripts[sessionId] ?? INITIAL_TRANSCRIPT)
    : INITIAL_TRANSCRIPT;

  const appendTranscript = useCallback((id: string, chunk: string | ((prev: string) => string)) => {
    setTranscripts((prev) => {
      const base = prev[id] ?? INITIAL_TRANSCRIPT;
      const next = typeof chunk === "function" ? chunk(base) : base + chunk;
      return { ...prev, [id]: next };
    });
  }, []);

  useEffect(() => {
    if (!sessionId) {
      wsRef.current = null;
      return;
    }
    const wsUrl = `${wsBaseUrl()}?sessionId=${encodeURIComponent(sessionId)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    wsReadyRef.current = false;
    ws.onopen = () => {
      wsReadyRef.current = true;
      const pending = pendingMessagesRef.current;
      pendingMessagesRef.current = [];
      for (const text of pending) {
        ws.send(JSON.stringify({ type: "user.message", text }));
      }
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as WsInbound;
        if (msg.type === "chat.delta") appendTranscript(sessionId, (t) => t + msg.text);
        if (msg.type === "canvas.tree") {
          setCanvasError(null);
          const next = msg.spec as Spec;
          console.log("[json-render] canvas.tree", next);
          setSpec(next);
        }
        if (msg.type === "canvas.error") setCanvasError(msg.message);
        if (msg.type === "error") appendTranscript(sessionId, (t) => t + `\n[error] ${msg.message}\n`);
      } catch {
        appendTranscript(sessionId, (t) => t + String(ev.data));
      }
    };
    ws.onclose = () => {
      wsReadyRef.current = false;
      if (wsRef.current === ws) wsRef.current = null;
    };
    return () => {
      wsReadyRef.current = false;
      pendingMessagesRef.current = [];
      ws.close();
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [sessionId, appendTranscript]);

  const selectSession = useCallback((id: string) => {
    setSessionId(id);
    setSpec(null);
    setCanvasError(null);
    setDraft("");
  }, []);

  const newSession = useCallback(async () => {
    const r = await fetch(`${api}/sessions`, { method: "POST" });
    const j = (await r.json()) as { id: string };
    const entry = { id: j.id, title: sessionTitle(j.id) };
    setSessions((s) => [entry, ...s.filter((x) => x.id !== j.id)]);
    setTranscripts((prev) => ({
      ...prev,
      [j.id]: `Session ${j.id}\n`,
    }));
    selectSession(j.id);
  }, [api, selectSession]);

  const sendMessage = useCallback(() => {
    const text = draft.trim();
    if (!text || !sessionId) return;
    const ws = wsRef.current;
    if (!ws) {
      appendTranscript(sessionId, (t) => t + "\n[ui] No session WebSocket.\n");
      return;
    }
    if (ws.readyState !== WebSocket.OPEN) {
      pendingMessagesRef.current.push(text);
      appendTranscript(sessionId, (t) => t + "[ui] WebSocket connecting — message queued.\n");
      setDraft("");
      return;
    }
    ws.send(JSON.stringify({ type: "user.message", text }));
    appendTranscript(sessionId, (t) => t + `\nYou: ${text}\n\n`);
    setDraft("");
  }, [draft, sessionId, appendTranscript]);

  const activeSession = sessions.find((s) => s.id === sessionId);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <AppSidebar
        activeSessionId={sessionId}
        onNewSession={() => void newSession()}
        onSelectSession={selectSession}
        sessions={sessions}
      />

      <div className="flex h-full w-[min(420px,34vw)] min-w-[300px] shrink-0 flex-col">
        <ChatPanel
          draft={draft}
          onDraftChange={setDraft}
          onSend={sendMessage}
          sessionId={sessionId}
          sessionTitle={activeSession?.title ?? null}
          transcript={transcript}
        />
      </div>

      <CanvasSection canvasError={canvasError} sessionId={sessionId} spec={spec} />
    </div>
  );
}
