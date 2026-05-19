import { ChevronDownIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AssistantTimelineRow } from "@/components/chat/AssistantTimelineRow.js";
import { SystemTimelineRow } from "@/components/chat/SystemTimelineRow.js";
import { UserTimelineRow } from "@/components/chat/UserTimelineRow.js";
import { WorkingTimelineRow } from "@/components/chat/WorkingTimelineRow.js";
import { WorkGroupSection } from "@/components/chat/WorkGroupSection.js";
import {
  deriveMessagesTimelineRows,
  type MessagesTimelineRow,
} from "@/components/chat/MessagesTimeline.logic.js";
import { cn } from "@/lib/utils";
import type { ActivityEntry, ChatMessage } from "@/types.js";

type MessagesTimelineProps = {
  messages: ChatMessage[];
  activities: ActivityEntry[];
  isRunning: boolean;
  onViewCanvas?: () => void;
  onIsAtEndChange?: (isAtEnd: boolean) => void;
};

function TimelineRowContent({
  row,
  onViewCanvas,
}: {
  row: MessagesTimelineRow;
  onViewCanvas?: () => void;
}) {
  return (
    <div
      className={cn(
        "pb-4",
        row.kind === "message" && row.message.role === "assistant" ? "group/assistant" : null,
      )}
    >
      {row.kind === "work" ? (
        <WorkGroupSection groupedEntries={row.groupedEntries} onViewCanvas={onViewCanvas} />
      ) : null}
      {row.kind === "message" && row.message.role === "user" ? (
        <UserTimelineRow message={row.message} />
      ) : null}
      {row.kind === "message" && row.message.role === "assistant" ? (
        <AssistantTimelineRow
          message={row.message}
          showCompletionDivider={row.showCompletionDivider}
        />
      ) : null}
      {row.kind === "message" && row.message.role === "system" ? (
        <SystemTimelineRow message={row.message} />
      ) : null}
      {row.kind === "working" ? <WorkingTimelineRow /> : null}
    </div>
  );
}

export function MessagesTimeline({
  messages,
  activities,
  isRunning,
  onViewCanvas,
  onIsAtEndChange,
}: MessagesTimelineProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollPill, setShowScrollPill] = useState(false);
  const stickRef = useRef(true);

  const rows = useMemo(
    () => deriveMessagesTimelineRows({ messages, activities, isWorking: isRunning }),
    [messages, activities, isRunning],
  );

  const scrollToEnd = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
    stickRef.current = true;
    setShowScrollPill(false);
    onIsAtEndChange?.(true);
  }, [onIsAtEndChange]);

  useEffect(() => {
    if (stickRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [rows, isRunning]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distance < 48;
    stickRef.current = atBottom;
    setShowScrollPill(!atBottom);
    onIsAtEndChange?.(atBottom);
  }, [onIsAtEndChange]);

  if (rows.length === 0 && !isRunning) {
    return (
      <div className="flex h-full items-center justify-center px-3 sm:px-5">
        <p className="text-sm text-muted-foreground/30">
          Create a session, then describe what to analyze. Include a TIFF path or upload a file.
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        className="h-full min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 sm:px-5"
        onScroll={onScroll}
      >
        <div className="mx-auto w-full min-w-0 max-w-3xl">
          <div className="h-3 sm:h-4" />
          {rows.map((row) => (
            <div key={row.id} className="mx-auto w-full min-w-0 max-w-3xl overflow-x-clip">
              <TimelineRowContent onViewCanvas={onViewCanvas} row={row} />
            </div>
          ))}
          <div className="h-3 sm:h-4" />
          <div ref={bottomRef} className="h-px" />
        </div>
      </div>
      {showScrollPill ? (
        <div className="pointer-events-none absolute bottom-1 left-1/2 z-30 flex -translate-x-1/2 justify-center py-1.5">
          <button
            className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1 text-muted-foreground text-xs shadow-sm transition-colors hover:border-border hover:text-foreground hover:cursor-pointer"
            onClick={() => scrollToEnd()}
            type="button"
          >
            <ChevronDownIcon className="size-3.5" />
            Scroll to bottom
          </button>
        </div>
      ) : null}
    </div>
  );
}
