import type { Spec } from "@json-render/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppSidebar, type SessionEntry } from "@/components/AppSidebar.js";
import { CanvasSection } from "@/components/CanvasSection.js";
import { ChatView } from "@/components/ChatView.js";
import { NoActiveSessionState } from "@/components/NoActiveSessionState.js";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useComposerDraft } from "@/composerDraftStore.js";
import { useSessionChat } from "@/hooks/useSessionChat.js";
import { usePanelWidth } from "@/hooks/usePanelWidth.js";

function sessionTitle(id: string): string {
  return `Session ${id.slice(0, 8)}`;
}

export function App() {
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [archivedSessions, setArchivedSessions] = useState<SessionEntry[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [spec, setSpec] = useState<Spec | null>(null);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [canvasOpen, setCanvasOpen] = useState(true);

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

  const mapSessionEntry = useCallback(
    (s: { id: string; title: string; updatedAt?: string; archivedAt?: string | null }) => ({
      id: s.id,
      title: s.title || sessionTitle(s.id),
      updatedAt: s.updatedAt,
      archivedAt: s.archivedAt ?? null,
    }),
    [],
  );

  const loadSessions = useCallback(async () => {
    try {
      const [activeRes, archivedRes] = await Promise.all([
        fetch(`${api}/sessions`),
        fetch(`${api}/sessions?archived=true`),
      ]);
      if (activeRes.ok) {
        const j = (await activeRes.json()) as {
          sessions: Array<{ id: string; title: string; updatedAt?: string; archivedAt?: string | null }>;
        };
        setSessions(j.sessions.map(mapSessionEntry));
      }
      if (archivedRes.ok) {
        const j = (await archivedRes.json()) as {
          sessions: Array<{ id: string; title: string; updatedAt?: string; archivedAt?: string | null }>;
        };
        setArchivedSessions(j.sessions.map(mapSessionEntry));
      }
    } catch {
      /* ignore */
    }
  }, [api, mapSessionEntry]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const archiveSessionById = useCallback(
    async (id: string) => {
      if (isRunning && sessionId === id) return;
      try {
        const r = await fetch(`${api}/sessions/${encodeURIComponent(id)}/archive`, { method: "POST" });
        if (!r.ok) return;
        if (sessionId === id) {
          setSessionId(null);
          setSpec(null);
          setCanvasError(null);
        }
        await loadSessions();
      } catch {
        /* ignore */
      }
    },
    [api, isRunning, loadSessions, sessionId],
  );

  const unarchiveSessionById = useCallback(
    async (id: string) => {
      try {
        const r = await fetch(`${api}/sessions/${encodeURIComponent(id)}/unarchive`, {
          method: "POST",
        });
        if (!r.ok) return;
        await loadSessions();
      } catch {
        /* ignore */
      }
    },
    [api, loadSessions],
  );

  const selectSession = useCallback(
    (id: string) => {
      if (archivedSessions.some((s) => s.id === id)) {
        void unarchiveSessionById(id);
      }
      setSessionId(id);
      setSpec(null);
      setCanvasError(null);
    },
    [archivedSessions, unarchiveSessionById],
  );

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

  const toggleCanvas = useCallback(() => {
    setCanvasOpen((open) => !open);
  }, []);

  const openCanvas = useCallback(() => {
    setCanvasOpen(true);
  }, []);

  const activeSession = sessions.find((s) => s.id === sessionId);

  return (
    <SidebarProvider className="h-dvh min-h-0" defaultOpen>
      <AppSidebar
        activeSessionId={sessionId}
        archiveDisabledSessionId={isRunning ? sessionId : null}
        archivedSessions={archivedSessions}
        onArchiveSession={(id) => void archiveSessionById(id)}
        onNewSession={() => void newSession()}
        onSelectSession={selectSession}
        onUnarchiveSession={(id) => void unarchiveSessionById(id)}
        sessions={sessions}
      />

      <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
        {!sessionId ? (
          <NoActiveSessionState />
        ) : (
          <div className="flex h-full min-h-0 overflow-hidden bg-background">
            <div
              className="relative flex h-full min-h-0 shrink-0 flex-col"
              style={{ width: chatWidth }}
            >
              <ChatView
                activities={activities}
                canvasOpen={canvasOpen}
                connection={connection}
                draft={draft}
                error={chatError}
                isRunning={isRunning}
                messages={messages}
                onDraftChange={setDraft}
                onSend={handleSend}
                onOpenCanvas={openCanvas}
                onToggleCanvas={toggleCanvas}
                onUpload={handleUpload}
                sessionId={sessionId}
                sessionTitle={activeSession?.title ?? null}
              />
            </div>

            {canvasOpen ? (
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
                <div
                  aria-orientation="vertical"
                  className="absolute inset-y-0 left-0 z-10 w-4 -translate-x-1/2 cursor-col-resize"
                  onPointerDown={onResizePointerDown}
                  role="separator"
                />
                <CanvasSection
                  canvasError={canvasError}
                  isLoading={isRunning}
                  spec={spec}
                />
              </div>
            ) : null}
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
