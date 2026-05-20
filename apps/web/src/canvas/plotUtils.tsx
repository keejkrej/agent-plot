export const PLOT_WIDTH = 320;
export const PLOT_HEIGHT = 180;
export const PLOT_PAD = 36;

export const plotSurface = {
  display: "block" as const,
  background: "var(--muted)",
  borderRadius: 8,
  border: "1px solid var(--border)",
};

export function plotEmptyState(title: string | undefined, message: string) {
  return (
    <div className="text-muted-foreground text-xs">
      {title ? `${title}: ` : ""}
      {message}
    </div>
  );
}

export function linearScale(
  _values: number[],
  rangeMin: number,
  rangeMax: number,
  domainMin: number,
  domainMax: number,
) {
  const d = domainMax - domainMin || 1;
  return (v: number) => rangeMin + ((v - domainMin) / d) * (rangeMax - rangeMin);
}

export function plotExtents(x: number[], y: number[]) {
  return {
    minX: Math.min(...x),
    maxX: Math.max(...x),
    minY: Math.min(...y),
    maxY: Math.max(...y),
  };
}
