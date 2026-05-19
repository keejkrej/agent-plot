import type { ActivitySnapshot, ChatMessageSnapshot } from "@agent-plot/contracts";

export type ChatMessage = ChatMessageSnapshot;
export type ActivityEntry = ActivitySnapshot;

export type SessionPhase = "idle" | "connecting" | "ready" | "running" | "disconnected" | "error";

export type ChatState = {
  messages: ChatMessage[];
  activities: ActivityEntry[];
  phase: SessionPhase;
  error: string | null;
  connection: "connected" | "connecting" | "disconnected";
};

export const initialChatState = (): ChatState => ({
  messages: [],
  activities: [],
  phase: "idle",
  error: null,
  connection: "disconnected",
});
