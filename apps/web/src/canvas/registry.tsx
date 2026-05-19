import { defineRegistry } from "@json-render/react";
import { plotCatalog } from "./catalog.js";

const plotSurface = {
  display: "block" as const,
  background: "var(--muted)",
  borderRadius: 8,
  border: "1px solid var(--border)",
};

function LinePlotSvg({ x, y, title }: { x: number[]; y: number[]; title?: string }) {
  const w = 320;
  const h = 180;
  const pad = 36;
  if (x.length === 0 || y.length === 0 || x.length !== y.length) {
    return (
      <div className="text-muted-foreground text-xs">
        {title ? `${title}: ` : ""}No plot data.
      </div>
    );
  }
  const minX = Math.min(...x);
  const maxX = Math.max(...x);
  const minY = Math.min(...y);
  const maxY = Math.max(...y);
  const dx = maxX - minX || 1;
  const dy = maxY - minY || 1;
  const sx = (v: number) => pad + ((v - minX) / dx) * (w - pad * 2);
  const sy = (v: number) => h - pad - ((v - minY) / dy) * (h - pad * 2);
  const d = x.map((xi, i) => `${i === 0 ? "M" : "L"} ${sx(xi).toFixed(1)} ${sy(y[i]!).toFixed(1)}`).join(" ");
  return (
    <figure className="m-0">
      {title ? <figcaption className="mb-1.5 font-semibold text-sm">{title}</figcaption> : null}
      <svg width={w} height={h} style={plotSurface}>
        <title>{title ?? "Line plot"}</title>
        <path d={d} fill="none" stroke="var(--chart-1)" strokeWidth={1.5} />
      </svg>
    </figure>
  );
}

function HistogramSvg({ x, y, title }: { x: number[]; y: number[]; title?: string }) {
  const w = 320;
  const h = 180;
  const pad = 36;
  if (x.length === 0 || y.length === 0 || x.length !== y.length) {
    return (
      <div className="text-muted-foreground text-xs">
        {title ? `${title}: ` : ""}No histogram data.
      </div>
    );
  }
  const maxY = Math.max(...y, 1);
  return (
    <figure className="m-0">
      {title ? <figcaption className="mb-1.5 font-semibold text-sm">{title}</figcaption> : null}
      <svg width={w} height={h} style={plotSurface}>
        <title>{title ?? "Histogram"}</title>
        {x.map((_, i) => {
          const bh = ((y[i] ?? 0) / maxY) * (h - pad * 2);
          const inner = w - pad * 2;
          const step = inner / Math.max(x.length, 1);
          const bx = pad + i * step;
          const bw = Math.max(1, step * 0.85);
          const by = h - pad - bh;
          return (
            <rect
              key={i}
              x={bx}
              y={by}
              width={bw}
              height={bh}
              fill="var(--chart-2)"
              opacity={0.85}
            />
          );
        })}
      </svg>
    </figure>
  );
}

export const { registry: plotRegistry } = defineRegistry(plotCatalog, {
  components: {
    Stack: ({ props, children }) => {
      const dir = props.direction === "row" ? "row" : "column";
      const gap = props.gap ?? 12;
      return (
        <div
          className="flex w-full min-w-0"
          style={{
            flexDirection: dir,
            gap,
            alignItems: dir === "row" ? "flex-start" : "stretch",
          }}
        >
          {children}
        </div>
      );
    },
    Caption: ({ props }) => (
      <h2 className="m-0 font-semibold text-base text-foreground">{props.text}</h2>
    ),
    PreviewImage: ({ props }) => (
      <figure className="m-0 max-w-[280px]">
        <img
          src={props.src}
          alt={props.caption ?? "preview"}
          className="block w-full rounded-lg border border-border"
        />
        {props.caption ? (
          <figcaption className="mt-1.5 text-muted-foreground text-xs">{props.caption}</figcaption>
        ) : null}
      </figure>
    ),
    LinePlot: ({ props }) => <LinePlotSvg title={props.title} x={props.x} y={props.y} />,
    Histogram: ({ props }) => <HistogramSvg title={props.title} x={props.x} y={props.y} />,
  },
});
