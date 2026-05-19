import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type SessionEntry = {
  id: string;
  title: string;
};

type AppSidebarProps = {
  sessions: SessionEntry[];
  activeSessionId: string | null;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
};

export function AppSidebar({
  sessions,
  activeSessionId,
  onNewSession,
  onSelectSession,
}: AppSidebarProps) {
  return (
    <nav
      aria-label="Workspace"
      className="flex h-full w-56 shrink-0 flex-col border-sidebar-border border-r bg-sidebar"
    >
      <div className="flex h-12 shrink-0 items-center justify-center px-3">
        <span className="font-semibold text-xl tracking-tight">agent-plot</span>
      </div>

      <div className="shrink-0 px-2 py-2">
        <Button
          className="w-full justify-start"
          onClick={onNewSession}
          size="sm"
          type="button"
          variant="outline"
        >
          <PlusIcon />
          New session
        </Button>
      </div>

      <Separator className="bg-sidebar-border" />

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-0.5 p-2">
          {sessions.length === 0 ? (
            <p className="px-2 py-3 text-muted-foreground text-xs leading-relaxed">
              No sessions yet. Create one, then point the assistant at your data in chat.
            </p>
          ) : (
            sessions.map((s) => (
              <Button
                key={s.id}
                className={cn(
                  "h-auto w-full justify-start py-2 font-normal",
                  activeSessionId === s.id && "bg-sidebar-accent font-medium",
                )}
                onClick={() => onSelectSession(s.id)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <span className="truncate">{s.title}</span>
              </Button>
            ))
          )}
        </div>
      </ScrollArea>
    </nav>
  );
}
