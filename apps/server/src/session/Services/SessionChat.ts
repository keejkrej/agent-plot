import type {
  PathAttachment,
  SessionChatHistory,
  WsInbound,
} from "@agent-plot/contracts";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type * as PlatformError from "effect/PlatformError";

import type { Session } from "./SessionStore.ts";

type ChatError = PlatformError.PlatformError;

export interface SessionChatShape {
  readonly broadcastUser: (
    session: Session,
    text: string,
    pathAttachments?: PathAttachment[],
  ) => Effect.Effect<{ readonly userId: string; readonly history: SessionChatHistory }, ChatError>;
  readonly broadcastAssistantStart: (
    session: Session,
    history: SessionChatHistory,
  ) => Effect.Effect<{ readonly assistantId: string; readonly history: SessionChatHistory }, ChatError>;
  readonly broadcastAssistantDelta: (
    session: Session,
    history: SessionChatHistory,
    assistantId: string,
    text: string,
  ) => Effect.Effect<SessionChatHistory, ChatError>;
  readonly broadcastAssistantEnd: (
    session: Session,
    history: SessionChatHistory,
    assistantId: string,
  ) => Effect.Effect<SessionChatHistory, ChatError>;
  readonly broadcastActivityStart: (
    session: Session,
    history: SessionChatHistory,
    label: string,
  ) => Effect.Effect<{ readonly activityId: string; readonly history: SessionChatHistory }, ChatError>;
  readonly broadcastActivityEnd: (
    session: Session,
    history: SessionChatHistory,
    activityId: string,
    opts?: { readonly detail?: string; readonly status?: "done" | "error" },
  ) => Effect.Effect<SessionChatHistory, ChatError>;
  readonly broadcastSystemNote: (
    session: Session,
    history: SessionChatHistory,
    text: string,
  ) => Effect.Effect<SessionChatHistory, ChatError>;
  readonly emit: (
    session: Session,
    msg: WsInbound,
    history?: SessionChatHistory,
  ) => Effect.Effect<void, ChatError>;
}

export class SessionChat extends Context.Service<SessionChat, SessionChatShape>()(
  "agent-plot/server/SessionChat",
) {}
