import type { PathAttachment, WsInbound } from "@agent-plot/contracts";
import { broadcast } from "@agent-plot/ws-hub";
import {
  broadcastActivityEnd,
  broadcastActivityStart,
  broadcastAssistantDelta,
  broadcastAssistantEnd,
  broadcastAssistantStart,
  broadcastSystemNote,
  buildAgentMessageText,
  cursorAssistantReply,
  defaultCanvasVisibility,
  describeVisibility,
  formatCursorAgentError,
  getDefaultStore,
  isCursorAgentConfigured,
  mergeCanvasVisibility,
  parseCanvasIntentDelta,
  refreshSessionCanvas,
  type Session,
} from "@agent-plot/server-core";

const POLL_INTERVAL_MS = Number(process.env.AGENT_PLOT_WORKER_POLL_MS ?? "1000");
const store = getDefaultStore();

const remoteAgent = async (url: string, sessionId: string, userText: string): Promise<string> => {
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
};

async function emitDelta(
  sessionId: string,
  assistantId: string,
  chunk: string,
  send: (msg: WsInbound) => Promise<void>,
) {
  await broadcastAssistantDelta(store, sessionId, assistantId, chunk);
  await send({ type: "chat.assistant.delta", id: assistantId, text: chunk });
}

async function runAssistantTurn(
  session: Session,
  agentText: string,
  visibility: ReturnType<typeof defaultCanvasVisibility>,
  send: (msg: WsInbound) => Promise<void>,
) {
  const { assistantId } = await broadcastAssistantStart(store, session.id);
  await send({ type: "chat.assistant.start", id: assistantId, createdAt: new Date().toISOString() });

  try {
    if (isCursorAgentConfigured()) {
      await cursorAssistantReply(
        session,
        session.dir,
        agentText,
        visibility,
        {
          readAgentId: async () => store.readSessionAgentId(session.id) ?? undefined,
          writeAgentId: async (_session, agentId) => store.writeSessionAgentId(session.id, agentId),
        },
        (chunk) => void emitDelta(session.id, assistantId, chunk, send).catch(() => {}),
      );
    } else {
      const url = process.env.AGENT_PLOT_AGENT_URL?.trim();
      const reply = url
        ? await remoteAgent(url, session.id, agentText)
        : [
            "Assistant (stub): set CURSOR_API_KEY to run the Cursor agent.",
            "Tell the agent where your data lives (paths to .tif, .h5, .csv, .npy, etc.); it inspects contents and runs analysis scripts when appropriate.",
            "",
            describeVisibility(visibility),
            "",
            `Your message: ${agentText.slice(0, 400)}${agentText.length > 400 ? "…" : ""}`,
          ].join("\n");
      await emitDelta(session.id, assistantId, reply, send);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await emitDelta(session.id, assistantId, `[agent error] ${message}`, send);
  }

  await broadcastAssistantEnd(store, session.id, assistantId);
  await send({ type: "chat.assistant.end", id: assistantId });
}

async function refreshCanvas(
  sessionId: string,
  send: (msg: WsInbound) => Promise<void>,
  intentChanged = false,
) {
  const { activityId: canvasId } = await broadcastActivityStart(store, sessionId, "Refreshing canvas");
  await send({ type: "activity.start", id: canvasId, label: "Refreshing canvas", createdAt: new Date().toISOString() });
  const refreshed = await refreshSessionCanvas(store, sessionId);

  if (refreshed.artifactNote) {
    const note = await broadcastSystemNote(store, sessionId, refreshed.artifactNote.trim());
    await send({ type: "chat.system", id: note.id, text: note.text, createdAt: note.createdAt });
  }

  if (refreshed.ok) {
    await send({ type: "canvas.tree", spec: refreshed.spec });
    await broadcastActivityEnd(store, sessionId, canvasId, { detail: "Canvas updated", status: "done" });
    await send({ type: "activity.end", id: canvasId, detail: "Canvas updated", status: "done" });
    await send({ type: "tool.end", name: "json_render" });
  } else if (refreshed.error) {
    await send({ type: "canvas.error", message: refreshed.error });
    await broadcastActivityEnd(store, sessionId, canvasId, { detail: refreshed.error, status: "error" });
    await send({ type: "activity.end", id: canvasId, detail: refreshed.error, status: "error" });
    const note = await broadcastSystemNote(store, sessionId, `Error: ${refreshed.error}`);
    await send({ type: "chat.system", id: note.id, text: note.text, createdAt: note.createdAt });
  } else if (intentChanged) {
    await broadcastActivityEnd(store, sessionId, canvasId, { detail: "Preferences saved", status: "done" });
    await send({ type: "activity.end", id: canvasId, detail: "Preferences saved", status: "done" });
    const note = await broadcastSystemNote(
      store,
      sessionId,
      "Canvas preferences saved. Point the agent at your data path and ask it to build previews when you want the canvas filled in.",
    );
    await send({ type: "chat.system", id: note.id, text: note.text, createdAt: note.createdAt });
  } else {
    await broadcastActivityEnd(store, sessionId, canvasId, { status: "done" });
    await send({ type: "activity.end", id: canvasId, status: "done" });
  }
}

async function processAssistantTurnJob(
  jobId: string,
  sessionId: string,
  payload: Record<string, unknown>,
) {
  const session = await store.getSession(sessionId);
  if (!session) {
    await store.completeJob(jobId, "session not found");
    return;
  }

  const text = typeof payload.text === "string" ? payload.text : "";
  const pathAttachments = Array.isArray(payload.pathAttachments)
    ? (payload.pathAttachments as PathAttachment[])
    : undefined;
  const agentText = buildAgentMessageText(text, pathAttachments);
  const analyzeId = typeof payload.analyzeId === "string" ? payload.analyzeId : undefined;

  // Visibility was already updated by the HTTP route that enqueued the job.
  const visibility = await store.readCanvasVisibility(sessionId);

  const send = async (msg: WsInbound) => broadcast(sessionId, msg);

  await runAssistantTurn(session, agentText, visibility, send);

  if (analyzeId) {
    await broadcastActivityEnd(store, sessionId, analyzeId, { status: "done" });
    await send({ type: "activity.end", id: analyzeId, status: "done" });
  }

  const intentDelta = parseCanvasIntentDelta(agentText);
  await refreshCanvas(sessionId, send, Object.keys(intentDelta).length > 0);

  await store.completeJob(jobId);
}

async function processNextJob(): Promise<boolean> {
  const job = await store.claimNextPendingJob();
  if (!job) return false;
  try {
    if (job.type === "assistant-turn") {
      await processAssistantTurnJob(job.id, job.sessionId, job.payload);
    } else {
      await store.completeJob(job.id, `unknown job type: ${job.type}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await store.completeJob(job.id, message);
  }
  return true;
}

async function loop() {
  while (true) {
    const ran = await processNextJob();
    if (!ran) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}

loop().catch((error) => {
  console.error("worker loop failed", error);
  process.exit(1);
});
