import { PaperclipIcon } from "lucide-react";
import { useRef, type FormEvent } from "react";
import { ComposerPrimaryActions } from "@/components/chat/ComposerPrimaryActions.js";
import { deriveComposerSendState } from "@/components/ChatView.logic.js";
import { cn } from "@/lib/utils";

type ChatComposerProps = {
  draft: string;
  disabled?: boolean;
  isRunning?: boolean;
  isConnecting?: boolean;
  isSendBusy?: boolean;
  sessionId: string | null;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onUpload?: (file: File) => void;
};

export function ChatComposer({
  draft,
  disabled,
  isRunning = false,
  isConnecting = false,
  isSendBusy = false,
  sessionId,
  onDraftChange,
  onSend,
  onUpload,
}: ChatComposerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { hasSendableContent } = deriveComposerSendState({ prompt: draft });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!hasSendableContent || disabled || isRunning || isSendBusy || isConnecting || !sessionId) {
      return;
    }
    onSend();
  };

  return (
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
          <textarea
            className={cn(
              "max-h-40 min-h-[72px] w-full resize-none rounded-[20px] bg-transparent px-4 py-3 text-sm outline-none",
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
            onDragOver={(e) => {
              if (onUpload) e.preventDefault();
            }}
            onDrop={(e) => {
              if (!onUpload) return;
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) onUpload(file);
            }}
            placeholder={
              sessionId
                ? "Describe what to analyze (TIFF path or upload)…"
                : "Create a session to chat"
            }
            rows={3}
            value={draft}
          />
          <div
            className="flex min-w-0 flex-nowrap items-center justify-between gap-2 px-2.5 pb-2.5 sm:px-3 sm:pb-3"
            data-chat-composer-footer="true"
          >
            <div className="-m-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto p-1">
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
                    ref={fileRef}
                    type="file"
                  />
                  <button
                    aria-label="Upload TIFF"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                    disabled={!sessionId || isRunning}
                    onClick={() => fileRef.current?.click()}
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
        </div>
      </div>
    </form>
  );
}
