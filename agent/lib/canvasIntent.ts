import type { CanvasSpec } from "#lib/contracts";

export type CanvasVisibility = {
  table: boolean;
  metrics: boolean;
  bar: boolean;
  hist: boolean;
};

export function defaultCanvasVisibility(): CanvasVisibility {
  return { table: true, metrics: true, bar: true, hist: true };
}

const ELEMENT_BY_KEY: Record<keyof CanvasVisibility, string> = {
  table: "summaryTable",
  metrics: "metaSection",
  bar: "barPlot",
  hist: "histPlot",
};

function matches(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

export function parseCanvasIntentDelta(userText: string): Partial<CanvasVisibility> {
  const t = userText.toLowerCase();
  const delta: Partial<CanvasVisibility> = {};

  if (matches(t, [/no\s+table/, /hide\s+the\s+table/, /don'?t\s+show\s+the\s+table/])) {
    delta.table = false;
  }
  if (matches(t, [/show\s+the\s+table/, /include\s+the\s+table/])) {
    delta.table = true;
  }

  if (matches(t, [/no\s+metrics/, /hide\s+metrics/, /don'?t\s+show\s+metrics/])) {
    delta.metrics = false;
  }
  if (matches(t, [/show\s+metrics/, /include\s+metrics/])) {
    delta.metrics = true;
  }

  if (matches(t, [/no\s+bar\s*chart/, /hide\s+bar\s*chart/])) {
    delta.bar = false;
  }
  if (matches(t, [/show\s+bar\s*chart/, /include\s+bar\s*chart/])) {
    delta.bar = true;
  }

  if (matches(t, [/no\s+histogram/, /hide\s+histogram/])) {
    delta.hist = false;
  }
  if (matches(t, [/show\s+histogram/, /include\s+histogram/])) {
    delta.hist = true;
  }

  return delta;
}

export function mergeCanvasVisibility(
  prev: CanvasVisibility,
  delta: Partial<CanvasVisibility>,
): CanvasVisibility {
  return { ...prev, ...delta };
}

type ElementNode = {
  type?: string;
  props?: Record<string, unknown>;
  children?: string[];
};

function pruneEmptySection(
  elements: Record<string, ElementNode>,
  mainId: string,
  sectionId: string,
) {
  const section = elements[sectionId];
  if (section && Array.isArray(section.children) && section.children.length === 0) {
    const main = elements[mainId];
    if (main?.children) {
      main.children = main.children.filter((id) => id !== sectionId);
    }
    delete elements[sectionId];
  }
}

export function applyCanvasVisibility(spec: CanvasSpec, vis: CanvasVisibility): CanvasSpec {
  const hideIds = new Set<string>();
  for (const [key, on] of Object.entries(vis) as [keyof CanvasVisibility, boolean][]) {
    if (!on) hideIds.add(ELEMENT_BY_KEY[key]);
  }

  const elements = JSON.parse(JSON.stringify(spec.elements)) as Record<string, ElementNode>;

  for (const el of Object.values(elements)) {
    if (!Array.isArray(el.children)) continue;
    el.children = el.children.filter((id) => !hideIds.has(id));
  }

  const used = new Set<string>();
  const walk = (id: string) => {
    if (used.has(id)) return;
    used.add(id);
    const el = elements[id];
    if (el?.children) for (const c of el.children) walk(c);
  };
  walk(spec.root);
  for (const id of Object.keys(elements)) {
    if (!used.has(id)) delete elements[id];
  }

  pruneEmptySection(elements, "main", "metaSection");
  pruneEmptySection(elements, "main", "charts");

  return { root: spec.root, elements };
}

export function describeVisibility(vis: CanvasVisibility): string {
  const on: string[] = [];
  const off: string[] = [];
  for (const [key, enabled] of Object.entries(vis) as [keyof CanvasVisibility, boolean][]) {
    (enabled ? on : off).push(key);
  }
  if (off.length === 0) {
    return "Canvas: showing all panels (metrics, table, bar chart, histogram).";
  }
  return `Canvas: showing ${on.join(", ") || "nothing"}; hidden ${off.join(", ")}.`;
}
