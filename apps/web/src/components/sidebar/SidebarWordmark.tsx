import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { APP_STAGE_LABEL, APP_VERSION } from "@/branding.js";

export function SidebarWordmark() {
  return (
    <div className="relative flex min-h-8 w-full items-center justify-center">
      <SidebarTrigger className="absolute top-1/2 left-0 z-10 size-7 -translate-y-1/2 md:hidden" />
      <Tooltip>
        <TooltipTrigger
          render={
            <div
              aria-label="Agent Plot"
              className="flex cursor-default items-center justify-center gap-1 rounded-md outline-hidden ring-ring"
            >
              <span className="truncate text-sm font-semibold tracking-tight text-foreground">
                Agent
              </span>
              <span className="truncate text-sm font-medium tracking-tight text-muted-foreground">
                Plot
              </span>
              <span className="rounded-full bg-muted/50 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60">
                {APP_STAGE_LABEL}
              </span>
            </div>
          }
        />
        <TooltipPopup side="bottom" sideOffset={2}>
          Version {APP_VERSION}
        </TooltipPopup>
      </Tooltip>
    </div>
  );
}
