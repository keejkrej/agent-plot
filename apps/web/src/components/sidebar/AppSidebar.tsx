import { SearchIcon, SettingsIcon, SquarePenIcon } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Kbd } from "@/components/ui/kbd";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { isMacPlatform } from "@/lib/platform.js";
import { SessionRow, type SessionRowEntry } from "./SessionRow.js";
import { SidebarWordmark } from "./SidebarWordmark.js";

export type SessionEntry = SessionRowEntry;

const SESSION_SIDEBAR_WIDTH_STORAGE_KEY = "agent-plot:session-sidebar-width";
const SESSION_SIDEBAR_MIN_WIDTH = 13 * 16;
const SESSION_MAIN_CONTENT_MIN_WIDTH = 40 * 16;

type AppSidebarProps = {
  sessions: SessionEntry[];
  archivedSessions: SessionEntry[];
  activeSessionId: string | null;
  archiveDisabledSessionId: string | null;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
  onArchiveSession: (id: string) => void;
  onUnarchiveSession: (id: string) => void;
};

export const AppSidebar = memo(function AppSidebar({
  sessions,
  archivedSessions,
  activeSessionId,
  archiveDisabledSessionId,
  onNewSession,
  onSelectSession,
  onArchiveSession,
  onUnarchiveSession,
}: AppSidebarProps) {
  const [filter, setFilter] = useState("");
  const [filterFocused, setFilterFocused] = useState(false);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const searchShortcutLabel = isMacPlatform() ? "⌘K" : "Ctrl+K";

  const filterEntries = useCallback(
    (entries: SessionEntry[]) => {
      const q = filter.trim().toLowerCase();
      if (!q) return entries;
      return entries.filter(
        (s) => s.title.toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
      );
    },
    [filter],
  );

  const filteredSessions = useMemo(() => filterEntries(sessions), [filterEntries, sessions]);
  const filteredArchivedSessions = useMemo(
    () => filterEntries(archivedSessions),
    [archivedSessions, filterEntries],
  );

  const openFilter = useCallback(() => {
    setFilterFocused(true);
    requestAnimationFrame(() => {
      filterInputRef.current?.focus();
    });
  }, []);

  const closeFilterIfEmpty = useCallback(() => {
    if (!filter.trim()) {
      setFilterFocused(false);
    }
  }, [filter]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "k" || !(event.metaKey || event.ctrlKey)) {
        return;
      }
      event.preventDefault();
      openFilter();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openFilter]);

  const showFilterInput = filterFocused || filter.trim().length > 0;

  return (
    <Sidebar
      className="border-r border-border bg-card text-foreground"
      collapsible="offcanvas"
      resizable={{
        minWidth: SESSION_SIDEBAR_MIN_WIDTH,
        shouldAcceptWidth: ({ nextWidth, wrapper }) =>
          wrapper.clientWidth - nextWidth >= SESSION_MAIN_CONTENT_MIN_WIDTH,
        storageKey: SESSION_SIDEBAR_WIDTH_STORAGE_KEY,
      }}
      side="left"
    >
      <SidebarHeader className="gap-3 px-3 py-2 sm:gap-2.5 sm:px-4 sm:py-3">
        <SidebarWordmark />
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup className="px-2 pt-2 pb-1">
          <SidebarMenu>
            <SidebarMenuItem className="h-7">
              {showFilterInput ? (
                <div className="box-border flex h-7 w-full items-center gap-2 rounded-lg border border-border/60 bg-background/50 px-2">
                  <SearchIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
                  <input
                    ref={filterInputRef}
                    aria-label="Filter sessions"
                    className="h-full min-h-0 min-w-0 flex-1 bg-transparent py-0 text-foreground text-xs leading-none outline-none placeholder:text-muted-foreground/50"
                    onBlur={closeFilterIfEmpty}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter sessions"
                    type="search"
                    value={filter}
                  />
                </div>
              ) : (
                <SidebarMenuButton
                  className="h-7 w-full gap-2 px-2 py-0 text-muted-foreground/70 hover:bg-accent hover:text-foreground focus-visible:ring-0"
                  onClick={openFilter}
                  size="sm"
                  type="button"
                >
                  <SearchIcon className="size-3.5" />
                  <span className="flex-1 truncate text-left text-xs">Search</span>
                  <Kbd className="h-4 min-w-0 rounded-sm px-1.5 text-[10px]">{searchShortcutLabel}</Kbd>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="px-2 py-2">
          <div className="mb-1 flex items-center justify-between pl-2 pr-1.5">
            <span className="font-medium text-[10px] text-muted-foreground/60 uppercase tracking-wider">
              Sessions
            </span>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    aria-label="New session"
                    className="inline-flex size-5 cursor-pointer items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
                    onClick={onNewSession}
                    type="button"
                  />
                }
              >
                <SquarePenIcon className="size-3.5" />
              </TooltipTrigger>
              <TooltipPopup side="right">New session</TooltipPopup>
            </Tooltip>
          </div>

          <SidebarMenu>
            {filteredSessions.map((s) => (
              <SessionRow
                key={s.id}
                archiveDisabled={archiveDisabledSessionId === s.id}
                isActive={activeSessionId === s.id}
                onArchive={onArchiveSession}
                onSelect={onSelectSession}
                session={s}
              />
            ))}
          </SidebarMenu>

          {sessions.length === 0 ? (
            <div className="px-2 pt-4 text-center text-muted-foreground/60 text-xs">
              No sessions yet
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="px-2 pt-4 text-center text-muted-foreground/60 text-xs">
              No sessions match your filter.
            </div>
          ) : null}
        </SidebarGroup>

        {archivedSessions.length > 0 ? (
          <SidebarGroup className="px-2 py-2">
            <div className="mb-1 flex items-center justify-between pl-2 pr-1.5">
              <span className="font-medium text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                Archived
              </span>
            </div>
            <SidebarMenu>
              {filteredArchivedSessions.map((s) => (
                <SessionRow
                  key={s.id}
                  archived
                  isActive={activeSessionId === s.id}
                  onSelect={onSelectSession}
                  onUnarchive={onUnarchiveSession}
                  session={s}
                />
              ))}
            </SidebarMenu>
            {filteredArchivedSessions.length === 0 ? (
              <div className="px-2 pt-4 text-center text-muted-foreground/60 text-xs">
                No archived sessions match your filter.
              </div>
            ) : null}
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="gap-2 px-2 py-1.5 text-muted-foreground/70 hover:bg-accent hover:text-foreground"
              disabled
              size="sm"
              type="button"
            >
              <SettingsIcon className="size-3.5" />
              <span className="text-xs">Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
});
