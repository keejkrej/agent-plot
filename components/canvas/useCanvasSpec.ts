import type { EveMessageData } from "eve/react";
import type { CanvasSpec } from "./CanvasPanel";

export function useCanvasSpec(data: EveMessageData | undefined): CanvasSpec | null {
  if (!data?.messages) return null;
  for (let i = data.messages.length - 1; i >= 0; i--) {
    const message = data.messages[i];
    if (message.role !== "assistant") continue;
    for (let j = message.parts.length - 1; j >= 0; j--) {
      const part = message.parts[j];
      if (part.type !== "dynamic-tool") continue;
      if (part.toolName !== "build_artifacts") continue;
      if (part.state !== "output-available") continue;
      const output = part.output as { ok?: boolean; spec?: CanvasSpec } | undefined;
      if (output?.ok && output.spec) {
        return output.spec;
      }
    }
  }
  return null;
}
