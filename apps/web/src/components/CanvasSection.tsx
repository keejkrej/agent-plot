import type { Spec } from "@json-render/core";
import { TriangleAlertIcon } from "lucide-react";
import { CanvasPanel } from "@/canvas/CanvasPanel.js";
import { panelContentPaddingClassName, panelHeaderClassName } from "@/components/panelHeader.js";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

type CanvasSectionProps = {
  spec: Spec | null;
  canvasError: string | null;
  isLoading?: boolean;
};

export function CanvasSection({ spec, canvasError, isLoading }: CanvasSectionProps) {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col border-l border-border bg-background">
      <header className={panelHeaderClassName}>
        <div className="flex h-7 min-w-0 items-center sm:h-6">
          <span className="text-sm font-medium text-foreground">Canvas</span>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {canvasError ? (
          <Alert className={cn("shrink-0 py-3 sm:py-4", panelContentPaddingClassName)} variant="error">
            <TriangleAlertIcon />
            <AlertTitle>Canvas error</AlertTitle>
            <AlertDescription>{canvasError}</AlertDescription>
          </Alert>
        ) : null}

        {isLoading && !spec ? (
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-4 overflow-auto py-3 sm:py-4",
              panelContentPaddingClassName,
            )}
          >
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
