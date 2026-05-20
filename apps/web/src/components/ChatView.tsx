import { ChevronDownIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatComposer } from "@/components/chat/ChatComposer.js";
import { ChatHeader } from "@/components/chat/ChatHeader.js";
import { ConnectionBanner } from "@/components/chat/ConnectionBanner.js";
import { MessagesTimeline } from "@/components/chat/MessagesTimeline.js";
import { ThreadErrorBanner } from "@/components/chat/ThreadErrorBanner.js";
import { panelHeaderClassName } from "@/components/panelHeader.js";
import { cn } from "@/lib/utils";
import type { PathAttachment } from "@agent-plot/contracts";
import type { BrowseFilesystemFn } from "@/hooks/useFilesystemBrowse.js";
import type { ActivityEntry, ChatMessage } from "@/types.js";

export type ChatViewProps = {
  sessionId: string | null;
  sessionTitle: string | null;
  messages: ChatMessage[];
  activities: ActivityEntry[];
  isRunning: boolean;
  connection: "connected" | "connecting" | "disconnected";
  error: string | null;
  draft: string;
  pathAttachments: PathAttachment[];
  onDraftChange: (value: string) => void;
  onAddPathAttachment: (attachment: PathAttachment) => void;
  onRemovePathAttachment: (id: string) => void;
  onSend: () => void;
  onUpload?: (file: File) => void;
  browseFilesystem?: BrowseFilesystemFn | null;
  canvasOpen: boolean;
  onToggleCanvas: () => void;
  onOpenCanvas: () => void;
};

export function ChatView({
  sessionId,
  sessionTitle,
  messages,
  activities,
  isRunning,
  connection,
  error,
  draft,
  pathAttachments,
  onDraftChange,
  onAddPathAttachment,
  onRemovePathAttachment,
  onSend,
  onUpload,
  browseFilesystem,
  canvasOpen,
  onToggleCanvas,
  onOpenCanvas,
}: ChatViewProps) {
  const title = sessionTitle ?? "Chat";
  const isConnecting = connection === "connecting";
  const scrollToEndRef = useRef<(() => void) | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const showScrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onIsAtEndChange = useCallback((isAtEnd: boolean) => {
    if (showScrollDebounceRef.current) {
      clearTimeout(showScrollDebounceRef.current);
      showScrollDebounceRef.current = null;
    }
    if (isAtEnd) {
      setShowScrollToBottom(false);
      return;
    }
    showScrollDebounceRef.current = setTimeout(() => {
      setShowScrollToBottom(true);
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      if (showScrollDebounceRef.current) {
        clearTimeout(showScrollDebounceRef.current);
      }
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden bg-background">
      <header className={panelHeaderClassName}>
        <ChatHeader
          canvasOpen={canvasOpen}
          onToggleCanvas={onToggleCanvas}
          sessionTitle={title}
        />
      </header>

      <ConnectionBanner connection={connection} />
      <ThreadErrorBanner error={error} />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <MessagesTimeline
          activities={activities}
          isRunning={isRunning}
          messages={messages}
          onIsAtEndChange={onIsAtEndChange}
          onViewCanvas={onOpenCanvas}
          scrollToEndRef={scrollToEndRef}
        />
        {showScrollToBottom ? (
          <div className="pointer-events-none absolute bottom-1 left-1/2 z-30 flex -translate-x-1/2 justify-center py-1.5">
            <button
              className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1 text-muted-foreground text-xs shadow-sm transition-colors hover:border-border hover:text-foreground hover:cursor-pointer"
              onClick={() => scrollToEndRef.current?.()}
              type="button"
            >
              <ChevronDownIcon className="size-3.5" />
              Scroll to bottom
            </button>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "shrink-0 pl-[calc(env(safe-area-inset-left)+0.75rem)] pr-[calc(env(safe-area-inset-right)+0.75rem)] pt-1.5 sm:pl-[calc(env(safe-area-inset-left)+1.25rem)] sm:pr-[calc(env(safe-area-inset-right)+1.25rem)] sm:pt-2",
          "pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pb-[calc(env(safe-area-inset-bottom)+1rem)]",
        )}
      >
        <ChatComposer
          browseFilesystem={browseFilesystem}
          connection={connection}
          draft={draft}
          isConnecting={isConnecting}
          isRunning={isRunning}
          onAddPathAttachment={onAddPathAttachment}
          onRemovePathAttachment={onRemovePathAttachment}
          onDraftChange={onDraftChange}
          onSend={onSend}
          onUpload={onUpload}
          pathAttachments={pathAttachments}
          sessionId={sessionId}
        />
      </div>
    </div>
  );
}
