import { defineRegistry } from "@json-render/react";
import { plotCatalog } from "./catalog.js";

function LinePlotSvg({ x, y, title }: { x: number[]; y: number[]; title?: string }) {
  const w = 320;
  const h = 180;
  const pad = 36;
  if (x.length === 0 || y.length === 0 || x.length !== y.length) {
    return (
      <div style={{ fontSize: 12, color: "#888" }}>
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
    <figure style={{ margin: 0 }}>
      {title ? (
        <figcaption style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{title}</figcaption>
      ) : null}
      <svg width={w} height={h} style={{ display: "block", background: "#0d1117", borderRadius: 8 }}>
        <title>{title ?? "Line plot"}</title>
        <path d={d} fill="none" stroke="#58a6ff" strokeWidth={1.5} />
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
      <div style={{ fontSize: 12, color: "#888" }}>
        {title ? `${title}: ` : ""}No histogram data.
      </div>
    );
  }
  const maxY = Math.max(...y, 1);
  return (
    <figure style={{ margin: 0 }}>
      {title ? (
        <figcaption style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{title}</figcaption>
      ) : null}
      <svg width={w} height={h} style={{ display: "block", background: "#0d1117", borderRadius: 8 }}>
        <title>{title ?? "Histogram"}</title>
        {x.map((_, i) => {
          const bh = ((y[i] ?? 0) / maxY) * (h - pad * 2);
          const inner = w - pad * 2;
          const step = inner / Math.max(x.length, 1);
          const bx = pad + i * step;
          const bw = Math.max(1, step * 0.85);
          const by = h - pad - bh;
          return <rect key={i} x={bx} y={by} width={bw} height={bh} fill="#3fb950" opacity={0.85} />;
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
          style={{
            display: "flex",
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
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#e6edf3" }}>{props.text}</h2>
    ),
    PreviewImage: ({ props }) => (
      <figure style={{ margin: 0, maxWidth: 280 }}>
        <img
          src={props.src}
          alt={props.caption ?? "preview"}
          style={{ width: "100%", height: "auto", borderRadius: 8, display: "block", border: "1px solid #30363d" }}
        />
        {props.caption ? (
          <figcaption style={{ fontSize: 11, color: "#8b949e", marginTop: 6 }}>{props.caption}</figcaption>
        ) : null}
      </figure>
    ),
    LinePlot: ({ props }) => <LinePlotSvg title={props.title} x={props.x} y={props.y} />,
    Histogram: ({ props }) => <HistogramSvg title={props.title} x={props.x} y={props.y} />,
  },
});
