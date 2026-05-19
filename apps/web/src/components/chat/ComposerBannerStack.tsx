import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ComposerBannerStackItem {
  readonly id: string;
  readonly content: ReactNode;
}

export function ComposerBannerStack({
  className,
  items,
}: {
  readonly className?: string;
  readonly items: ReadonlyArray<ComposerBannerStackItem>;
}) {
  if (items.length === 0) return null;
  return (
    <div className={cn("mx-auto mb-2 max-w-208", className)}>
      {items.map((item) => (
        <div key={item.id}>{item.content}</div>
      ))}
    </div>
  );
}
