import type { ReactNode } from "react";
import { defineRegistry, type ComponentFn } from "@json-render/react";
import { plotCatalog } from "./catalog";

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const Stack: ComponentFn<typeof plotCatalog, "Stack"> = ({ props, children }) => {
  return (
    <div
      className={cn("flex", props.direction === "row" ? "flex-row" : "flex-col")}
      style={{ gap: typeof props.gap === "number" ? props.gap : 12 }}
    >
      {children}
    </div>
  );
};

const Grid: ComponentFn<typeof plotCatalog, "Grid"> = ({ props, children }) => {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${props.columns}, minmax(0, 1fr))`,
        gap: typeof props.gap === "number" ? props.gap : 12,
      }}
    >
      {children}
    </div>
  );
};

const Divider: ComponentFn<typeof plotCatalog, "Divider"> = ({ props }) => {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-border" />
      {props.label ? <span className="text-muted-foreground text-xs">{props.label}</span> : null}
      <div className="h-px flex-1 bg-border" />
    </div>
  );
};

const Caption: ComponentFn<typeof plotCatalog, "Caption"> = ({ props }) => {
  return <h2 className="font-semibold text-lg">{props.text}</h2>;
};

const Metric: ComponentFn<typeof plotCatalog, "Metric"> = ({ props }) => {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-muted-foreground text-xs">{props.label}</div>
      <div className="mt-1 font-mono text-xl">
        {props.value}
        {props.unit ? <span className="text-sm text-muted-foreground"> {props.unit}</span> : null}
      </div>
      {props.hint ? <div className="mt-1 text-muted-foreground text-xs">{props.hint}</div> : null}
    </div>
  );
};

const MetricGrid: ComponentFn<typeof plotCatalog, "MetricGrid"> = ({ props, children }) => {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${props.columns ?? 3}, minmax(0, 1fr))`,
        gap: typeof props.gap === "number" ? props.gap : 8,
      }}
    >
      {children}
    </div>
  );
};

const KeyValueList: ComponentFn<typeof plotCatalog, "KeyValueList"> = ({ props }) => {
  const items = Array.isArray(props.items) ? props.items : [];
  return (
    <dl className="grid gap-1 text-sm" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
      {items.map((item, i) => (
        <div key={i} className="flex justify-between gap-4 border-b py-1 last:border-0">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="font-mono">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
};

const Table: ComponentFn<typeof plotCatalog, "Table"> = ({ props }) => {
  const columns = Array.isArray(props.columns) ? props.columns : [];
  const rows = Array.isArray(props.rows) ? props.rows : [];
  return (
    <div className="overflow-x-auto">
      {props.caption ? <div className="mb-2 font-medium text-sm">{props.caption}</div> : null}
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            {columns.map((c, i) => (
              <th key={i} className="px-2 py-1 text-left font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="border-b">
              {row.map((cell, c) => (
                <td key={c} className="px-2 py-1 font-mono">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Text: ComponentFn<typeof plotCatalog, "Text"> = ({ props }) => {
  const variant = props.variant ?? "default";
  return (
    <p
      className={cn(
        "text-sm",
        variant === "muted" && "text-muted-foreground",
        variant === "small" && "text-xs text-muted-foreground",
      )}
    >
      {props.text}
    </p>
  );
};

const Alert: ComponentFn<typeof plotCatalog, "Alert"> = ({ props }) => {
  const variant = props.variant ?? "default";
  return (
    <div
      className={cn(
        "rounded-md border p-3 text-sm",
        variant === "warning" && "border-amber-500/30 bg-amber-500/10 text-amber-900",
        variant === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
        variant === "success" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-900",
        variant === "info" && "border-blue-500/30 bg-blue-500/10 text-blue-900",
      )}
    >
      <div className="font-medium">{props.title}</div>
      <div className="mt-1">{props.message}</div>
    </div>
  );
};

const PreviewImage: ComponentFn<typeof plotCatalog, "PreviewImage"> = ({ props }) => {
  return (
    <figure className="flex flex-col gap-1">
      <img
        alt={props.caption ?? "preview"}
        className="rounded-md border object-contain max-h-96"
        src={props.src}
      />
      {props.caption ? <figcaption className="text-muted-foreground text-xs">{props.caption}</figcaption> : null}
    </figure>
  );
};

function useNumericArrays(props: { x?: unknown; y?: unknown }) {
  const x = Array.isArray(props.x) ? props.x.map(Number) : [];
  const y = Array.isArray(props.y) ? props.y.map(Number) : [];
  return { x, y, len: Math.min(x.length, y.length) };
}

function SvgChart({
  children,
  height,
  title,
  width,
}: {
  children: ReactNode;
  height?: number;
  title?: string;
  width?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      {title ? <div className="font-medium text-sm">{title}</div> : null}
      <svg
        className="w-full"
        height={height ?? 200}
        preserveAspectRatio="xMidYMid meet"
        viewBox={`0 0 ${width ?? 400} ${height ?? 200}`}
        width={width ?? 400}
      >
        {children}
      </svg>
    </div>
  );
}

const LinePlot: ComponentFn<typeof plotCatalog, "LinePlot"> = ({ props }) => {
  const { x, y, len } = useNumericArrays(props);
  if (len === 0) return null;
  const minX = Math.min(...x);
  const maxX = Math.max(...x);
  const minY = Math.min(...y);
  const maxY = Math.max(...y);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const W = 360;
  const H = 160;
  const pad = 20;
  const toPx = (xi: number, yi: number) => {
    const px = pad + ((xi - minX) / rangeX) * (W - pad * 2);
    const py = H - pad - ((yi - minY) / rangeY) * (H - pad * 2);
    return `${px},${py}`;
  };
  const points = Array.from({ length: len }, (_, i) => toPx(x[i], y[i])).join(" ");
  return (
    <SvgChart title={props.title}>
      <rect fill="transparent" height={H} stroke="currentColor" strokeOpacity={0.2} width={W} x={0} y={0} />
      <polyline fill="none" points={points} stroke="currentColor" strokeWidth={2} />
      {x.map((_, i) => {
        const [cx, cy] = toPx(x[i], y[i]).split(",");
        return <circle cx={cx} cy={cy} fill="currentColor" key={i} r={2} />;
      })}
    </SvgChart>
  );
};

const Histogram: ComponentFn<typeof plotCatalog, "Histogram"> = ({ props }) => {
  const { x, y, len } = useNumericArrays(props);
  if (len === 0) return null;
  const maxY = Math.max(...y, 1);
  const W = 360;
  const H = 160;
  const pad = 20;
  const binWidth = (W - pad * 2) / len;
  return (
    <SvgChart title={props.title}>
      <rect fill="transparent" height={H} stroke="currentColor" strokeOpacity={0.2} width={W} x={0} y={0} />
      {x.map((_, i) => {
        const height = ((y[i] ?? 0) / maxY) * (H - pad * 2);
        const left = pad + i * binWidth;
        const bottom = H - pad;
        return (
          <rect
            fill="currentColor"
            fillOpacity={0.7}
            height={Math.max(0, height)}
            key={i}
            width={Math.max(1, binWidth - 2)}
            x={left}
            y={bottom - height}
          />
        );
      })}
    </SvgChart>
  );
};

const ScatterPlot: ComponentFn<typeof plotCatalog, "ScatterPlot"> = ({ props }) => {
  const { x, y, len } = useNumericArrays(props);
  if (len === 0) return null;
  const minX = Math.min(...x);
  const maxX = Math.max(...x);
  const minY = Math.min(...y);
  const maxY = Math.max(...y);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const W = 360;
  const H = 160;
  const pad = 20;
  return (
    <SvgChart title={props.title}>
      <rect fill="transparent" height={H} stroke="currentColor" strokeOpacity={0.2} width={W} x={0} y={0} />
      {x.map((xi, i) => {
        const px = pad + ((xi - minX) / rangeX) * (W - pad * 2);
        const py = H - pad - ((y[i] - minY) / rangeY) * (H - pad * 2);
        return <circle cx={px} cy={py} fill="currentColor" key={i} r={3} />;
      })}
    </SvgChart>
  );
};

const BarChart: ComponentFn<typeof plotCatalog, "BarChart"> = ({ props }) => {
  const labels = Array.isArray(props.labels) ? props.labels : [];
  const values = Array.isArray(props.values) ? props.values.map(Number) : [];
  const len = Math.min(labels.length, values.length);
  if (len === 0) return null;
  const maxV = Math.max(...values, 1);
  const W = 360;
  const H = 160;
  const pad = 24;
  const barWidth = (W - pad * 2) / len;
  return (
    <SvgChart title={props.title}>
      <rect fill="transparent" height={H} stroke="currentColor" strokeOpacity={0.2} width={W} x={0} y={0} />
      {values.map((v, i) => {
        const height = ((v ?? 0) / maxV) * (H - pad * 2);
        const left = pad + i * barWidth;
        const bottom = H - 8;
        return (
          <g key={i}>
            <rect
              fill="currentColor"
              fillOpacity={0.8}
              height={Math.max(0, height)}
              width={Math.max(1, barWidth - 4)}
              x={left}
              y={bottom - height}
            />
            <text
              className="text-[8px] fill-current"
              textAnchor="middle"
              x={left + barWidth / 2}
              y={bottom + 10}
            >
              {String(labels[i]).slice(0, 8)}
            </text>
          </g>
        );
      })}
    </SvgChart>
  );
};

export const { registry: plotRegistry } = defineRegistry(plotCatalog, {
  components: {
    Stack,
    Grid,
    Divider,
    Caption,
    Metric,
    MetricGrid,
    KeyValueList,
    Table,
    Text,
    Alert,
    PreviewImage,
    LinePlot,
    Histogram,
    ScatterPlot,
    BarChart,
  },
});
