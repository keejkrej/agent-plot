/** Shared API / WebSocket message contracts. */

export type WsCanvasTree = { type: "canvas.tree"; spec: unknown };
export type WsCanvasError = { type: "canvas.error"; message: string };
export type WsChatDelta = { type: "chat.delta"; text: string };
export type WsError = { type: "error"; message: string };
export type WsToolEnd = { type: "tool.end"; name: string };

export type WsInbound = WsCanvasTree | WsCanvasError | WsChatDelta | WsError | WsToolEnd;
