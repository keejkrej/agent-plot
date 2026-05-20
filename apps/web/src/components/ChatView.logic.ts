/** Default composer placeholders aligned with t3code `ChatComposer`. */
export function resolveComposerPlaceholder(input: {
  sessionId: string | null;
  connection: "connected" | "connecting" | "disconnected";
}): string {
  if (!input.sessionId) {
    return "Ask anything, @tag files/folders, $use skills, or / for commands";
  }
  if (input.connection === "connecting") {
    return "Connecting…";
  }
  if (input.connection === "disconnected") {
    return "Ask for follow-up changes or attach images";
  }
  return "Ask about your data, or attach file/folder paths with the buttons below";
}

export function deriveComposerSendState(options: {
  prompt: string;
  pathAttachmentCount?: number;
}): {
  trimmedPrompt: string;
  hasSendableContent: boolean;
} {
  const trimmedPrompt = options.prompt.trim();
  const pathCount = options.pathAttachmentCount ?? 0;
  return {
    trimmedPrompt,
    hasSendableContent: trimmedPrompt.length > 0 || pathCount > 0,
  };
}
