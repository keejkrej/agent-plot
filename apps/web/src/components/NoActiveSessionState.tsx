import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function NoActiveSessionState() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden bg-background">
      <header
        className={cn(
          "border-b border-border px-3 sm:px-5",
          "py-2 sm:py-3",
        )}
      >
        <div className="flex items-center gap-2">
          <SidebarTrigger className="size-7 shrink-0 md:hidden" />
          <span className="font-medium text-foreground text-sm md:text-muted-foreground/60">
            No active session
          </span>
        </div>
      </header>

      <Empty className="flex-1">
        <div className="w-full max-w-lg rounded-3xl border border-border/55 bg-card/20 px-8 py-12 shadow-sm/5">
          <EmptyHeader className="max-w-none">
            <EmptyTitle className="text-foreground text-xl">Pick a session to continue</EmptyTitle>
            <EmptyDescription className="mt-2 text-muted-foreground/78 text-sm">
              Select an existing session or create a new one to get started.
            </EmptyDescription>
          </EmptyHeader>
        </div>
      </Empty>
    </div>
  );
}
