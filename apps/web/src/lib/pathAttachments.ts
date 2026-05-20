import type { PathAttachment, PathAttachmentKind } from "@agent-plot/contracts";

export function basenameOfPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/").replace(/\/+$/, "");
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? normalized.slice(idx + 1) : normalized;
}

export function normalizePathInput(raw: string): string {
  return raw.trim();
}

export function createPathAttachment(path: string, kind: PathAttachmentKind): PathAttachment {
  return {
    id: crypto.randomUUID(),
    path: normalizePathInput(path),
    kind,
  };
}

/** Text block prepended for the agent (paths are not duplicated in visible chat text). */
export function formatPathAttachmentsForAgent(
  attachments: ReadonlyArray<PathAttachment>,
): string {
  if (attachments.length === 0) return "";
  const lines = attachments.map((a) => `- [${a.kind}] ${a.path}`);
  return `Data paths attached by the user:\n${lines.join("\n")}`;
}

export function buildAgentMessageText(
  userText: string,
  pathAttachments: ReadonlyArray<PathAttachment>,
): string {
  const trimmed = userText.trim();
  const pathsBlock = formatPathAttachmentsForAgent(pathAttachments);
  if (!pathsBlock) return trimmed;
  if (!trimmed) return pathsBlock;
  return `${pathsBlock}\n\n${trimmed}`;
}
