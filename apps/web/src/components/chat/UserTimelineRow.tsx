import { MessageCopyButton } from "@/components/chat/MessageCopyButton.js";
import { formatMessageMeta } from "@/components/chat/MessageMeta.js";
import type { MessagesTimelineRow } from "@/components/chat/MessagesTimeline.logic.js";

export function UserTimelineRow({
  row,
}: {
  row: Extract<MessagesTimelineRow, { kind: "message" }>;
}) {
  const { message } = row;
  const copyText = message.text.trim();

  return (
    <div className="flex justify-end">
      <div className="group relative max-w-[80%] rounded-2xl rounded-br-sm border border-border bg-secondary px-4 py-3">
        <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-foreground">
          {message.text}
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="flex items-center gap-1.5 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100">
            {copyText ? <MessageCopyButton text={copyText} /> : null}
          </div>
          <p className="text-right text-xs text-muted-foreground/50">
            {formatMessageMeta(message.createdAt, null)}
          </p>
        </div>
      </div>
    </div>
  );
}
