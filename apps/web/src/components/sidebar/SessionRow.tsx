import { ArchiveIcon, ArchiveRestoreIcon } from "lucide-react";
import { memo, useCallback, type MouseEvent } from "react";
import { formatRelativeTimeLabel } from "@/lib/relativeTime";
import { cn } from "@/lib/utils";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { resolveSessionRowClassName } from "./sidebar.logic.js";

export type SessionRowEntry = {
  id: string;
  title: string;
  updatedAt?: string;
  archivedAt?: string | null;
};

type SessionRowProps = {
  session: SessionRowEntry;
  isActive: boolean;
  onSelect: (id: string) => void;
  archived?: boolean;
  archiveDisabled?: boolean;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
};

export const SessionRow = memo(function SessionRow({
  session,
  isActive,
  onSelect,
  archived = false,
  archiveDisabled = false,
  onArchive,
  onUnarchive,
}: SessionRowProps) {
  const relativeTime = session.updatedAt ? formatRelativeTimeLabel(session.updatedAt) : null;

  const handleArchiveClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onArchive?.(session.id);
    },
    [onArchive, session.id],
  );

  const handleUnarchiveClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onUnarchive?.(session.id);
    },
    [onUnarchive, session.id],
  );

  const showArchiveAction = !archived && onArchive && !archiveDisabled;
  const showUnarchiveAction = archived && onUnarchive;

  return (
    <SidebarMenuItem className="group/session-item w-full" data-session-item>
      <SidebarMenuButton
        className={cn(resolveSessionRowClassName({ isActive }), "relative isolate")}
        isActive={isActive}
        onClick={() => onSelect(session.id)}
        size="sm"
        type="button"
      >
        <span className="min-w-0 flex-1 truncate text-left text-xs">{session.title}</span>
        <div className="ml-auto flex min-w-12 shrink-0 items-center justify-end gap-1.5">
          {relativeTime ? (
            <span
              className={cn(
                "text-[10px] tabular-nums",
                (showArchiveAction || showUnarchiveAction) &&
                  "group-hover/session-item:invisible group-focus-within/session-item:invisible",
                isActive ? "text-foreground/72 dark:text-foreground/82" : "text-muted-foreground/40",
              )}
            >
              {relativeTime}
            </span>
          ) : null}
          {showArchiveAction ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    aria-label={`Archive ${session.title}`}
                    className="pointer-events-none absolute top-1/2 right-1 inline-flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center text-muted-foreground/60 opacity-0 transition-opacity hover:text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring group-hover/session-item:pointer-events-auto group-hover/session-item:opacity-100 group-focus-within/session-item:pointer-events-auto group-focus-within/session-item:opacity-100"
                    onClick={handleArchiveClick}
                    type="button"
                  >
                    <ArchiveIcon className="size-3.5" />
                  </button>
                }
              />
              <TooltipPopup side="top">Archive session</TooltipPopup>
            </Tooltip>
          ) : null}
          {showUnarchiveAction ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    aria-label={`Unarchive ${session.title}`}
                    className="pointer-events-none absolute top-1/2 right-1 inline-flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center text-muted-foreground/60 opacity-0 transition-opacity hover:text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring group-hover/session-item:pointer-events-auto group-hover/session-item:opacity-100 group-focus-within/session-item:pointer-events-auto group-focus-within/session-item:opacity-100"
                    onClick={handleUnarchiveClick}
                    type="button"
                  >
                    <ArchiveRestoreIcon className="size-3.5" />
                  </button>
                }
              />
              <TooltipPopup side="top">Unarchive session</TooltipPopup>
            </Tooltip>
          ) : null}
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
});
