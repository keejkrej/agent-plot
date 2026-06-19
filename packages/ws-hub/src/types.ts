import type { WsInbound } from "@agent-plot/contracts";

export type HubMessage = WsInbound;

export type HubClient = {
  sessionId: string;
  send: (message: string) => void;
  close: () => void;
};
