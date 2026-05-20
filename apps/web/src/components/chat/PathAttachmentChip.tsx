import type { PathAttachment } from "@agent-plot/contracts";
import { FileIcon, FolderIcon, XIcon } from "lucide-react";
import { basenameOfPath } from "@/lib/pathAttachments.js";
import {
  COMPOSER_INLINE_CHIP_CLASS_NAME,
  COMPOSER_INLINE_CHIP_DISMISS_CLASS_NAME,
  COMPOSER_INLINE_CHIP_ICON_CLASS_NAME,
  COMPOSER_INLINE_CHIP_LABEL_CLASS_NAME,
} from "@/components/composerInlineChip.js";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type PathAttachmentChipProps = {
  attachment: PathAttachment;
  onRemove?: () => void;
  className?: string;
};

export function PathAttachmentChip({ attachment, onRemove, className }: PathAttachmentChipProps) {
  const label = basenameOfPath(attachment.path) || attachment.path;
  const Icon = attachment.kind === "folder" ? FolderIcon : FileIcon;

  const chip = (
    <span className={cn(COMPOSER_INLINE_CHIP_CLASS_NAME, className)} data-path-attachment-chip="true">
      <Icon className={COMPOSER_INLINE_CHIP_ICON_CLASS_NAME} />
      <span className={COMPOSER_INLINE_CHIP_LABEL_CLASS_NAME}>{label}</span>
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          className={COMPOSER_INLINE_CHIP_DISMISS_CLASS_NAME}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <XIcon className="size-3" />
        </button>
      ) : null}
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger render={chip} />
      <TooltipPopup side="top" className="max-w-120 wrap-anywhere text-xs leading-tight">
        {attachment.path}
      </TooltipPopup>
    </Tooltip>
  );
}
