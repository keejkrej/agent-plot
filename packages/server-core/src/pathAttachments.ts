import type { PathAttachment } from "@agent-plot/contracts";

export function buildAgentMessageText(
  userText: string,
  pathAttachments: ReadonlyArray<PathAttachment> | undefined,
): string {
  const trimmed = userText.trim();
  const attachments = pathAttachments ?? [];
  if (attachments.length === 0) return trimmed;
  const lines = attachments.map((a) => `- [${a.kind}] ${a.path}`);
  const pathsBlock = `Data paths attached by the user:\n${lines.join("\n")}`;
  if (!trimmed) return pathsBlock;
  return `${pathsBlock}\n\n${trimmed}`;
}
