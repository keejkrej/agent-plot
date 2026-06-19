import type { WsInbound } from "@agent-plot/contracts";

export type BroadcastClientOptions = {
  hubUrl?: string;
};

function hubUrl(): string {
  return (
    process.env.AGENT_PLOT_WS_HUB_URL?.replace(/\/$/, "") ??
    `http://127.0.0.1:${process.env.AGENT_PLOT_WS_HUB_PORT ?? "8788"}`
  );
}

export async function broadcast(sessionId: string, message: WsInbound, options?: BroadcastClientOptions): Promise<void> {
  const url = `${(options?.hubUrl ?? hubUrl()).replace(/\/$/, "")}/broadcast/${encodeURIComponent(sessionId)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "unknown");
    throw new Error(`broadcast failed: ${response.status} ${body}`);
  }
}
