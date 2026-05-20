import type { SessionChatHistory } from "@agent-plot/contracts";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type * as Option from "effect/Option";
import type * as PlatformError from "effect/PlatformError";

import type { CanvasVisibility } from "../../canvasIntent.ts";

export type Session = {
  readonly id: string;
  readonly dir: string;
};

export type SessionMeta = {
  readonly title?: string;
  readonly archivedAt: string | null;
};

export type SessionListEntry = {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
};

type StoreError = PlatformError.PlatformError;

export interface SessionStoreShape {
  readonly sessionsRoot: Effect.Effect<string, never>;
  readonly createSession: Effect.Effect<Session, StoreError>;
  readonly getSession: (id: string) => Effect.Effect<Option.Option<Session>, StoreError>;
  readonly listSessions: (options?: {
    readonly archived?: boolean;
  }) => Effect.Effect<readonly SessionListEntry[], StoreError>;
  readonly archiveSession: (id: string) => Effect.Effect<Option.Option<Session>, StoreError>;
  readonly unarchiveSession: (id: string) => Effect.Effect<Option.Option<Session>, StoreError>;
  readonly saveUpload: (
    session: Session,
    buffer: Uint8Array,
    originalName: string,
  ) => Effect.Effect<void, StoreError>;
  readonly readCanvasTemplate: (session: Session) => Effect.Effect<string, StoreError>;
  readonly writeCanvasTemplate: (session: Session, json: string) => Effect.Effect<void, StoreError>;
  readonly readCanvasVisibility: (session: Session) => Effect.Effect<CanvasVisibility, StoreError>;
  readonly writeCanvasVisibility: (
    session: Session,
    visibility: CanvasVisibility,
  ) => Effect.Effect<void, StoreError>;
  readonly readSessionAgentId: (
    session: Session,
  ) => Effect.Effect<Option.Option<string>, StoreError>;
  readonly writeSessionAgentId: (session: Session, agentId: string) => Effect.Effect<void, StoreError>;
  readonly readChatHistory: (session: Session) => Effect.Effect<SessionChatHistory, StoreError>;
  readonly writeChatHistory: (
    session: Session,
    history: SessionChatHistory,
  ) => Effect.Effect<void, StoreError>;
  readonly sessionArtifactsReady: (session: Session) => Effect.Effect<boolean, StoreError>;
}

export class SessionStore extends Context.Service<SessionStore, SessionStoreShape>()(
  "agent-plot/server/SessionStore",
) {}
