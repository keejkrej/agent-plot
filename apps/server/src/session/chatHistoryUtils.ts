import type { ActivitySnapshot, ChatMessageSnapshot, SessionChatHistory } from "@agent-plot/contracts";

export function upsertMessage(
  history: SessionChatHistory,
  msg: ChatMessageSnapshot,
): SessionChatHistory {
  const idx = history.messages.findIndex((m) => m.id === msg.id);
  const messages =
    idx >= 0
      ? history.messages.map((m, i) => (i === idx ? msg : m))
      : [...history.messages, msg];
  return { ...history, messages };
}

export function upsertActivity(
  history: SessionChatHistory,
  activity: ActivitySnapshot,
): SessionChatHistory {
  const idx = history.activities.findIndex((a) => a.id === activity.id);
  const activities =
    idx >= 0
      ? history.activities.map((a, i) => (i === idx ? activity : a))
      : [...history.activities, activity];
  return { ...history, activities };
}
