import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";

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
    <Sidebar className="border-sidebar-border border-r" collapsible="offcanvas">
      <SidebarHeader className="h-12 justify-center">
        <span className="px-2 font-semibold text-xl tracking-tight">agent-plot</span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="px-2">
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
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {sessions.length === 0 ? (
                <p className="px-2 py-3 text-muted-foreground text-xs leading-relaxed">
                  No sessions yet. Create one, then point the assistant at your data in chat.
                </p>
              ) : (
                sessions.map((s) => (
                  <SidebarMenuItem key={s.id}>
                    <SidebarMenuButton
                      isActive={activeSessionId === s.id}
                      onClick={() => onSelectSession(s.id)}
                      type="button"
                    >
                      <span className="truncate">{s.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
