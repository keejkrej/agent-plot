import type { PathAttachmentKind } from "@agent-plot/contracts";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { normalizePathInput } from "@/lib/pathAttachments.js";

type AttachPathDialogProps = {
  open: boolean;
  kind: PathAttachmentKind;
  initialPath?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (path: string) => void;
};

export function AttachPathDialog({
  open,
  kind,
  initialPath = "",
  onOpenChange,
  onConfirm,
}: AttachPathDialogProps) {
  const [value, setValue] = useState(initialPath);

  useEffect(() => {
    if (open) setValue(initialPath);
  }, [open, initialPath]);

  const title = kind === "folder" ? "Attach folder" : "Attach file";
  const description =
    kind === "folder"
      ? "Absolute or relative path to a directory on disk (the agent reads it from your machine)."
      : "Absolute or relative path to a data file (.tif, .h5, .csv, .npy, …).";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          placeholder={kind === "folder" ? "/data/experiment/run-01" : "/data/sample.tif"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const path = normalizePathInput(value);
              if (path) {
                onConfirm(path);
                onOpenChange(false);
              }
            }
          }}
        />
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            type="button"
            onClick={() => {
              const path = normalizePathInput(value);
              if (!path) return;
              onConfirm(path);
              onOpenChange(false);
            }}
          >
            Attach
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
