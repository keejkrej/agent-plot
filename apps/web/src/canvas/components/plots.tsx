import {
  linearScale,
  plotEmptyState,
  plotExtents,
  PLOT_HEIGHT,
  PLOT_PAD,
  plotSurface,
  PLOT_WIDTH,
} from "../plotUtils.js";

type SeriesProps = { x: number[]; y: number[]; title?: string };

export function LinePlotSvg({ x, y, title }: SeriesProps) {
  if (x.length === 0 || y.length === 0 || x.length !== y.length) {
    return plotEmptyState(title, "No plot data.");
  }
  const { minX, maxX, minY, maxY } = plotExtents(x, y);
  const sx = linearScale(x, PLOT_PAD, PLOT_WIDTH - PLOT_PAD, minX, maxX);
  const sy = linearScale(y, PLOT_HEIGHT - PLOT_PAD, PLOT_PAD, minY, maxY);
  const d = x
    .map((xi, i) => `${i === 0 ? "M" : "L"} ${sx(xi).toFixed(1)} ${sy(y[i]!).toFixed(1)}`)
    .join(" ");
  return (
    <figure className="m-0">
      {title ? <figcaption className="mb-1.5 font-semibold text-sm">{title}</figcaption> : null}
      <svg width={PLOT_WIDTH} height={PLOT_HEIGHT} style={plotSurface}>
        <title>{title ?? "Line plot"}</title>
        <path d={d} fill="none" stroke="var(--chart-1)" strokeWidth={1.5} />
      </svg>
    </figure>
  );
}

export function HistogramSvg({ x, y, title }: SeriesProps) {
  if (x.length === 0 || y.length === 0 || x.length !== y.length) {
    return plotEmptyState(title, "No histogram data.");
  }
  const maxY = Math.max(...y, 1);
  return (
    <figure className="m-0">
      {title ? <figcaption className="mb-1.5 font-semibold text-sm">{title}</figcaption> : null}
      <svg width={PLOT_WIDTH} height={PLOT_HEIGHT} style={plotSurface}>
        <title>{title ?? "Histogram"}</title>
        {x.map((_, i) => {
          const bh = ((y[i] ?? 0) / maxY) * (PLOT_HEIGHT - PLOT_PAD * 2);
          const inner = PLOT_WIDTH - PLOT_PAD * 2;
          const step = inner / Math.max(x.length, 1);
          const bx = PLOT_PAD + i * step;
          const bw = Math.max(1, step * 0.85);
          const by = PLOT_HEIGHT - PLOT_PAD - bh;
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

export function ScatterPlotSvg({ x, y, title }: SeriesProps) {
  if (x.length === 0 || y.length === 0 || x.length !== y.length) {
    return plotEmptyState(title, "No scatter data.");
  }
  const { minX, maxX, minY, maxY } = plotExtents(x, y);
  const sx = linearScale(x, PLOT_PAD, PLOT_WIDTH - PLOT_PAD, minX, maxX);
  const sy = linearScale(y, PLOT_HEIGHT - PLOT_PAD, PLOT_PAD, minY, maxY);
  return (
    <figure className="m-0">
      {title ? <figcaption className="mb-1.5 font-semibold text-sm">{title}</figcaption> : null}
      <svg width={PLOT_WIDTH} height={PLOT_HEIGHT} style={plotSurface}>
        <title>{title ?? "Scatter plot"}</title>
        {x.map((xi, i) => (
          <circle
            key={i}
            cx={sx(xi)}
            cy={sy(y[i]!)}
            r={2.5}
            fill="var(--chart-3)"
            opacity={0.85}
          />
        ))}
      </svg>
    </figure>
  );
}

export function BarChartSvg({
  labels,
  values,
  title,
}: {
  labels: string[];
  values: number[];
  title?: string;
}) {
  if (labels.length === 0 || values.length === 0 || labels.length !== values.length) {
    return plotEmptyState(title, "No bar chart data.");
  }
  const maxY = Math.max(...values, 1);
  return (
    <figure className="m-0">
      {title ? <figcaption className="mb-1.5 font-semibold text-sm">{title}</figcaption> : null}
      <svg width={PLOT_WIDTH} height={PLOT_HEIGHT} style={plotSurface}>
        <title>{title ?? "Bar chart"}</title>
        {values.map((v, i) => {
          const bh = (v / maxY) * (PLOT_HEIGHT - PLOT_PAD * 2);
          const inner = PLOT_WIDTH - PLOT_PAD * 2;
          const step = inner / Math.max(values.length, 1);
          const bx = PLOT_PAD + i * step;
          const bw = Math.max(1, step * 0.85);
          const by = PLOT_HEIGHT - PLOT_PAD - bh;
          return (
            <rect
              key={i}
              x={bx}
              y={by}
              width={bw}
              height={bh}
              fill="var(--chart-4)"
              opacity={0.85}
            />
          );
        })}
      </svg>
    </figure>
  );
}
