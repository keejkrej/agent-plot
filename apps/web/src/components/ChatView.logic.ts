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
  return "Ask anything, @tag files/folders, $use skills, or / for commands";
}

export function deriveComposerSendState(options: { prompt: string }): {
  trimmedPrompt: string;
  hasSendableContent: boolean;
} {
  const trimmedPrompt = options.prompt.trim();
  return {
    trimmedPrompt,
    hasSendableContent: trimmedPrompt.length > 0,
  };
}
