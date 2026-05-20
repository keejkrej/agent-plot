import type { ReactNode } from "react";

export function StackLayout({
  direction,
  gap,
  children,
}: {
  direction: "column" | "row";
  gap?: number;
  children: ReactNode;
}) {
  const dir = direction === "row" ? "row" : "column";
  return (
    <div
      className="flex w-full min-w-0"
      style={{
        flexDirection: dir,
        gap: gap ?? 12,
        alignItems: dir === "row" ? "flex-start" : "stretch",
      }}
    >
      {children}
    </div>
  );
}

export function GridLayout({
  columns,
  gap,
  children,
}: {
  columns: number;
  gap?: number;
  children: ReactNode;
}) {
  const cols = Math.max(1, Math.min(columns, 6));
  return (
    <div
      className="grid w-full min-w-0"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: gap ?? 12,
      }}
    >
      {children}
    </div>
  );
}

export function MetricGridLayout({
  columns,
  gap,
  children,
}: {
  columns?: number;
  gap?: number;
  children: ReactNode;
}) {
  return <GridLayout columns={columns ?? 3} gap={gap} children={children} />;
}

export function CaptionHeading({ text }: { text: string }) {
  return <h2 className="m-0 font-semibold text-base text-foreground">{text}</h2>;
}

export function DividerLine({ label }: { label?: string }) {
  return (
    <div className="flex w-full min-w-0 items-center gap-3">
      <div className="h-px min-w-0 flex-1 bg-border" />
      {label ? <span className="shrink-0 text-muted-foreground text-xs uppercase tracking-wide">{label}</span> : null}
      <div className="h-px min-w-0 flex-1 bg-border" />
    </div>
  );
}
