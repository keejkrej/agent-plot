import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import type * as PlatformError from "effect/PlatformError";
import * as Ref from "effect/Ref";

import { describeVisibility, type CanvasVisibility } from "../../canvasIntent.ts";
import {
  cursorAssistantReply,
  formatCursorAgentError,
  isCursorAgentConfigured,
} from "../../cursorAgent.ts";
import { SessionChat } from "../../session/Services/SessionChat.ts";
import { SessionStore } from "../../session/Services/SessionStore.ts";
import {
  AgentRunner,
  AgentRunnerError,
  type AgentAssistantTurnInput,
  type AgentAssistantTurnResult,
} from "../Services/AgentRunner.ts";

function stubAssistantReply(userText: string, visibility: CanvasVisibility): string {
  const visNote = describeVisibility(visibility);
  return [
    "Assistant (stub): set CURSOR_API_KEY to run the Cursor agent.",
    "Tell the agent where your data lives (paths to .tif, .h5, .csv, .npy, etc.); it inspects contents and runs analysis scripts when appropriate.",
    "",
    visNote,
    "",
    `Your message: ${userText.slice(0, 400)}${userText.length > 400 ? "…" : ""}`,
  ].join("\n");
}

async function remoteAgent(url: string, sessionId: string, userText: string): Promise<string> {
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
}

const formatAgentError = (error: unknown): string =>
  error instanceof AgentRunnerError
    ? error.message
    : error instanceof Error
      ? error.message
      : String(error);

const mapChatError = (error: PlatformError.PlatformError) =>
  new AgentRunnerError({ message: String(error), cause: error });

const makeAgentRunner = Effect.gen(function* () {
  const sessionStore = yield* SessionStore;
  const sessionChat = yield* SessionChat;

  const runAssistantTurn = Effect.fn("agentRunner.runAssistantTurn")(function* (
    input: AgentAssistantTurnInput,
  ) {
    const historyRef = yield* Ref.make(input.history);
    const streamedRef = yield* Ref.make(false);

    const emitDelta = (chunk: string) =>
      Ref.get(historyRef).pipe(
        Effect.flatMap((history) =>
          sessionChat.broadcastAssistantDelta(
            input.session,
            history,
            input.assistantId,
            chunk,
          ),
        ),
        Effect.tap((next) => Ref.set(historyRef, next)),
        Effect.tap(() => Ref.set(streamedRef, true)),
        Effect.mapError(mapChatError),
      );

    const runBackend = Effect.gen(function* () {
      if (isCursorAgentConfigured()) {
        yield* Effect.tryPromise({
          try: () =>
            cursorAssistantReply(
              input.session,
              input.session.dir,
              input.agentText,
              input.visibility,
              {
                readAgentId: (session) =>
                  Effect.runPromise(
                    sessionStore.readSessionAgentId(session).pipe(
                      Effect.map((id) => Option.getOrNull(id) ?? undefined),
                    ),
                  ),
                writeAgentId: (session, agentId) =>
                  Effect.runPromise(sessionStore.writeSessionAgentId(session, agentId)),
              },
              (chunk) => {
                void Effect.runPromise(emitDelta(chunk));
              },
            ),
          catch: (cause) =>
            new AgentRunnerError({
              message: formatCursorAgentError(cause),
              cause,
            }),
        });
        return;
      }

      const url = process.env.AGENT_PLOT_AGENT_URL?.trim();
      if (url) {
        const reply = yield* Effect.tryPromise({
          try: () => remoteAgent(url, input.session.id, input.agentText),
          catch: (cause) =>
            new AgentRunnerError({
              message: cause instanceof Error ? cause.message : String(cause),
              cause,
            }),
        });
        yield* emitDelta(reply);
        return;
      }

      yield* emitDelta(stubAssistantReply(input.agentText, input.visibility));
    });

    yield* runBackend.pipe(
      Effect.catch((error) => emitDelta(formatAgentError(error))),
    );

    return {
      history: yield* Ref.get(historyRef),
      streamed: yield* Ref.get(streamedRef),
    } satisfies AgentAssistantTurnResult;
  });

  return AgentRunner.of({ runAssistantTurn });
});

export const layer = Layer.effect(AgentRunner, makeAgentRunner);
