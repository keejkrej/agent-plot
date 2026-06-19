import { broadcast } from "@agent-plot/ws-hub";
import type { PathAttachment, WsInbound } from "@agent-plot/contracts";
import {
  broadcastActivityStart,
  broadcastUser,
  buildAgentMessageText,
  getDefaultStore,
  mergeCanvasVisibility,
  parseCanvasIntentDelta,
} from "@agent-plot/server-core";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getDefaultStore();
  const session = await store.getSession(id);
  if (!session) {
    return Response.json({ error: "session not found" }, { status: 404 });
  }
  const history = await store.readChatHistory(id);
  return Response.json(history);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getDefaultStore();
  const session = await store.getSession(id);
  if (!session) {
    return Response.json({ error: "session not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const text = typeof b.text === "string" ? b.text.trim() : "";
  const pathAttachments = Array.isArray(b.pathAttachments) ? (b.pathAttachments as PathAttachment[]) : undefined;
  if (!text && !(pathAttachments && pathAttachments.length > 0)) {
    return Response.json({ error: "empty message" }, { status: 400 });
  }

  const agentText = buildAgentMessageText(text, pathAttachments);

  const prevVisibility = await store.readCanvasVisibility(id);
  const visibility = mergeCanvasVisibility(prevVisibility, parseCanvasIntentDelta(agentText));
  await store.writeCanvasVisibility(id, visibility);

  const userMessage = await broadcastUser(store, id, text, { pathAttachments });
  await broadcast(id, {
    type: "chat.user",
    id: userMessage.id,
    text,
    ...(pathAttachments?.length ? { pathAttachments } : {}),
    createdAt: userMessage.createdAt,
  });

  const { activityId: analyzeId } = await broadcastActivityStart(store, id, "Analyzing data");
  await broadcast(id, {
    type: "activity.start",
    id: analyzeId,
    label: "Analyzing data",
    createdAt: new Date().toISOString(),
  });

  await store.createAssistantTurnJob(id, {
    text,
    pathAttachments,
    analyzeId,
  });

  return Response.json({ ok: true, job: "enqueued" }, { status: 202 });
}
