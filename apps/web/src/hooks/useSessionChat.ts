"use client";

import type {
  FilesystemBrowseResult,
  PathAttachment,
  SessionChatHistory,
  WsInbound,
} from "@agent-plot/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { applyWsMessage, hydrateChatState, markRunningComplete } from "@/lib/chatReducer.js";
import type { ChatState, SessionPhase } from "@/types.js";
import { initialChatState } from "@/types.js";

const wsBaseUrl = () => {
  const configured = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_WS_URL?.trim() : undefined;
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const u = new URL("/ws", origin || "http://localhost");
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  return u.toString().replace(/\/$/, "");
};

const RECONNECT_BASE_MS = 800;
const RECONNECT_MAX_MS = 12_000;

type UseSessionChatOptions = {
  sessionId: string | null;
  apiBase?: string;
  onCanvasTree?: (spec: unknown) => void;
  onCanvasError?: (message: string) => void;
};

export function useSessionChat({
  sessionId,
  apiBase = "/api",
  onCanvasTree,
  onCanvasError,
}: UseSessionChatOptions) {
  const [chat, setChat] = useState<ChatState>(initialChatState);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef<Array<{ text: string; pathAttachments?: PathAttachment[] }>>([]);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const onCanvasTreeRef = useRef(onCanvasTree);
  const onCanvasErrorRef = useRef(onCanvasError);
  onCanvasTreeRef.current = onCanvasTree;
  onCanvasErrorRef.current = onCanvasError;

  const loadHistory = useCallback(
    async (id: string) => {
      try {
        const r = await fetch(`${apiBase}/sessions/${encodeURIComponent(id)}/chat`);
        if (!r.ok) return;
        const history = (await r.json()) as SessionChatHistory;
        if (!mountedRef.current) return;
        setChat((prev) => ({
          ...hydrateChatState(history),
          connection: prev.connection,
          phase: prev.phase === "running" ? "running" : "ready",
        }));
      } catch {
        /* ignore */
      }
    },
    [apiBase],
  );

  const dispatch = useCallback((msg: WsInbound) => {
    setChat((prev) => markRunningComplete(applyWsMessage(prev, msg)));
  }, []);

  const connect = useCallback(
    (id: string) => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      const existing = wsRef.current;
      if (existing) {
        existing.onclose = null;
        existing.close();
        wsRef.current = null;
      }

      setChat((prev) => ({
        ...prev,
        connection: "connecting",
        phase: prev.phase === "running" ? "running" : "connecting",
        error: null,
      }));

      const wsUrl = typeof window !== "undefined" ? `${wsBaseUrl()}?sessionId=${encodeURIComponent(id)}` : "";
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const postMessage = async (item: { text: string; pathAttachments?: PathAttachment[] }) => {
        if (!sessionId) return false;
        try {
          const response = await fetch(`${apiBase}/sessions/${encodeURIComponent(sessionId)}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: item.text,
              ...(item.pathAttachments?.length ? { pathAttachments: item.pathAttachments } : {}),
            }),
          });
          if (!response.ok) {
            const body = await response.text().catch(() => "unknown");
            throw new Error(`HTTP ${response.status}: ${body}`);
          }
          return true;
        } catch {
          return false;
        }
      };

      ws.onopen = () => {
        if (!mountedRef.current || wsRef.current !== ws) return;
        reconnectAttemptRef.current = 0;
        void fetch(`${apiBase}/sessions/${encodeURIComponent(id)}/render`, { method: "POST" }).catch(() => {
          /* ignore */
        });
        setChat((prev) => ({
          ...prev,
          connection: "connected",
          phase:
            prev.messages.some((m) => m.streaming) ||
            prev.activities.some((a) => a.status === "running")
              ? "running"
              : "ready",
          error: null,
        }));
        const pending = pendingRef.current;
        pendingRef.current = [];
        for (const item of pending) {
          void postMessage(item);
        }
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as WsInbound;
          if (msg.type === "canvas.tree") {
            onCanvasTreeRef.current?.(msg.spec);
            return;
          }
          if (msg.type === "canvas.error") {
            onCanvasErrorRef.current?.(msg.message);
            return;
          }
          dispatch(msg);
          if (msg.type === "chat.assistant.end" || msg.type === "activity.end") {
            setChat((prev) => {
              const stillRunning =
                prev.messages.some((m) => m.streaming) ||
                prev.activities.some((a) => a.status === "running");
              if (stillRunning) return prev;
              return { ...prev, phase: "ready" };
            });
          }
        } catch {
          /* ignore */
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setChat((prev) => ({ ...prev, connection: "disconnected", phase: "disconnected" }));
      };

      ws.onclose = () => {
        if (wsRef.current !== ws) return;
        wsRef.current = null;
        if (!mountedRef.current || !sessionId) return;
        setChat((prev) => ({
          ...prev,
          connection: "disconnected",
          phase: prev.phase === "running" ? "running" : "disconnected",
        }));
        const delay = Math.min(
          RECONNECT_MAX_MS,
          RECONNECT_BASE_MS * 2 ** reconnectAttemptRef.current,
        );
        reconnectAttemptRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current && sessionId) connect(id);
        }, delay);
      };
    },
    [dispatch, sessionId, apiBase],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      const ws = wsRef.current;
      if (ws) {
        ws.onclose = null;
        ws.close();
        wsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setChat(initialChatState());
      pendingRef.current = [];
      return;
    }
    pendingRef.current = [];
    void loadHistory(sessionId);
    connect(sessionId);
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      const ws = wsRef.current;
      if (ws) {
        ws.onclose = null;
        ws.close();
        wsRef.current = null;
      }
    };
  }, [sessionId, connect, loadHistory]);

  const browseFilesystem = useCallback(
    (partialPath: string): Promise<FilesystemBrowseResult> => {
      const url = `${apiBase}/fs/browse?${new URLSearchParams({ partialPath })}`;
      return fetch(url)
        .then(async (response) => {
          if (!response.ok) {
            const body = await response.text().catch(() => "unknown");
            throw new Error(`HTTP ${response.status}: ${body}`);
          }
          return response.json() as Promise<FilesystemBrowseResult>;
        })
        .catch((error) => {
          throw error instanceof Error ? error : new Error(String(error));
        });
    },
    [apiBase],
  );

  const sendMessage = useCallback(
    (text: string, pathAttachments?: PathAttachment[]) => {
      const trimmed = text.trim();
      const paths = pathAttachments ?? [];
      if (!sessionId || (trimmed.length === 0 && paths.length === 0)) return false;
      const item = { text: trimmed, pathAttachments: paths };
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        pendingRef.current.push(item);
        setChat((prev) => ({ ...prev, phase: "running" }));
        return false;
      }
      void fetch(`${apiBase}/sessions/${encodeURIComponent(sessionId)}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          ...(paths.length > 0 ? { pathAttachments: paths } : {}),
        }),
      }).catch(() => {
        // If the POST fails while the socket is up, re-queue for retry on reconnect.
        pendingRef.current.push(item);
      });
      setChat((prev) => ({ ...prev, phase: "running", error: null }));
      return true;
    },
    [apiBase, sessionId],
  );

  const phase: SessionPhase =
    chat.phase === "running" || chat.activities.some((a) => a.status === "running")
      ? "running"
      : chat.phase;

  const isRunning = phase === "running";

  return {
    messages: chat.messages,
    activities: chat.activities,
    phase,
    isRunning,
    error: chat.error,
    connection: chat.connection,
    sendMessage,
    browseFilesystem,
    reloadHistory: () => (sessionId ? loadHistory(sessionId) : Promise.resolve()),
  };
}
