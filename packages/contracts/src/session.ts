/** Shared API / WebSocket message contracts. */

export type ChatMessageRole = "user" | "assistant" | "system";

export type PathAttachmentKind = "file" | "folder";

/** User-attached filesystem path (not uploaded bytes). */
export type PathAttachment = {
  id: string;
  path: string;
  kind: PathAttachmentKind;
};

export type ChatMessageSnapshot = {
  id: string;
  role: ChatMessageRole;
  text: string;
  pathAttachments?: PathAttachment[];
  createdAt: string;
  streaming?: boolean;
  completedAt?: string;
};

export type ActivitySnapshot = {
  id: string;
  label: string;
  detail?: string;
  status: "running" | "done" | "error";
  createdAt: string;
};

export type WsChatUser = {
  type: "chat.user";
  id: string;
  text: string;
  pathAttachments?: PathAttachment[];
  createdAt: string;
};
export type WsChatAssistantStart = {
  type: "chat.assistant.start";
  id: string;
  createdAt: string;
};
export type WsChatAssistantDelta = { type: "chat.assistant.delta"; id: string; text: string };
export type WsChatAssistantEnd = { type: "chat.assistant.end"; id: string };
export type WsChatSystem = { type: "chat.system"; id: string; text: string; createdAt: string };
export type WsActivityStart = {
  type: "activity.start";
  id: string;
  label: string;
  createdAt: string;
};
export type WsActivityEnd = {
  type: "activity.end";
  id: string;
  detail?: string;
  status?: "done" | "error";
};
export type WsCanvasTree = { type: "canvas.tree"; spec: unknown };
export type WsCanvasError = { type: "canvas.error"; message: string };
/** @deprecated Prefer structured chat.* events; kept for legacy clients */
export type WsChatDelta = { type: "chat.delta"; text: string };
export type WsError = { type: "error"; message: string };
export type WsToolEnd = { type: "tool.end"; name: string };

export type FilesystemBrowseEntryKind = "file" | "directory";

export type FilesystemBrowseEntry = {
  name: string;
  fullPath: string;
  kind: FilesystemBrowseEntryKind;
};

export type FilesystemBrowseResult = {
  parentPath: string;
  entries: FilesystemBrowseEntry[];
};

/** Client → server (session WebSocket). */
export type WsFsBrowse = {
  type: "fs.browse";
  requestId: string;
  partialPath: string;
};

export type WsFsBrowseOk = {
  type: "fs.browse.ok";
  requestId: string;
  parentPath: string;
  entries: FilesystemBrowseEntry[];
};

export type WsFsBrowseError = {
  type: "fs.browse.error";
  requestId: string;
  message: string;
};

export type WsInbound =
  | WsChatUser
  | WsChatAssistantStart
  | WsChatAssistantDelta
  | WsChatAssistantEnd
  | WsChatSystem
  | WsActivityStart
  | WsActivityEnd
  | WsCanvasTree
  | WsCanvasError
  | WsChatDelta
  | WsError
  | WsToolEnd
  | WsFsBrowseOk
  | WsFsBrowseError;

export type SessionChatHistory = {
  messages: ChatMessageSnapshot[];
  activities: ActivitySnapshot[];
};
