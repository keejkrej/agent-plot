import type { Spec } from "@json-render/core";
import { LayoutGridIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CanvasPanel } from "@/canvas/CanvasPanel.js";

type CanvasSectionProps = {
  spec: Spec | null;
  canvasError: string | null;
  sessionId: string | null;
  isLoading?: boolean;
};

export function CanvasSection({ spec, canvasError, sessionId, isLoading }: CanvasSectionProps) {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-11 shrink-0 items-center gap-2 border-border border-b px-4">
        <LayoutGridIcon className="size-4 text-muted-foreground" />
        <span className="font-medium text-sm">Canvas</span>
        {sessionId ? (
          <span className="font-mono text-muted-foreground text-xs">{sessionId.slice(0, 8)}</span>
        ) : null}
        {isLoading ? (
          <span className="text-muted-foreground text-xs">Updating…</span>
        ) : null}
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-auto">
        {canvasError ? (
          <Alert className="m-4 shrink-0" variant="error">
            <TriangleAlertIcon />
            <AlertTitle>Canvas error</AlertTitle>
            <AlertDescription>{canvasError}</AlertDescription>
          </Alert>
        ) : null}

        {isLoading && !spec ? (
          <div className="flex flex-col gap-4 p-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-40 w-full max-w-md" />
            <Skeleton className="h-40 w-full max-w-md" />
          </div>
        ) : (
          <CanvasPanel spec={spec} />
        )}
      </div>
    </section>
  );
}
