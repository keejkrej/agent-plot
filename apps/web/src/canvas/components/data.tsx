import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export function PreviewImageBlock({
  src,
  caption,
}: {
  src: string;
  caption?: string;
}) {
  return (
    <figure className="m-0 max-w-[280px]">
      <img
        src={src}
        alt={caption ?? "preview"}
        className="block w-full rounded-lg border border-border"
      />
      {caption ? (
        <figcaption className="mt-1.5 text-muted-foreground text-xs">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

export function MetricBlock({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-muted/30 px-3 py-2">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-semibold text-foreground text-sm tabular-nums">
        {value}
        {unit ? <span className="ml-0.5 font-normal text-muted-foreground text-xs">{unit}</span> : null}
      </div>
      {hint ? <div className="mt-0.5 text-muted-foreground text-xs">{hint}</div> : null}
    </div>
  );
}

export function KeyValueListBlock({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  if (items.length === 0) {
    return <div className="text-muted-foreground text-xs">No metadata.</div>;
  }
  return (
    <dl className="m-0 grid gap-1.5 text-sm">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[minmax(6rem,auto)_1fr] gap-2">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="m-0 font-mono text-foreground text-xs break-all">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TableBlock({
  columns,
  rows,
  caption,
}: {
  columns: string[];
  rows: string[][];
  caption?: string;
}) {
  if (columns.length === 0) {
    return <div className="text-muted-foreground text-xs">No table data.</div>;
  }
  return (
    <figure className="m-0 w-full min-w-0 overflow-x-auto">
      <table className="w-full min-w-[240px] border-collapse text-sm">
        {caption ? <caption className="mb-2 text-left font-semibold text-sm">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th key={col} className="px-2 py-1.5 text-left font-medium text-muted-foreground text-xs">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/60">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-1.5 font-mono text-xs">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function TextBlock({ text, variant }: { text: string; variant?: "default" | "muted" | "small" }) {
  return (
    <p
      className={cn(
        "m-0 whitespace-pre-wrap",
        variant === "muted" && "text-muted-foreground",
        variant === "small" && "text-muted-foreground text-xs",
        (!variant || variant === "default") && "text-foreground text-sm",
      )}
    >
      {text}
    </p>
  );
}

const alertVariantMap = {
  default: "default",
  info: "info",
  warning: "warning",
  error: "error",
  success: "success",
} as const;

export function AlertBlock({
  title,
  message,
  variant,
}: {
  title: string;
  message: string;
  variant?: keyof typeof alertVariantMap;
}) {
  const v = alertVariantMap[variant ?? "warning"] ?? "warning";
  return (
    <Alert variant={v}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
