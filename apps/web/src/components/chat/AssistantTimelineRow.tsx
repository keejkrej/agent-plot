import ChatMarkdown from "@/components/ChatMarkdown.js";
import { MessageCopyButton } from "@/components/chat/MessageCopyButton.js";
import { resolveAssistantMessageCopyState } from "@/components/chat/MessagesTimeline.logic.js";
import type { ChatMessage } from "@/types.js";

export function AssistantTimelineRow({
  message,
  showCompletionDivider,
}: {
  message: ChatMessage;
  showCompletionDivider?: boolean;
}) {
  const messageText = message.text || (message.streaming ? "" : "(empty response)");
  const copyState = resolveAssistantMessageCopyState({
    text: message.text,
    streaming: message.streaming,
  });

  return (
    <>
      {showCompletionDivider ? (
        <div className="my-3 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
            Response
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
      ) : null}
      <div className="min-w-0 px-1 py-0.5">
        <ChatMarkdown isStreaming={Boolean(message.streaming)} text={messageText} />
        <div className="mt-1.5 flex items-center gap-2">
          <p className="text-[10px] text-muted-foreground/30">
            {message.streaming ? "Streaming…" : "Assistant"}
          </p>
          {copyState.visible ? (
            <div className="flex items-center opacity-0 transition-opacity duration-200 group-hover/assistant:opacity-100">
              <MessageCopyButton
                className="border-border/50 bg-background/35 text-muted-foreground/45 shadow-none hover:border-border/70 hover:bg-background/55 hover:text-muted-foreground/70"
                size="icon-xs"
                text={copyState.text}
                variant="outline"
              />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
