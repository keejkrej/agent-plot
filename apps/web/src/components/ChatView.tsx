import { useCallback, useState } from "react";
import { ChatComposer } from "@/components/chat/ChatComposer.js";
import { ChatHeader } from "@/components/chat/ChatHeader.js";
import { ConnectionBanner } from "@/components/chat/ConnectionBanner.js";
import { MessagesTimeline } from "@/components/chat/MessagesTimeline.js";
import { ThreadErrorBanner } from "@/components/chat/ThreadErrorBanner.js";
import { cn } from "@/lib/utils";
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
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onUpload?: (file: File) => void;
  onViewCanvas?: () => void;
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
  onDraftChange,
  onSend,
  onUpload,
  onViewCanvas,
}: ChatViewProps) {
  const [canvasHighlighted, setCanvasHighlighted] = useState(false);

  const handleToggleCanvas = useCallback(() => {
    setCanvasHighlighted((v) => !v);
    onViewCanvas?.();
  }, [onViewCanvas]);

  const title = sessionTitle ?? "Chat";
  const isConnecting = connection === "connecting";

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <header
        className={cn(
          "border-b border-border",
          "pb-2 pl-[calc(env(safe-area-inset-left)+0.75rem)] pr-[calc(env(safe-area-inset-right)+0.75rem)] pt-2 sm:pb-3 sm:pl-[calc(env(safe-area-inset-left)+1.25rem)] sm:pr-[calc(env(safe-area-inset-right)+1.25rem)] sm:pt-3",
        )}
      >
        <ChatHeader
          canvasOpen={canvasHighlighted}
          onToggleCanvas={onViewCanvas ? handleToggleCanvas : undefined}
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
          onViewCanvas={onViewCanvas}
        />
      </div>

      <div
        className={cn(
          "shrink-0 pl-[calc(env(safe-area-inset-left)+0.75rem)] pr-[calc(env(safe-area-inset-right)+0.75rem)] pt-1.5 sm:pl-[calc(env(safe-area-inset-left)+1.25rem)] sm:pr-[calc(env(safe-area-inset-right)+1.25rem)] sm:pt-2",
          "pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pb-[calc(env(safe-area-inset-bottom)+1rem)]",
        )}
      >
        <ChatComposer
          draft={draft}
          isConnecting={isConnecting}
          isRunning={isRunning}
          onDraftChange={onDraftChange}
          onSend={onSend}
          onUpload={onUpload}
          sessionId={sessionId}
        />
      </div>
    </div>
  );
}
