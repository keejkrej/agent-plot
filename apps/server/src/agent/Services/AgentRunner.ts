import type { SessionChatHistory } from "@agent-plot/contracts";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import type * as Effect from "effect/Effect";

import type { CanvasVisibility } from "../../canvasIntent.ts";
import type { Session } from "../../session/Services/SessionStore.ts";

export class AgentRunnerError extends Data.TaggedError("AgentRunnerError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export interface AgentAssistantTurnInput {
  readonly session: Session;
  readonly history: SessionChatHistory;
  readonly assistantId: string;
  readonly agentText: string;
  readonly visibility: CanvasVisibility;
}

export interface AgentAssistantTurnResult {
  readonly history: SessionChatHistory;
  readonly streamed: boolean;
}

export interface AgentRunnerShape {
  readonly runAssistantTurn: (
    input: AgentAssistantTurnInput,
  ) => Effect.Effect<AgentAssistantTurnResult, AgentRunnerError>;
}

export class AgentRunner extends Context.Service<AgentRunner, AgentRunnerShape>()(
  "agent-plot/server/AgentRunner",
) {}
