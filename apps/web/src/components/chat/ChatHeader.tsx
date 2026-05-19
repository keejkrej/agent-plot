import { PanelRightIcon } from "lucide-react";
import { memo } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";

export const ChatHeader = memo(function ChatHeader({
  sessionTitle,
  canvasOpen,
  onToggleCanvas,
}: {
  sessionTitle: string;
  canvasOpen?: boolean;
  onToggleCanvas?: () => void;
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
      {onToggleCanvas ? (
        <div className="flex shrink-0 items-center justify-end gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <Toggle
                  aria-label="Toggle canvas panel"
                  className="shrink-0"
                  onPressedChange={() => onToggleCanvas()}
                  pressed={Boolean(canvasOpen)}
                  size="sm"
                  variant="outline"
                >
                  <PanelRightIcon className="size-3" />
                </Toggle>
              }
            />
            <TooltipPopup side="bottom">Toggle canvas</TooltipPopup>
          </Tooltip>
        </div>
      ) : null}
    </div>
  );
});
