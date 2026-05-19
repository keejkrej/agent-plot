import { useEffect, useRef } from "react";
import type { MessagesTimelineRow } from "@/components/chat/MessagesTimeline.logic.js";
import { formatWorkingTimerNow } from "@/session-logic.js";

function WorkingTimer({ createdAt }: { createdAt: string }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const initialText = formatWorkingTimerNow(createdAt);

  useEffect(() => {
    const update = () => {
      if (textRef.current) {
        textRef.current.textContent = formatWorkingTimerNow(createdAt);
      }
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [createdAt]);

  return <span ref={textRef}>{initialText}</span>;
}

export function WorkingTimelineRow({
  row,
}: {
  row: Extract<MessagesTimelineRow, { kind: "working" }>;
}) {
  return (
    <div className="py-0.5 pl-1.5">
      <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground/70">
        <span aria-hidden className="inline-flex items-center gap-[3px]">
          <span className="h-1 w-1 rounded-full bg-muted-foreground/30 animate-pulse" />
          <span className="h-1 w-1 rounded-full bg-muted-foreground/30 animate-pulse [animation-delay:200ms]" />
          <span className="h-1 w-1 rounded-full bg-muted-foreground/30 animate-pulse [animation-delay:400ms]" />
        </span>
        <span>
          {row.createdAt ? (
            <>
              Working for <WorkingTimer createdAt={row.createdAt} />
            </>
          ) : (
            "Working..."
          )}
        </span>
      </div>
    </div>
  );
}
