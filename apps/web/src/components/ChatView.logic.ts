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
