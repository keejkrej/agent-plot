import type { Spec } from "@json-render/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppSidebar, type SessionEntry } from "@/components/AppSidebar.js";
import { CanvasSection } from "@/components/CanvasSection.js";
import { ChatView } from "@/components/ChatView.js";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useComposerDraft } from "@/composerDraftStore.js";
import { useSessionChat } from "@/hooks/useSessionChat.js";
import { usePanelWidth } from "@/hooks/usePanelWidth.js";

function sessionTitle(id: string): string {
  return `Session ${id.slice(0, 8)}`;
}

export function App() {
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [spec, setSpec] = useState<Spec | null>(null);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const api = useMemo(() => "/api", []);
  const { width: chatWidth, onResizePointerDown } = usePanelWidth(
    "agent-plot:chat-width",
    420,
    300,
    720,
  );

  const { prompt: draft, setPrompt: setDraft, clearPrompt: clearDraft } = useComposerDraft(sessionId);

  const onCanvasTree = useCallback((tree: unknown) => {
    setCanvasError(null);
    setSpec(tree as Spec);
  }, []);

  const onCanvasError = useCallback((message: string) => {
    setCanvasError(message);
  }, []);

  const {
    messages,
    activities,
    isRunning,
    error: chatError,
    connection,
    sendMessage,
    reloadHistory,
  } = useSessionChat({
    sessionId,
    apiBase: api,
    onCanvasTree,
    onCanvasError,
  });

  const loadSessions = useCallback(async () => {
    try {
      const r = await fetch(`${api}/sessions`);
      if (!r.ok) return;
      const j = (await r.json()) as {
        sessions: Array<{ id: string; title: string }>;
      };
      setSessions(
        j.sessions.map((s) => ({
          id: s.id,
          title: s.title || sessionTitle(s.id),
        })),
      );
    } catch {
      /* ignore */
    }
  }, [api]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const selectSession = useCallback((id: string) => {
    setSessionId(id);
    setSpec(null);
    setCanvasError(null);
  }, []);

  const newSession = useCallback(async () => {
    const r = await fetch(`${api}/sessions`, { method: "POST" });
    const j = (await r.json()) as { id: string };
    const entry = { id: j.id, title: sessionTitle(j.id) };
    setSessions((s) => [entry, ...s.filter((x) => x.id !== j.id)]);
    selectSession(j.id);
    void loadSessions();
  }, [api, selectSession, loadSessions]);

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text || !sessionId) return;
    sendMessage(text);
    clearDraft();
  }, [draft, sessionId, sendMessage, clearDraft]);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!sessionId) return;
      const body = new FormData();
      body.append("file", file);
      try {
        const r = await fetch(`${api}/sessions/${encodeURIComponent(sessionId)}/upload`, {
          method: "POST",
          body,
        });
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          setCanvasError(j.error ?? "Upload failed");
          return;
        }
        await reloadHistory();
      } catch {
        setCanvasError("Upload failed");
      }
    },
    [api, sessionId, reloadHistory],
  );

  const scrollToCanvas = useCallback(() => {
    canvasRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const activeSession = sessions.find((s) => s.id === sessionId);

  return (
    <SidebarProvider className="h-dvh min-h-0" defaultOpen>
      <AppSidebar
        activeSessionId={sessionId}
        onNewSession={() => void newSession()}
        onSelectSession={selectSession}
        sessions={sessions}
      />

      <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
        <div className="flex h-full min-h-0 overflow-hidden bg-background">
          <div
            className="relative flex h-full min-h-0 shrink-0 flex-col border-border border-r"
            style={{ width: chatWidth }}
          >
            <ChatView
              activities={activities}
              connection={connection}
              draft={draft}
              error={chatError}
              isRunning={isRunning}
              messages={messages}
              onDraftChange={setDraft}
              onSend={handleSend}
              onUpload={handleUpload}
              onViewCanvas={scrollToCanvas}
              sessionId={sessionId}
              sessionTitle={activeSession?.title ?? null}
            />
          </div>

          <div
            aria-orientation="vertical"
            className="w-1 shrink-0 cursor-col-resize bg-border/60 hover:bg-border"
            onPointerDown={onResizePointerDown}
            role="separator"
          />

          <div ref={canvasRef} className="min-h-0 min-w-0 flex-1">
            <CanvasSection
              canvasError={canvasError}
              isLoading={isRunning}
              sessionId={sessionId}
              spec={spec}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
