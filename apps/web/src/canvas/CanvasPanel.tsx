import type { Spec } from "@json-render/core";
import {
  ActionProvider,
  Renderer,
  StateProvider,
  ValidationProvider,
  VisibilityProvider,
} from "@json-render/react";
import type { ComponentRenderProps } from "@json-render/react";
import { LayoutGridIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { panelContentPaddingClassName, panelContentScrollClassName } from "@/components/panelHeader.js";
import { Card, CardPanel } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { plotRegistry } from "./registry.js";

function UnknownBlock({ element }: ComponentRenderProps) {
  return (
    <Alert variant="error">
      <AlertTitle>Unknown element type</AlertTitle>
      <AlertDescription>
        <code>{element.type}</code>
      </AlertDescription>
    </Alert>
  );
}

export function CanvasPanel({ spec }: { spec: Spec | null }) {
  if (!spec) {
    return (
      <Empty className={cn("h-full min-h-0 flex-1", panelContentPaddingClassName)}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LayoutGridIcon />
          </EmptyMedia>
          <EmptyTitle>Canvas</EmptyTitle>
          <EmptyDescription>
            Start a session and chat with the assistant; the canvas updates when artifacts are
            available for the session.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <StateProvider initialState={{}}>
        <VisibilityProvider>
          <ActionProvider handlers={{}}>
            <ValidationProvider>
              <div className={cn("json-render-canvas", panelContentScrollClassName)}>
                <div className="h-3 sm:h-4" />
                <Card className="min-w-0 w-full">
                  <CardPanel className="min-w-0">
                    <Renderer spec={spec} registry={plotRegistry} fallback={UnknownBlock} />
                  </CardPanel>
                </Card>
                <div className="h-3 sm:h-4" />
              </div>
            </ValidationProvider>
          </ActionProvider>
        </VisibilityProvider>
      </StateProvider>
    </div>
  );
}
