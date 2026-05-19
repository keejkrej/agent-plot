import { BarChart3Icon, CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react";
import { memo, useState } from "react";
import {
  MAX_VISIBLE_WORK_LOG_ENTRIES,
  type MessagesTimelineRow,
} from "@/components/chat/MessagesTimeline.logic.js";
import type { ActivityEntry } from "@/types.js";

function ActivityIcon({ status }: { status: ActivityEntry["status"] }) {
  if (status === "running") {
    return <Loader2Icon className="size-3 shrink-0 animate-spin text-muted-foreground/70" />;
  }
  if (status === "error") {
    return <XCircleIcon className="size-3 shrink-0 text-destructive" />;
  }
  return <CheckCircle2Icon className="size-3 shrink-0 text-muted-foreground/70" />;
}

export const WorkGroupSection = memo(function WorkGroupSection({
  groupedEntries,
  onViewCanvas,
}: {
  groupedEntries: Extract<MessagesTimelineRow, { kind: "work" }>["groupedEntries"];
  onViewCanvas?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasOverflow = groupedEntries.length > MAX_VISIBLE_WORK_LOG_ENTRIES;
  const visibleEntries =
    hasOverflow && !isExpanded
      ? groupedEntries.slice(-MAX_VISIBLE_WORK_LOG_ENTRIES)
      : groupedEntries;
  const hiddenCount = groupedEntries.length - visibleEntries.length;

  return (
    <div className="rounded-xl border border-border/45 bg-card/25 px-2 py-1.5">
      <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
        <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground/55">
          Work log ({groupedEntries.length})
        </p>
        {hasOverflow ? (
          <button
            className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground/55 transition-colors duration-150 hover:text-foreground/75"
            onClick={() => setIsExpanded((v) => !v)}
            type="button"
          >
            {isExpanded ? "Show less" : `Show ${hiddenCount} more`}
          </button>
        ) : null}
      </div>
      <div className="space-y-0.5">
        {visibleEntries.map((entry) => (
          <div key={entry.id} className="flex items-start gap-2 rounded-lg px-1 py-1 text-xs">
            <ActivityIcon status={entry.status} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-foreground/80">{entry.label}</p>
              {entry.detail ? (
                <p className="truncate text-muted-foreground/60">{entry.detail}</p>
              ) : null}
            </div>
            {entry.detail?.toLowerCase().includes("canvas") &&
            entry.status === "done" &&
            onViewCanvas ? (
              <button
                className="shrink-0 text-primary text-[11px] hover:underline"
                onClick={onViewCanvas}
                type="button"
              >
                <BarChart3Icon className="me-1 inline size-3" />
                View
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
});
