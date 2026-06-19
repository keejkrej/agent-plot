/** Shared types for chat, canvas, and filesystem messages. */

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

export type CanvasTreeEvent = { type: "canvas.tree"; spec: CanvasSpec };
export type CanvasErrorEvent = { type: "canvas.error"; message: string };

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

export type SessionChatHistory = {
  messages: ChatMessageSnapshot[];
  activities: ActivitySnapshot[];
};

/** json-render canvas spec shape. */
export type CanvasSpec = {
  root: string;
  elements: Record<string, CanvasElementNode>;
};

export type CanvasElementNode = {
  type?: string;
  props?: Record<string, unknown>;
  children?: string[];
};

export function decodeCanvasPayloadRecord(payload: Record<string, unknown>): Record<string, unknown> {
  // Future: add runtime validation if needed.
  return payload;
}
