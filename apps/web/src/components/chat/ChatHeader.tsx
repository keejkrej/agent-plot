import { DiffIcon } from "lucide-react";
import { memo } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { SessionContextDialog } from "./SessionContextDialog.js";

export const ChatHeader = memo(function ChatHeader({
  sessionTitle,
  sessionId,
  canvasOpen,
  onToggleCanvas,
}: {
  sessionTitle: string;
  sessionId: string | null;
  canvasOpen: boolean;
  onToggleCanvas: () => void;
}) {
  return (
    <div className="@container/header-actions flex min-w-0 flex-1 items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden sm:gap-3">
        <SidebarTrigger className="size-7 shrink-0 md:hidden" />
        <h2
          className="min-w-0 shrink truncate text-sm font-medium text-foreground"
          title={sessionTitle}
        >
          {sessionTitle}
        </h2>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 @3xl/header-actions:gap-3">
        <Tooltip>
          <TooltipTrigger
            render={
              <SessionContextDialog sessionId={sessionId} />
            }
          />
          <TooltipPopup side="bottom">Session context</TooltipPopup>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                aria-label="Toggle canvas panel"
                className="shrink-0"
                onPressedChange={onToggleCanvas}
                pressed={canvasOpen}
                size="xs"
                variant="outline"
              >
                <DiffIcon className="size-3" />
              </Toggle>
            }
          />
          <TooltipPopup side="bottom">Toggle canvas panel</TooltipPopup>
        </Tooltip>
      </div>
    </div>
  );
});
