import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ActivitySnapshot, ChatMessageSnapshot, SessionChatHistory } from "@agent-plot/contracts";
import type { Session } from "./session.js";

const CHAT_FILE = "chat-history.json";

export async function readChatHistory(session: Session): Promise<SessionChatHistory> {
  try {
    const raw = await readFile(path.join(session.dir, CHAT_FILE), "utf-8");
    const parsed = JSON.parse(raw) as SessionChatHistory;
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      activities: Array.isArray(parsed.activities) ? parsed.activities : [],
    };
  } catch {
    return { messages: [], activities: [] };
  }
}

export async function writeChatHistory(session: Session, history: SessionChatHistory): Promise<void> {
  await writeFile(path.join(session.dir, CHAT_FILE), JSON.stringify(history, null, 2), "utf-8");
}

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
