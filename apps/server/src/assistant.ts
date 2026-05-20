import { describeVisibility, type CanvasVisibility } from "./canvasIntent.js";
import { cursorAssistantReply, formatCursorAgentError, isCursorAgentConfigured } from "./cursorAgent.js";
import type { Session } from "./session.js";

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

function stubAssistantReply(userText: string, visibility: CanvasVisibility): string {
  const visNote = describeVisibility(visibility);
  return [
    "Assistant (stub): set CURSOR_API_KEY to run the Cursor agent.",
    "Tell the agent where your data lives (paths to .tif, .h5, .csv, .npy, etc.); it inspects contents and runs analysis scripts when appropriate.",
    "",
    visNote,
    "",
    `Your message: ${userText.slice(0, 400)}${userText.length > 400 ? "…" : ""}`,
  ].join("\n");
}

export type AssistantSink = {
  onDelta?: (text: string) => void;
};

/**
 * Chat backend priority:
 * 1. `CURSOR_API_KEY` — Cursor SDK local agent (`@cursor/sdk`) with repo cwd + session workspace
 * 2. `AGENT_PLOT_AGENT_URL` — custom HTTP agent
 * 3. Local stub (configuration hint only)
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

  const reply = stubAssistantReply(userText, visibility);
  sink?.onDelta?.(reply);
  return reply;
}
