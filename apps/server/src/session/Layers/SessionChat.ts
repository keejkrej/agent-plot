import { randomUUID } from "node:crypto";
import type {
  ActivitySnapshot,
  ChatMessageSnapshot,
  PathAttachment,
  SessionChatHistory,
  WsInbound,
} from "@agent-plot/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { WsHub } from "../../wsHub.ts";
import { upsertActivity, upsertMessage } from "../chatHistoryUtils.ts";
import { SessionChat } from "../Services/SessionChat.ts";
import { SessionStore, type Session } from "../Services/SessionStore.ts";

const makeSessionChat = Effect.gen(function* () {
  const sessionStore = yield* SessionStore;
  const wsHub = yield* WsHub;

  const emit = Effect.fn("sessionChat.emit")(function* (
    session: Session,
    msg: WsInbound,
    history?: SessionChatHistory,
  ) {
    yield* wsHub.broadcast(session.id, msg);
    if (history !== undefined) {
      yield* sessionStore.writeChatHistory(session, history);
    }
  });

  const broadcastUser = Effect.fn("sessionChat.broadcastUser")(function* (
    session: Session,
    text: string,
    pathAttachments?: PathAttachment[],
  ) {
    const history = yield* sessionStore.readChatHistory(session);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const paths = pathAttachments?.length ? pathAttachments : undefined;
    const msg: ChatMessageSnapshot = {
      id,
      role: "user",
      text,
      ...(paths ? { pathAttachments: paths } : {}),
      createdAt,
    };
    const next = upsertMessage(history, msg);
    yield* emit(
      session,
      {
        type: "chat.user",
        id,
        text,
        ...(paths ? { pathAttachments: paths } : {}),
        createdAt,
      },
      next,
    );
    return { userId: id, history: next };
  });

  const broadcastAssistantStart = Effect.fn("sessionChat.broadcastAssistantStart")(function* (
    session: Session,
    history: SessionChatHistory,
  ) {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const msg: ChatMessageSnapshot = {
      id,
      role: "assistant",
      text: "",
      createdAt,
      streaming: true,
    };
    const next = upsertMessage(history, msg);
    yield* emit(session, { type: "chat.assistant.start", id, createdAt }, next);
    return { assistantId: id, history: next };
  });

  const broadcastAssistantDelta = Effect.fn("sessionChat.broadcastAssistantDelta")(function* (
    session: Session,
    history: SessionChatHistory,
    assistantId: string,
    text: string,
  ) {
    const existing = history.messages.find((m) => m.id === assistantId);
    if (!existing) return history;
    const nextMsg: ChatMessageSnapshot = {
      ...existing,
      text: existing.text + text,
      streaming: true,
    };
    const next = upsertMessage(history, nextMsg);
    yield* emit(session, { type: "chat.assistant.delta", id: assistantId, text }, next);
    return next;
  });

  const broadcastAssistantEnd = Effect.fn("sessionChat.broadcastAssistantEnd")(function* (
    session: Session,
    history: SessionChatHistory,
    assistantId: string,
  ) {
    const existing = history.messages.find((m) => m.id === assistantId);
    if (!existing) return history;
    const nextMsg: ChatMessageSnapshot = {
      ...existing,
      streaming: false,
      completedAt: new Date().toISOString(),
    };
    const next = upsertMessage(history, nextMsg);
    yield* emit(session, { type: "chat.assistant.end", id: assistantId }, next);
    return next;
  });

  const broadcastActivityStart = Effect.fn("sessionChat.broadcastActivityStart")(function* (
    session: Session,
    history: SessionChatHistory,
    label: string,
  ) {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const activity: ActivitySnapshot = { id, label, status: "running", createdAt };
    const next = upsertActivity(history, activity);
    yield* emit(session, { type: "activity.start", id, label, createdAt }, next);
    return { activityId: id, history: next };
  });

  const broadcastActivityEnd = Effect.fn("sessionChat.broadcastActivityEnd")(function* (
    session: Session,
    history: SessionChatHistory,
    activityId: string,
    opts?: { readonly detail?: string; readonly status?: "done" | "error" },
  ) {
    const existing = history.activities.find((a) => a.id === activityId);
    if (!existing) return history;
    const detail = opts?.detail ?? existing.detail;
    const activity: ActivitySnapshot = {
      ...existing,
      status: opts?.status ?? "done",
      ...(detail !== undefined ? { detail } : {}),
    };
    const next = upsertActivity(history, activity);
    const wsStatus = activity.status === "error" ? "error" : "done";
    yield* emit(
      session,
      {
        type: "activity.end",
        id: activityId,
        status: wsStatus,
        ...(detail !== undefined ? { detail } : {}),
      },
      next,
    );
    return next;
  });

  const broadcastSystemNote = Effect.fn("sessionChat.broadcastSystemNote")(function* (
    session: Session,
    history: SessionChatHistory,
    text: string,
  ) {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const msg: ChatMessageSnapshot = { id, role: "system", text, createdAt };
    const next = upsertMessage(history, msg);
    yield* emit(session, { type: "chat.system", id, text, createdAt }, next);
    return next;
  });

  return SessionChat.of({
    broadcastUser,
    broadcastAssistantStart,
    broadcastAssistantDelta,
    broadcastAssistantEnd,
    broadcastActivityStart,
    broadcastActivityEnd,
    broadcastSystemNote,
    emit,
  });
});

export const layer = Layer.effect(SessionChat, makeSessionChat);
