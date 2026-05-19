import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_PREFIX = "agent-plot:composer:";

function storageKey(sessionId: string | null): string {
  return `${STORAGE_PREFIX}${sessionId ?? "none"}`;
}

export function useComposerThreadDraft(sessionId: string | null) {
  const [prompt, setPromptState] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setPromptState("");
      return;
    }
    try {
      const saved = localStorage.getItem(storageKey(sessionId));
      setPromptState(saved ?? "");
    } catch {
      setPromptState("");
    }
  }, [sessionId]);

  const setPrompt = useCallback(
    (value: string) => {
      setPromptState(value);
      if (!sessionId) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          if (value.trim()) {
            localStorage.setItem(storageKey(sessionId), value);
          } else {
            localStorage.removeItem(storageKey(sessionId));
          }
        } catch {
          /* ignore */
        }
      }, 300);
    },
    [sessionId],
  );

  const clearPrompt = useCallback(() => {
    setPromptState("");
    if (!sessionId) return;
    try {
      localStorage.removeItem(storageKey(sessionId));
    } catch {
      /* ignore */
    }
  }, [sessionId]);

  useEffect(() => {
    const flush = () => {
      if (!sessionId) return;
      try {
        if (prompt.trim()) {
          localStorage.setItem(storageKey(sessionId), prompt);
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, [sessionId, prompt]);

  return { prompt, setPrompt, clearPrompt };
}

/** @deprecated alias — prefer `useComposerThreadDraft` */
export const useComposerDraft = useComposerThreadDraft;
