import { memo, type PointerEventHandler } from "react";
import { cn } from "@/lib/utils";

const preventPointerFocus: PointerEventHandler<HTMLElement> = (event) => {
  event.preventDefault();
};

type ComposerPrimaryActionsProps = {
  isRunning: boolean;
  isConnecting: boolean;
  isSendBusy: boolean;
  hasSendableContent: boolean;
  preserveComposerFocusOnPointerDown?: boolean;
};

export const ComposerPrimaryActions = memo(function ComposerPrimaryActions({
  isRunning,
  isConnecting,
  isSendBusy,
  hasSendableContent,
  preserveComposerFocusOnPointerDown = false,
}: ComposerPrimaryActionsProps) {
  const pointerFocusProps = preserveComposerFocusOnPointerDown
    ? { onPointerDown: preventPointerFocus }
    : {};

  const disabled =
    isSendBusy || isConnecting || isRunning || !hasSendableContent;

  return (
    <button
      type="submit"
      className={cn(
        "flex h-9 w-9 enabled:cursor-pointer items-center justify-center rounded-full bg-primary/90 text-primary-foreground transition-all duration-150 hover:bg-primary hover:scale-105 disabled:pointer-events-none disabled:opacity-30 disabled:hover:scale-100 sm:h-8 sm:w-8",
      )}
      {...pointerFocusProps}
      disabled={disabled}
      aria-label={
        isConnecting
          ? "Connecting"
          : isSendBusy
            ? "Sending"
            : isRunning
              ? "Assistant working"
              : "Send message"
      }
    >
      {isConnecting || isSendBusy ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className="animate-spin"
          aria-hidden="true"
        >
          <circle
            cx="7"
            cy="7"
            r="5.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="20 12"
          />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M7 11.5V2.5M7 2.5L3 6.5M7 2.5L11 6.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
});
