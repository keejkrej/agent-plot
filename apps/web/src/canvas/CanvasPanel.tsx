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
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LayoutGridIcon />
          </EmptyMedia>
          <EmptyTitle>Canvas</EmptyTitle>
          <EmptyDescription>
            Start a session and chat with the assistant; the canvas updates when artifacts are available for the session.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <StateProvider initialState={{}}>
      <VisibilityProvider>
        <ActionProvider handlers={{}}>
          <ValidationProvider>
            <div className="w-full flex-1 p-6">
              <Renderer spec={spec} registry={plotRegistry} fallback={UnknownBlock} />
            </div>
          </ValidationProvider>
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}
