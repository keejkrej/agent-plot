import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
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

const TIMELINE_LIST_HEADER = <div className="h-3 sm:h-4" />;
const TIMELINE_LIST_FOOTER = <div className="h-3 sm:h-4" />;

type MessagesTimelineProps = {
  messages: ChatMessage[];
  activities: ActivityEntry[];
  isRunning: boolean;
  onViewCanvas?: () => void;
  onIsAtEndChange?: (isAtEnd: boolean) => void;
  scrollToEndRef?: RefObject<(() => void) | null>;
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
      data-timeline-row-id={row.id}
      data-timeline-row-kind={row.kind}
    >
      {row.kind === "work" ? (
        <WorkGroupSection groupedEntries={row.groupedEntries} onViewCanvas={onViewCanvas} />
      ) : null}
      {row.kind === "message" && row.message.role === "user" ? <UserTimelineRow row={row} /> : null}
      {row.kind === "message" && row.message.role === "assistant" ? (
        <AssistantTimelineRow row={row} />
      ) : null}
      {row.kind === "message" && row.message.role === "system" ? (
        <SystemTimelineRow message={row.message} />
      ) : null}
      {row.kind === "working" ? <WorkingTimelineRow row={row} /> : null}
    </div>
  );
}

export function MessagesTimeline({
  messages,
  activities,
  isRunning,
  onViewCanvas,
  onIsAtEndChange,
  scrollToEndRef,
}: MessagesTimelineProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  const rows = useMemo(
    () => deriveMessagesTimelineRows({ messages, activities, isWorking: isRunning }),
    [messages, activities, isRunning],
  );

  const scrollToEnd = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      bottomRef.current?.scrollIntoView({ behavior });
      stickRef.current = true;
      onIsAtEndChange?.(true);
    },
    [onIsAtEndChange],
  );

  useEffect(() => {
    if (!scrollToEndRef) return;
    scrollToEndRef.current = () => scrollToEnd();
    return () => {
      scrollToEndRef.current = null;
    };
  }, [scrollToEnd, scrollToEndRef]);

  useEffect(() => {
    if (stickRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [rows, isRunning]);

  const onScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    const atBottom = distance < 48;
    stickRef.current = atBottom;
    onIsAtEndChange?.(atBottom);
  }, [onIsAtEndChange]);

  if (rows.length === 0 && !isRunning) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground/30">
          Send a message to start the conversation.
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
          {TIMELINE_LIST_HEADER}
          {rows.map((row) => (
            <div key={row.id} className="mx-auto w-full min-w-0 max-w-3xl overflow-x-clip">
              <TimelineRowContent onViewCanvas={onViewCanvas} row={row} />
            </div>
          ))}
          {TIMELINE_LIST_FOOTER}
          <div ref={bottomRef} className="h-px" />
        </div>
      </div>
    </div>
  );
}
