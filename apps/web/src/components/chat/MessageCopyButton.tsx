import { CheckIcon, CopyIcon } from "lucide-react";
import { memo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { anchoredToastManager } from "@/components/ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard.js";
import { cn } from "@/lib/utils";

const ANCHORED_TOAST_TIMEOUT_MS = 1000;

export const MessageCopyButton = memo(function MessageCopyButton({
  text,
  size = "icon-xs",
  variant = "outline",
  className,
}: {
  text: string;
  size?: "xs" | "icon-xs";
  variant?: "outline" | "ghost";
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const { copyToClipboard, isCopied } = useCopyToClipboard<void>({
    timeout: ANCHORED_TOAST_TIMEOUT_MS,
    onCopy: () => {
      if (ref.current) {
        anchoredToastManager.add({
          data: { tooltipStyle: true },
          positionerProps: { anchor: ref.current },
          timeout: ANCHORED_TOAST_TIMEOUT_MS,
          title: "Copied!",
        });
      }
    },
    onError: (error) => {
      if (ref.current) {
        anchoredToastManager.add({
          data: { tooltipStyle: true },
          positionerProps: { anchor: ref.current },
          timeout: ANCHORED_TOAST_TIMEOUT_MS,
          title: "Failed to copy",
          description: error.message,
        });
      }
    },
  });

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label="Copy message"
            className={cn(className)}
            disabled={isCopied}
            onClick={() => copyToClipboard(text, undefined)}
            ref={ref}
            size={size}
            type="button"
            variant={variant}
          >
            {isCopied ? <CheckIcon className="size-3 text-success" /> : <CopyIcon className="size-3" />}
          </Button>
        }
      />
      <TooltipPopup>Copy to clipboard</TooltipPopup>
    </Tooltip>
  );
});
