import type { Spec } from "@json-render/core";
import {
  ActionProvider,
  Renderer,
  StateProvider,
  ValidationProvider,
  VisibilityProvider,
} from "@json-render/react";
import type { ComponentRenderProps } from "@json-render/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Frame, FramePanel } from "@/components/ui/frame";
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
  return (
    <StateProvider initialState={{}}>
      <VisibilityProvider>
        <ActionProvider handlers={{}}>
          <ValidationProvider>
            <Frame className="min-h-52">
              <FramePanel className="min-h-52 overflow-hidden bg-code p-4">
                <Renderer spec={spec} registry={plotRegistry} fallback={UnknownBlock} />
              </FramePanel>
            </Frame>
          </ValidationProvider>
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}
