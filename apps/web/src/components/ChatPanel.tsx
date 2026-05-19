import { ArrowUpIcon, MessageSquareIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type ChatPanelProps = {
  transcript: string;
  draft: string;
  sessionId: string | null;
  sessionTitle: string | null;
  onDraftChange: (value: string) => void;
  onSend: () => void;
};

export function ChatPanel({
  transcript,
  draft,
  sessionId,
  sessionTitle,
  onDraftChange,
  onSend,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const canSend = Boolean(sessionId && draft.trim());

  return (
    <section className="flex h-full min-h-0 w-full flex-col border-border border-r bg-background">
      <header className="flex h-11 shrink-0 items-center gap-2 border-border border-b px-4">
        <MessageSquareIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate font-medium text-sm">
          {sessionTitle ?? "Chat"}
        </span>
      </header>

      <ScrollArea className="min-h-0 flex-1" scrollFade>
        <div className="px-4 py-4">
          <div className="whitespace-pre-wrap font-mono text-foreground/90 text-xs leading-relaxed">
            {transcript || (
              <p className="text-muted-foreground">
                Create a session, then describe what to analyze and include the TIFF path in your message.
              </p>
            )}
          </div>
          <div ref={bottomRef} className="h-px" />
        </div>
      </ScrollArea>

      <Separator />

      <div className="shrink-0 p-3">
        <InputGroup className="rounded-xl shadow-none">
          <InputGroupTextarea
            disabled={!sessionId}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) onSend();
              }
            }}
            placeholder={
              sessionId
                ? "Message the assistant (include a TIFF path when pointing at your data)…"
                : "Create a session to chat"
            }
            rows={3}
            value={draft}
          />
          <InputGroupAddon align="block-end" className="justify-end gap-1 pb-2 pe-2">
            <Button
              aria-label="Send message"
              disabled={!canSend}
              onClick={onSend}
              size="icon-sm"
              type="button"
              variant="default"
            >
              <ArrowUpIcon />
            </Button>
          </InputGroupAddon>
        </InputGroup>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </section>
  );
}
