import { describeVisibility, type CanvasVisibility } from "./canvasIntent.js";
import { cursorAssistantReply, formatCursorAgentError, isCursorAgentConfigured } from "./cursorAgent.js";
import { describeTiff } from "./pythonRun.js";
import type { Session } from "./session.js";

type DescribeOk = {
  ok: true;
  path: string;
  shape: number[];
  dtype: string;
  min: number;
  max: number;
  p1: number;
  p99: number;
};

function isDescribeOk(v: unknown): v is DescribeOk {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    o.ok === true &&
    typeof o.path === "string" &&
    Array.isArray(o.shape) &&
    typeof o.dtype === "string" &&
    typeof o.min === "number" &&
    typeof o.max === "number" &&
    typeof o.p1 === "number" &&
    typeof o.p99 === "number"
  );
}

async function remoteAgent(url: string, sessionId: string, userText: string): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, text: userText }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) return `[agent] HTTP ${res.status} ${res.statusText}`;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const body = (await res.json()) as unknown;
    if (typeof body === "string") return body;
    if (body && typeof body === "object") {
      const o = body as Record<string, unknown>;
      if (typeof o.reply === "string") return o.reply;
      if (typeof o.text === "string") return o.text;
      if (typeof o.message === "string") return o.message;
    }
    return JSON.stringify(body);
  }
  return (await res.text()).trim();
}

async function stubAssistantReply(
  sessionDir: string,
  userText: string,
  visibility: CanvasVisibility,
): Promise<string> {
  const visNote = describeVisibility(visibility);
  const d = await describeTiff(sessionDir);
  if (d.ok && isDescribeOk(d.data)) {
    const m = d.data;
    return [
      `Assistant (stub): ${m.path} — shape [${m.shape.join("×")}], dtype ${m.dtype}.`,
      `Value range about ${m.min.toFixed(3)}–${m.max.toFixed(3)} (p1–p99: ${m.p1.toFixed(3)}–${m.p99.toFixed(3)}).`,
      "",
      visNote,
      "",
      `Your message: ${userText.slice(0, 800)}${userText.length > 800 ? "…" : ""}`,
    ].join("\n");
  }

  return [
    "Assistant (stub): no TIFF in this session yet, or describe failed.",
    d.ok ? "" : `(${d.stderr})`,
    "",
    visNote,
    "",
    `Your message: ${userText.slice(0, 400)}${userText.length > 400 ? "…" : ""}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export type AssistantSink = {
  onDelta?: (text: string) => void;
};

/**
 * Chat backend priority:
 * 1. `CURSOR_API_KEY` — Cursor SDK local agent (`@cursor/sdk`) with cwd = session dir
 * 2. `AGENT_PLOT_AGENT_URL` — custom HTTP agent
 * 3. Local stub (`describe_tiff` + visibility note)
 */
export async function assistantReply(
  session: Session,
  sessionDir: string,
  userText: string,
  visibility: CanvasVisibility,
  sink?: AssistantSink,
): Promise<string> {
  if (isCursorAgentConfigured()) {
    try {
      return await cursorAssistantReply(session, sessionDir, userText, visibility, sink?.onDelta);
    } catch (e) {
      const msg = formatCursorAgentError(e);
      sink?.onDelta?.(msg);
      return msg;
    }
  }

  const url = process.env.AGENT_PLOT_AGENT_URL?.trim();
  if (url) {
    try {
      const reply = await remoteAgent(url, session.id, userText);
      sink?.onDelta?.(reply);
      return reply;
    } catch (e) {
      const msg = `[agent] ${e instanceof Error ? e.message : String(e)}`;
      sink?.onDelta?.(msg);
      return msg;
    }
  }

  const reply = await stubAssistantReply(sessionDir, userText, visibility);
  sink?.onDelta?.(reply);
  return reply;
}
