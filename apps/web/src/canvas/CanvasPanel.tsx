import type { Spec } from "@json-render/core";
import {
  ActionProvider,
  Renderer,
  StateProvider,
  ValidationProvider,
  VisibilityProvider,
} from "@json-render/react";
import type { ComponentRenderProps } from "@json-render/react";
import { plotRegistry } from "./registry.js";

function UnknownBlock({ element }: ComponentRenderProps) {
  return (
    <div
      style={{
        padding: 12,
        border: "1px dashed #f85149",
        borderRadius: 8,
        fontSize: 12,
        color: "#f85149",
      }}
    >
      Unknown element type: <code>{element.type}</code>
    </div>
  );
}

export function CanvasPanel({ spec }: { spec: Spec | null }) {
  return (
    <StateProvider initialState={{}}>
      <VisibilityProvider>
        <ActionProvider handlers={{}}>
          <ValidationProvider>
            <div
              style={{
                minHeight: 200,
                padding: 16,
                background: "#010409",
                borderRadius: 12,
                border: "1px solid #21262d",
              }}
            >
              <Renderer spec={spec} registry={plotRegistry} fallback={UnknownBlock} />
            </div>
          </ValidationProvider>
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}
