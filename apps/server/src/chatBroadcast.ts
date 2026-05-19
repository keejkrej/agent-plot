import { randomUUID } from "node:crypto";
import type {
  ActivitySnapshot,
  ChatMessageSnapshot,
  SessionChatHistory,
  WsInbound,
} from "@agent-plot/contracts";
import type { Session } from "./session.js";
import { readChatHistory, upsertActivity, upsertMessage, writeChatHistory } from "./chatHistory.js";

type SendFn = (sessionId: string, msg: WsInbound) => void;

let sendFn: SendFn = () => {};

export function setChatBroadcastSender(fn: SendFn): void {
  sendFn = fn;
}

async function persist(session: Session, history: SessionChatHistory): Promise<void> {
  await writeChatHistory(session, history);
}

async function emit(session: Session, msg: WsInbound, history?: SessionChatHistory): Promise<void> {
  sendFn(session.id, msg);
  if (history) await persist(session, history);
}

export async function broadcastChatUser(
  session: Session,
  text: string,
): Promise<{ userId: string; history: SessionChatHistory }> {
  const history = await readChatHistory(session);
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const msg: ChatMessageSnapshot = { id, role: "user", text, createdAt };
  const next = upsertMessage(history, msg);
  await emit(session, { type: "chat.user", id, text, createdAt }, next);
  return { userId: id, history: next };
}

export async function broadcastAssistantStart(
  session: Session,
  history: SessionChatHistory,
): Promise<{ assistantId: string; history: SessionChatHistory }> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const msg: ChatMessageSnapshot = { id, role: "assistant", text: "", createdAt, streaming: true };
  const next = upsertMessage(history, msg);
  await emit(session, { type: "chat.assistant.start", id, createdAt }, next);
  return { assistantId: id, history: next };
}

export async function broadcastAssistantDelta(
  session: Session,
  history: SessionChatHistory,
  assistantId: string,
  text: string,
): Promise<SessionChatHistory> {
  const existing = history.messages.find((m) => m.id === assistantId);
  if (!existing) return history;
  const nextMsg: ChatMessageSnapshot = {
    ...existing,
    text: existing.text + text,
    streaming: true,
  };
  const next = upsertMessage(history, nextMsg);
  await emit(session, { type: "chat.assistant.delta", id: assistantId, text }, next);
  return next;
}

export async function broadcastAssistantEnd(
  session: Session,
  history: SessionChatHistory,
  assistantId: string,
): Promise<SessionChatHistory> {
  const existing = history.messages.find((m) => m.id === assistantId);
  if (!existing) return history;
  const nextMsg: ChatMessageSnapshot = { ...existing, streaming: false };
  const next = upsertMessage(history, nextMsg);
  await emit(session, { type: "chat.assistant.end", id: assistantId }, next);
  return next;
}

export async function broadcastActivityStart(
  session: Session,
  history: SessionChatHistory,
  label: string,
): Promise<{ activityId: string; history: SessionChatHistory }> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const activity: ActivitySnapshot = { id, label, status: "running", createdAt };
  const next = upsertActivity(history, activity);
  await emit(session, { type: "activity.start", id, label, createdAt }, next);
  return { activityId: id, history: next };
}

export async function broadcastActivityEnd(
  session: Session,
  history: SessionChatHistory,
  activityId: string,
  opts?: { detail?: string; status?: "done" | "error" },
): Promise<SessionChatHistory> {
  const existing = history.activities.find((a) => a.id === activityId);
  if (!existing) return history;
  const activity: ActivitySnapshot = {
    ...existing,
    detail: opts?.detail ?? existing.detail,
    status: opts?.status ?? "done",
  };
  const next = upsertActivity(history, activity);
  const wsStatus = activity.status === "error" ? "error" : "done";
  await emit(
    session,
    { type: "activity.end", id: activityId, detail: activity.detail, status: wsStatus },
    next,
  );
  return next;
}

export async function broadcastSystemNote(
  session: Session,
  history: SessionChatHistory,
  text: string,
): Promise<SessionChatHistory> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const msg: ChatMessageSnapshot = { id, role: "system", text, createdAt };
  const next = upsertMessage(history, msg);
  await emit(session, { type: "chat.system", id, text, createdAt }, next);
  return next;
}
