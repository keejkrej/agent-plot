import type { FilesystemBrowseEntry, PathAttachmentKind } from "@agent-plot/contracts";
import { FileIcon, FolderIcon, HomeIcon, Loader2Icon, ArrowUpIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
import type { BrowseFilesystemFn } from "@/hooks/useFilesystemBrowse.js";
import {
  directoryBrowseQuery,
  loadLastBrowsePath,
  parentDirectoryPath,
  saveLastBrowsePath,
} from "@/lib/fsBrowsePaths.js";
import { cn } from "@/lib/utils";

type PathExplorerDialogProps = {
  open: boolean;
  mode: PathAttachmentKind;
  browse: BrowseFilesystemFn | null;
  onOpenChange: (open: boolean) => void;
  onSelect: (fullPath: string) => void;
};

export function PathExplorerDialog({
  open,
  mode,
  browse,
  onOpenChange,
  onSelect,
}: PathExplorerDialogProps) {
  const [queryPath, setQueryPath] = useState("~");
  const [listedPath, setListedPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<FilesystemBrowseEntry[]>([]);
  const [selected, setSelected] = useState<FilesystemBrowseEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDirectory = useCallback(
    async (partialPath: string) => {
      if (!browse) {
        setError("Not connected to server");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const browsePath = directoryBrowseQuery(partialPath);
        const result = await browse(browsePath);
        setListedPath(result.parentPath);
        setQueryPath(result.parentPath);
        setEntries(result.entries);
        saveLastBrowsePath(result.parentPath);
        setSelected(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setEntries([]);
      } finally {
        setLoading(false);
      }
    },
    [browse],
  );

  useEffect(() => {
    if (!open) return;
    const initial = loadLastBrowsePath();
    setQueryPath(initial);
    setSelected(null);
    void loadDirectory(initial);
  }, [open, loadDirectory]);

  const canAttach =
    mode === "folder"
      ? Boolean(listedPath)
      : Boolean(selected && selected.kind === "file");

  const title = mode === "folder" ? "Choose folder" : "Choose file";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="flex max-h-[min(80vh,560px)] max-w-lg flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Browse paths on the machine running the API server.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1 border-b border-border px-2 py-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 shrink-0"
            aria-label="Home directory"
            disabled={loading}
            onClick={() => void loadDirectory("~")}
          >
            <HomeIcon className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 shrink-0"
            aria-label="Parent directory"
            disabled={loading || !listedPath}
            onClick={() => void loadDirectory(parentDirectoryPath(queryPath))}
          >
            <ArrowUpIcon className="size-4" />
          </Button>
          <Input
            className="h-8 min-w-0 flex-1 font-mono text-xs"
            value={queryPath}
            disabled={loading}
            onChange={(e) => setQueryPath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void loadDirectory(queryPath);
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="shrink-0"
            disabled={loading}
            onClick={() => void loadDirectory(queryPath)}
          >
            Go
          </Button>
        </div>

        <div className="min-h-[240px] flex-1 overflow-y-auto px-1 py-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-sm">
              <Loader2Icon className="size-4 animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <p className="px-3 py-8 text-destructive text-sm">{error}</p>
          ) : entries.length === 0 ? (
            <p className="px-3 py-8 text-muted-foreground text-sm">Empty directory</p>
          ) : (
            <ul className="flex flex-col">
              {entries.map((entry) => {
                const Icon = entry.kind === "directory" ? FolderIcon : FileIcon;
                const isSelected = selected?.fullPath === entry.fullPath;
                const selectable = mode === "folder" ? entry.kind === "directory" : true;
                return (
                  <li key={entry.fullPath}>
                    <button
                      type="button"
                      disabled={!selectable && entry.kind === "file" && mode === "folder"}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                        selectable && "hover:bg-muted",
                        isSelected && "bg-muted",
                        !selectable && mode === "folder" && entry.kind === "file" && "opacity-40",
                      )}
                      onClick={() => {
                        if (entry.kind === "directory") {
                          if (mode === "folder") {
                            setSelected(entry);
                          }
                          void loadDirectory(entry.fullPath);
                          return;
                        }
                        if (mode === "file") setSelected(entry);
                      }}
                      onDoubleClick={() => {
                        if (entry.kind === "directory" && mode === "folder") {
                          onSelect(entry.fullPath);
                          onOpenChange(false);
                        } else if (entry.kind === "file" && mode === "file") {
                          onSelect(entry.fullPath);
                          onOpenChange(false);
                        }
                      }}
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="border-t border-border px-4 py-3">
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            type="button"
            disabled={!canAttach}
            onClick={() => {
              if (mode === "folder") {
                if (!listedPath) return;
                onSelect(listedPath);
              } else if (selected?.kind === "file") {
                onSelect(selected.fullPath);
              } else {
                return;
              }
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
