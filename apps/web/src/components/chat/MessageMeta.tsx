import { useEffect, useRef } from "react";
import { formatElapsed } from "@/session-logic.js";

function formatShortTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatMessageMeta(createdAt: string, elapsed: string | null): string {
  const time = formatShortTime(createdAt);
  if (!elapsed) return time;
  return `${time} • ${elapsed}`;
}

/** Live timestamp + elapsed duration while an assistant message streams (t3-style). */
export function LiveMessageMeta({
  createdAt,
  durationStart,
}: {
  createdAt: string;
  durationStart: string | null | undefined;
}) {
  const textRef = useRef<HTMLSpanElement>(null);
  const initialText = formatMessageMeta(
    createdAt,
    durationStart ? formatElapsed(durationStart, new Date().toISOString()) : null,
  );

  useEffect(() => {
    const update = () => {
      if (!textRef.current) return;
      textRef.current.textContent = formatMessageMeta(
        createdAt,
        durationStart ? formatElapsed(durationStart, new Date().toISOString()) : null,
      );
    };
    update();
    if (!durationStart) return;
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [createdAt, durationStart]);

  return <span ref={textRef}>{initialText}</span>;
}
