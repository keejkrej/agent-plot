import { MessageCopyButton } from "@/components/chat/MessageCopyButton.js";
import { PathAttachmentChip } from "@/components/chat/PathAttachmentChip.js";
import { formatMessageMeta } from "@/components/chat/MessageMeta.js";
import type { MessagesTimelineRow } from "@/components/chat/MessagesTimeline.logic.js";
import { buildAgentMessageText } from "@/lib/pathAttachments.js";

export function UserTimelineRow({
  row,
}: {
  row: Extract<MessagesTimelineRow, { kind: "message" }>;
}) {
  const { message } = row;
  const paths = message.pathAttachments ?? [];
  const copyText = buildAgentMessageText(message.text, paths).trim();

  return (
    <div className="flex justify-end">
      <div className="group relative max-w-[80%] rounded-2xl rounded-br-sm border border-border bg-secondary px-4 py-3">
        {paths.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {paths.map((attachment) => (
              <PathAttachmentChip key={attachment.id} attachment={attachment} />
            ))}
          </div>
        ) : null}
        {message.text.trim() ? (
          <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-foreground">
            {message.text}
          </p>
        ) : null}
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
