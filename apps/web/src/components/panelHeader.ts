import { cn } from "@/lib/utils";

/** Shared chat/canvas panel header chrome so border-b lines up across columns. */
export const panelHeaderClassName = cn(
  "shrink-0 border-b border-border",
  "pb-2 pl-[calc(env(safe-area-inset-left)+0.75rem)] pr-[calc(env(safe-area-inset-right)+0.75rem)] pt-2",
  "sm:pb-3 sm:pl-[calc(env(safe-area-inset-left)+1.25rem)] sm:pr-[calc(env(safe-area-inset-right)+1.25rem)] sm:pt-3",
);

/** Horizontal padding for chat timeline and canvas body (matches MessagesTimeline). */
export const panelContentPaddingClassName = "px-3 sm:px-5";

/** Scrollable panel body with chat-matching padding and overflow. */
export const panelContentScrollClassName = cn(
  "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain",
  panelContentPaddingClassName,
);
