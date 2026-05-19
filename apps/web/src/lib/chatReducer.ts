import type { WsInbound } from "@agent-plot/contracts";
import type { ChatState } from "../types.js";
import { initialChatState } from "../types.js";

export function applyWsMessage(state: ChatState, msg: WsInbound): ChatState {
  switch (msg.type) {
    case "chat.user": {
      const exists = state.messages.some((m) => m.id === msg.id);
      if (exists) return state;
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: msg.id, role: "user", text: msg.text, createdAt: msg.createdAt },
        ],
        phase: state.phase === "idle" ? "running" : state.phase,
      };
    }
    case "chat.assistant.start": {
      const exists = state.messages.some((m) => m.id === msg.id);
      if (exists) return { ...state, phase: "running" };
      return {
        ...state,
        phase: "running",
        messages: [
          ...state.messages,
          {
            id: msg.id,
            role: "assistant",
            text: "",
            createdAt: msg.createdAt,
            streaming: true,
          },
        ],
      };
    }
    case "chat.assistant.delta": {
      return {
        ...state,
        phase: "running",
        messages: state.messages.map((m) =>
          m.id === msg.id ? { ...m, text: m.text + msg.text, streaming: true } : m,
        ),
      };
    }
    case "chat.assistant.end": {
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === msg.id
            ? { ...m, streaming: false, completedAt: new Date().toISOString() }
            : m,
        ),
      };
    }
    case "chat.system": {
      const exists = state.messages.some((m) => m.id === msg.id);
      if (exists) return state;
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: msg.id, role: "system", text: msg.text, createdAt: msg.createdAt },
        ],
      };
    }
    case "activity.start": {
      const exists = state.activities.some((a) => a.id === msg.id);
      if (exists) return { ...state, phase: "running" };
      return {
        ...state,
        phase: "running",
        activities: [
          ...state.activities,
          { id: msg.id, label: msg.label, status: "running", createdAt: msg.createdAt },
        ],
      };
    }
    case "activity.end": {
      return {
        ...state,
        activities: state.activities.map((a) =>
          a.id === msg.id
            ? {
                ...a,
                detail: msg.detail ?? a.detail,
                status: msg.status ?? "done",
              }
            : a,
        ),
      };
    }
    case "error": {
      return {
        ...state,
        error: msg.message,
        phase: "error",
      };
    }
    case "tool.end": {
      return state;
    }
    case "chat.delta": {
      const lastAssistant = [...state.messages].reverse().find((m) => m.role === "assistant");
      if (lastAssistant?.streaming) {
        return {
          ...state,
          phase: "running",
          messages: state.messages.map((m) =>
            m.id === lastAssistant.id ? { ...m, text: m.text + msg.text } : m,
          ),
        };
      }
      return {
        ...state,
        phase: "running",
        messages: [
          ...state.messages,
          {
            id: `legacy-${state.messages.length}`,
            role: "assistant",
            text: msg.text,
            createdAt: new Date().toISOString(),
            streaming: true,
          },
        ],
      };
    }
    default:
      return state;
  }
}

export function hydrateChatState(
  history: { messages: ChatState["messages"]; activities: ChatState["activities"] },
): ChatState {
  return {
    ...initialChatState(),
    messages: history.messages,
    activities: history.activities,
    phase: "idle",
    connection: "disconnected",
  };
}

export function markRunningComplete(state: ChatState): ChatState {
  const hasRunningActivity = state.activities.some((a) => a.status === "running");
  if (hasRunningActivity) return state;
  return {
    ...state,
    phase: state.connection === "connected" ? "ready" : state.phase,
  };
}
