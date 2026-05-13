import type { Spec } from "@json-render/core";
import type { WsInbound } from "@agent-plot/contracts";
import { FileUpIcon, MessageSquareTextIcon, PlusIcon, SendIcon, TriangleAlertIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
      setUploadStatus("Uploading...");
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
    <div className="mx-auto grid min-h-full max-w-7xl grid-rows-[auto_1fr] gap-5 px-6 py-5 pb-8">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-normal">agent-plot</h1>
        <p className="text-muted-foreground text-sm">
          TIFF session workspace, Python artifacts, and a json-render canvas over WebSocket.
        </p>
      </header>

      <main className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <Button type="button" onClick={() => void newSession()}>
              <PlusIcon />
              New session
            </Button>

            <Field className="min-w-60 max-w-xs flex-1 gap-1.5">
              <FieldLabel className="text-muted-foreground text-xs">
                <FileUpIcon className="size-3.5" />
                TIFF
              </FieldLabel>
              <Input
                accept=".tif,.tiff,image/tiff"
                disabled={!sessionId}
                nativeInput
                onChange={(e) => {
                  const f = e.currentTarget.files?.[0];
                  void onUpload(f);
                  e.currentTarget.value = "";
                }}
                type="file"
              />
            </Field>

            {sessionId ? (
              <Badge className="font-mono" variant="outline">
                {sessionId.slice(0, 8)}
              </Badge>
            ) : null}
          </div>

          {uploadStatus ? (
            <Badge className="w-fit" variant={uploadStatus.startsWith("Uploaded") ? "success" : "error"}>
              {uploadStatus}
            </Badge>
          ) : null}

          {canvasError ? (
            <Alert variant="error">
              <TriangleAlertIcon />
              <AlertTitle>Canvas error</AlertTitle>
              <AlertDescription>{canvasError}</AlertDescription>
            </Alert>
          ) : null}

          <CanvasPanel spec={spec} />
        </section>

        <Frame className="lg:sticky lg:top-4">
          <FrameHeader>
            <FrameTitle className="flex items-center gap-2">
              <MessageSquareTextIcon className="size-4 text-muted-foreground" />
              Chat
            </FrameTitle>
            <FrameDescription>Session transcript and message input.</FrameDescription>
          </FrameHeader>
          <FramePanel className="flex min-h-[420px] flex-col gap-3">
            <pre className="max-h-72 min-h-0 flex-1 overflow-auto whitespace-pre-wrap rounded-lg border bg-code p-3 font-mono text-code-foreground text-xs leading-6">
              {transcript}
            </pre>
            <Textarea
              className="min-h-24 resize-y"
              disabled={!sessionId}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={sessionId ? "Message... (rebuilds artifacts + canvas)" : "Create a session first"}
              rows={3}
              value={draft}
            />
            <Button disabled={!sessionId || !draft.trim()} onClick={sendMessage} type="button">
              <SendIcon />
              Send
            </Button>
          </FramePanel>
        </Frame>
      </main>
    </div>
  );
}
