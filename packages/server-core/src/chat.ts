import type { ChatMessageSnapshot, PathAttachment } from "@agent-plot/contracts";
import type { SessionStore } from "./store.js";

export type BroadcastOptions = {
  pathAttachments?: PathAttachment[];
};

export async function broadcastUser(
  store: SessionStore,
  sessionId: string,
  text: string,
  opts?: BroadcastOptions,
): Promise<ChatMessageSnapshot> {
  const paths = opts?.pathAttachments?.length ? opts.pathAttachments : undefined;
  const message = await store.addChatMessage(sessionId, {
    role: "user",
    text,
    createdAt: new Date().toISOString(),
    ...(paths ? { pathAttachments: paths } : {}),
  });
  return message;
}

export async function broadcastSystemNote(
  store: SessionStore,
  sessionId: string,
  text: string,
): Promise<ChatMessageSnapshot> {
  return store.addChatMessage(sessionId, {
    role: "system",
    text,
    createdAt: new Date().toISOString(),
  });
}

export async function broadcastActivityStart(
  store: SessionStore,
  sessionId: string,
  label: string,
  detail?: string,
): Promise<{ activityId: string }> {
  const activity = await store.addActivity(sessionId, {
    label,
    ...(detail ? { detail } : {}),
    status: "running",
    createdAt: new Date().toISOString(),
  });
  return { activityId: activity.id };
}

export async function broadcastActivityEnd(
  store: SessionStore,
  sessionId: string,
  activityId: string,
  opts?: { detail?: string; status?: "done" | "error" },
): Promise<void> {
  await store.endActivity(sessionId, activityId, opts);
}

export async function broadcastAssistantStart(
  store: SessionStore,
  sessionId: string,
): Promise<{ assistantId: string }> {
  const message = await store.addChatMessage(sessionId, {
    role: "assistant",
    text: "",
    createdAt: new Date().toISOString(),
    streaming: true,
  });
  return { assistantId: message.id };
}

export async function broadcastAssistantDelta(
  store: SessionStore,
  sessionId: string,
  assistantId: string,
  text: string,
): Promise<void> {
  const existing = await store.getChatMessage(sessionId, assistantId);
  if (!existing) return;
  await store.saveChatMessage(sessionId, {
    ...existing,
    text: existing.text + text,
    streaming: true,
  });
}

export async function broadcastAssistantEnd(
  store: SessionStore,
  sessionId: string,
  assistantId: string,
): Promise<void> {
  const existing = await store.getChatMessage(sessionId, assistantId);
  if (!existing) return;
  await store.saveChatMessage(sessionId, {
    ...existing,
    streaming: false,
    completedAt: new Date().toISOString(),
  });
}
