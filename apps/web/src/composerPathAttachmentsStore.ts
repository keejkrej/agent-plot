import type { PathAttachment } from "@agent-plot/contracts";
import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "agent-plot:composer-paths:";

function storageKey(sessionId: string | null): string {
  return `${STORAGE_PREFIX}${sessionId ?? "none"}`;
}

export function useComposerPathAttachments(sessionId: string | null) {
  const [attachments, setAttachments] = useState<PathAttachment[]>([]);

  useEffect(() => {
    if (!sessionId) {
      setAttachments([]);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey(sessionId));
      if (!raw) {
        setAttachments([]);
        return;
      }
      const parsed = JSON.parse(raw) as PathAttachment[];
      setAttachments(Array.isArray(parsed) ? parsed : []);
    } catch {
      setAttachments([]);
    }
  }, [sessionId]);

  const persist = useCallback(
    (next: PathAttachment[]) => {
      if (!sessionId) return;
      try {
        if (next.length > 0) {
          localStorage.setItem(storageKey(sessionId), JSON.stringify(next));
        } else {
          localStorage.removeItem(storageKey(sessionId));
        }
      } catch {
        /* ignore */
      }
    },
    [sessionId],
  );

  const addAttachment = useCallback(
    (attachment: PathAttachment) => {
      setAttachments((prev) => {
        if (prev.some((a) => a.path === attachment.path && a.kind === attachment.kind)) {
          return prev;
        }
        const next = [...prev, attachment];
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const removeAttachment = useCallback(
    (id: string) => {
      setAttachments((prev) => {
        const next = prev.filter((a) => a.id !== id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clearAttachments = useCallback(() => {
    setAttachments([]);
    if (!sessionId) return;
    try {
      localStorage.removeItem(storageKey(sessionId));
    } catch {
      /* ignore */
    }
  }, [sessionId]);

  return { attachments, addAttachment, removeAttachment, clearAttachments };
}
