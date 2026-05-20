import type { PathAttachment, PathAttachmentKind } from "@agent-plot/contracts";
import { FileIcon, FolderIcon, PaperclipIcon } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { AttachPathDialog } from "@/components/chat/AttachPathDialog.js";
import { ComposerPrimaryActions } from "@/components/chat/ComposerPrimaryActions.js";
import { PathAttachmentChip } from "@/components/chat/PathAttachmentChip.js";
import { PathExplorerDialog } from "@/components/chat/PathExplorerDialog.js";
import { deriveComposerSendState, resolveComposerPlaceholder } from "@/components/ChatView.logic.js";
import type { BrowseFilesystemFn } from "@/hooks/useFilesystemBrowse.js";
import { createPathAttachment } from "@/lib/pathAttachments.js";
import { cn } from "@/lib/utils";

type ChatComposerProps = {
  draft: string;
  pathAttachments: PathAttachment[];
  disabled?: boolean;
  isRunning?: boolean;
  isConnecting?: boolean;
  isSendBusy?: boolean;
  connection?: "connected" | "connecting" | "disconnected";
  sessionId: string | null;
  browseFilesystem?: BrowseFilesystemFn | null;
  onDraftChange: (value: string) => void;
  onAddPathAttachment: (attachment: PathAttachment) => void;
  onRemovePathAttachment: (id: string) => void;
  onSend: () => void;
  onUpload?: (file: File) => void;
};

export function ChatComposer({
  draft,
  pathAttachments,
  disabled,
  isRunning = false,
  isConnecting = false,
  isSendBusy = false,
  connection = "connected",
  sessionId,
  browseFilesystem = null,
  onDraftChange,
  onAddPathAttachment,
  onRemovePathAttachment,
  onSend,
  onUpload,
}: ChatComposerProps) {
  const tiffRef = useRef<HTMLInputElement>(null);
  const [explorerMode, setExplorerMode] = useState<PathAttachmentKind | null>(null);
  const [manualAttach, setManualAttach] = useState<{
    kind: PathAttachmentKind;
    initialPath: string;
  } | null>(null);

  const { hasSendableContent } = deriveComposerSendState({
    prompt: draft,
    pathAttachmentCount: pathAttachments.length,
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!hasSendableContent || disabled || isRunning || isSendBusy || isConnecting || !sessionId) {
      return;
    }
    onSend();
  };

  const browseConnected = connection === "connected" && browseFilesystem != null;

  return (
    <>
      <form
        className="mx-auto w-full min-w-0 max-w-208"
        data-chat-composer-form="true"
        onSubmit={handleSubmit}
      >
        <div className="group rounded-[22px] bg-border/40 p-px transition-colors duration-200">
          <div
            className={cn(
              "rounded-[20px] border border-border bg-card transition-colors duration-200 has-focus-visible:border-ring/45",
            )}
          >
            {pathAttachments.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 px-3 pt-3 sm:px-4">
                {pathAttachments.map((attachment) => (
                  <PathAttachmentChip
                    key={attachment.id}
                    attachment={attachment}
                    onRemove={() => onRemovePathAttachment(attachment.id)}
                  />
                ))}
              </div>
            ) : null}
            <textarea
              className={cn(
                "max-h-40 min-h-[72px] w-full resize-none rounded-[20px] bg-transparent px-4 py-3 text-sm outline-none",
                pathAttachments.length > 0 && "pt-2",
                "placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
              )}
              disabled={!sessionId || disabled || isRunning}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (hasSendableContent && sessionId && !disabled && !isRunning && !isSendBusy) {
                    onSend();
                  }
                }
              }}
              placeholder={resolveComposerPlaceholder({
                connection: isConnecting ? "connecting" : connection,
                sessionId,
              })}
              rows={3}
              value={draft}
            />
            <div
              className="flex min-w-0 flex-nowrap items-center justify-between gap-2 px-2.5 pb-2.5 sm:px-3 sm:pb-3"
              data-chat-composer-footer="true"
            >
              <div className="-m-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto p-1">
                <button
                  aria-label="Attach file path"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  disabled={!sessionId || isRunning || !browseConnected}
                  onClick={() => setExplorerMode("file")}
                  type="button"
                >
                  <FileIcon className="size-4" />
                </button>
                <button
                  aria-label="Attach folder path"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  disabled={!sessionId || isRunning || !browseConnected}
                  onClick={() => setExplorerMode("folder")}
                  type="button"
                >
                  <FolderIcon className="size-4" />
                </button>
                {onUpload ? (
                  <>
                    <input
                      accept=".tif,.tiff,image/tiff"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onUpload(file);
                        e.target.value = "";
                      }}
                      ref={tiffRef}
                      type="file"
                    />
                    <button
                      aria-label="Upload TIFF to session (shortcut)"
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                      disabled={!sessionId || isRunning}
                      onClick={() => tiffRef.current?.click()}
                      type="button"
                    >
                      <PaperclipIcon className="size-4" />
                    </button>
                  </>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center justify-end">
                <ComposerPrimaryActions
                  hasSendableContent={hasSendableContent}
                  isConnecting={isConnecting}
                  isRunning={isRunning}
                  isSendBusy={isSendBusy}
                  preserveComposerFocusOnPointerDown
                />
              </div>
            </div>
            <p className="px-4 pb-2.5 text-muted-foreground text-xs sm:px-4">
              <button
                className="underline-offset-2 hover:underline disabled:opacity-50"
                disabled={!sessionId || isRunning}
                onClick={() => setManualAttach({ kind: "file", initialPath: "" })}
                type="button"
              >
                Enter path manually
              </button>
            </p>
          </div>
        </div>
      </form>
      {explorerMode ? (
        <PathExplorerDialog
          browse={browseFilesystem}
          mode={explorerMode}
          open
          onOpenChange={(open) => {
            if (!open) setExplorerMode(null);
          }}
          onSelect={(fullPath) =>
            onAddPathAttachment(createPathAttachment(fullPath, explorerMode))
          }
        />
      ) : null}
      {manualAttach ? (
        <AttachPathDialog
          open
          kind={manualAttach.kind}
          initialPath={manualAttach.initialPath}
          onOpenChange={(open) => {
            if (!open) setManualAttach(null);
          }}
          onConfirm={(path) =>
            onAddPathAttachment(createPathAttachment(path, manualAttach.kind))
          }
        />
      ) : null}
    </>
  );
}
