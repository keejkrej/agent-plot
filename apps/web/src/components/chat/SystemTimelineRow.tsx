import { InfoIcon } from "lucide-react";
import type { ChatMessage } from "@/types.js";

export function SystemTimelineRow({ message }: { message: ChatMessage }) {
  return (
    <div className="flex items-start gap-2 px-1 py-2 text-muted-foreground text-xs">
      <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
      <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
    </div>
  );
}
