import {
  ActionProvider,
  Renderer,
  StateProvider,
  ValidationProvider,
  VisibilityProvider,
  type Spec,
} from "@json-render/react";
import { LayoutGridIcon } from "lucide-react";
import { plotRegistry } from "./registry";

export type CanvasSpec = Spec;

export function CanvasPanel({ spec }: { spec: CanvasSpec | null }) {
  if (!spec) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
        <LayoutGridIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
        <h2 className="font-semibold">Canvas</h2>
        <p className="mt-1 max-w-sm text-muted-foreground text-sm">
          Start a session and tell the assistant where your data is on disk. The canvas updates
          after it writes artifacts under the session (e.g. from build_artifacts on a TIFF path).
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto p-4">
      <StateProvider initialState={{}}>
        <VisibilityProvider>
          <ActionProvider handlers={{}}>
            <ValidationProvider>
              <div className="mx-auto w-full max-w-4xl">
                <Renderer
                  fallback={({ element }) => (
                    <div className="rounded border border-destructive/30 bg-destructive/5 p-2 text-sm">
                      Unknown element type: <code>{element.type}</code>
                    </div>
                  )}
                  registry={plotRegistry}
                  spec={spec}
                />
              </div>
            </ValidationProvider>
          </ActionProvider>
        </VisibilityProvider>
      </StateProvider>
    </div>
  );
}
