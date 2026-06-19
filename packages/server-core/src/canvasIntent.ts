import type { CanvasSpec } from "@agent-plot/contracts";

export type CanvasVisibility = {
  raw: boolean;
  fft: boolean;
  line: boolean;
  hist: boolean;
  meta: boolean;
  rowMean: boolean;
};

export function defaultCanvasVisibility(): CanvasVisibility {
  return { raw: true, fft: true, line: true, hist: true, meta: true, rowMean: true };
}

const ELEMENT_BY_KEY: Record<keyof CanvasVisibility, string> = {
  raw: "rawImg",
  fft: "fftImg",
  line: "line",
  hist: "hist",
  meta: "metaSection",
  rowMean: "rowMean",
};

function matches(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function matchesShowDirective(text: string, patterns: RegExp[]): boolean {
  for (const p of patterns) {
    const m = p.exec(text);
    if (!m || m.index === undefined) continue;
    const before = text.slice(Math.max(0, m.index - 12), m.index);
    if (/don'?t\s*$|shouldn'?t\s*$|do\s+not\s*$/i.test(before)) continue;
    return true;
  }
  return false;
}

export function parseCanvasIntentDelta(userText: string): Partial<CanvasVisibility> {
  const t = userText.toLowerCase();
  const delta: Partial<CanvasVisibility> = {};

  const hide = (key: keyof CanvasVisibility, patterns: RegExp[]) => {
    if (matches(t, patterns)) delta[key] = false;
  };
  const show = (key: keyof CanvasVisibility, patterns: RegExp[]) => {
    if (matchesShowDirective(t, patterns)) delta[key] = true;
  };

  const rawWord = String.raw`raw(\s+image|\s+preview|\s+view)?`;
  hide("raw", [
    new RegExp(String.raw`don'?t\s+show(\s+the)?\s+${rawWord}`),
    new RegExp(String.raw`don'?t\s+display(\s+the)?\s+${rawWord}`),
    new RegExp(String.raw`do\s+not\s+show(\s+the)?\s+${rawWord}`),
    new RegExp(String.raw`do\s+not\s+display(\s+the)?\s+${rawWord}`),
    new RegExp(String.raw`shouldn'?t\s+show(\s+the)?\s+${rawWord}`),
    new RegExp(String.raw`hide(\s+the)?\s+${rawWord}`),
    new RegExp(String.raw`no\s+${rawWord}`),
    new RegExp(String.raw`without(\s+the)?\s+${rawWord}`),
    new RegExp(String.raw`without\s+showing(\s+the)?\s+${rawWord}`),
    new RegExp(String.raw`omit(\s+the)?\s+${rawWord}`),
    new RegExp(String.raw`exclude(\s+the)?\s+${rawWord}`),
    new RegExp(String.raw`skip(\s+the)?\s+${rawWord}`),
    new RegExp(String.raw`not\s+show(\s+the)?\s+${rawWord}`),
    new RegExp(String.raw`avoid\s+showing(\s+the)?\s+${rawWord}`),
  ]);
  show("raw", [
    new RegExp(String.raw`show(\s+the)?\s+${rawWord}`),
    new RegExp(String.raw`include(\s+the)?\s+${rawWord}`),
    new RegExp(String.raw`with(\s+the)?\s+${rawWord}`),
  ]);

  const fftWord = String.raw`(fft|fourier)(\s+magnitude|\s+image|\s+preview)?`;
  hide("fft", [
    new RegExp(String.raw`don'?t\s+show(\s+the)?\s+${fftWord}`),
    new RegExp(String.raw`hide(\s+the)?\s+${fftWord}`),
    new RegExp(String.raw`no\s+${fftWord}`),
    new RegExp(String.raw`without(\s+the)?\s+${fftWord}`),
  ]);
  show("fft", [new RegExp(String.raw`show(\s+the)?\s+${fftWord}`)]);

  hide("line", [
    /don'?t\s+show(\s+the)?\s+(line|profile|plot)/,
    /hide(\s+the)?\s+(line|profile)\s+plot/,
    /no\s+(line|profile)\s+plot/,
    /only\s+(the\s+)?histogram/,
  ]);
  hide("hist", [
    /don'?t\s+show(\s+the)?\s+histogram/,
    /hide(\s+the)?\s+histogram/,
    /no\s+histogram/,
    /only\s+(the\s+)?(line|profile)/,
  ]);

  hide("meta", [
    /don'?t\s+show(\s+the)?\s+meta(data)?/,
    /hide(\s+the)?\s+meta(data)?/,
    /no\s+meta(data)?/,
    /without\s+meta(data)?/,
    /only\s+(the\s+)?(images?|charts?|plots?)/,
  ]);
  show("meta", [/show(\s+the)?\s+meta(data)?/, /include\s+meta(data)?/]);

  hide("rowMean", [
    /don'?t\s+show(\s+the)?\s+row\s+mean/,
    /hide(\s+the)?\s+row\s+mean/,
    /no\s+row\s+mean/,
  ]);
  show("rowMean", [/show(\s+the)?\s+row\s+mean/]);

  if (matches(t, [/only\s+fft/, /fft\s+only/, /just\s+(the\s+)?fft/])) {
    delta.raw = false;
    delta.fft = true;
    delta.line = false;
    delta.hist = false;
    delta.meta = false;
    delta.rowMean = false;
  }
  if (matches(t, [/only\s+stats/, /stats\s+only/, /only\s+(the\s+)?charts?/])) {
    delta.raw = false;
    delta.fft = false;
  }
  if (matches(t, [/only\s+meta/, /meta\s+only/, /metadata\s+only/])) {
    delta.raw = false;
    delta.fft = false;
    delta.line = false;
    delta.hist = false;
    delta.rowMean = false;
    delta.meta = true;
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

  const title = elements.title;
  if (title?.props) {
    const parts: string[] = [];
    if (vis.meta) parts.push("meta");
    if (vis.raw) parts.push("raw");
    if (vis.fft) parts.push("FFT");
    if (vis.line || vis.hist || vis.rowMean) parts.push("stats");
    title.props.text = parts.length ? `Data overview (${parts.join(" · ")})` : "Data overview";
  }

  pruneEmptySection(elements, "main", "images");
  pruneEmptySection(elements, "main", "charts");
  pruneEmptySection(elements, "main", "chartsRowMean");
  pruneEmptySection(elements, "main", "metaSection");

  return { root: spec.root, elements };
}

export function describeVisibility(vis: CanvasVisibility): string {
  const on: string[] = [];
  const off: string[] = [];
  for (const [key, enabled] of Object.entries(vis) as [keyof CanvasVisibility, boolean][]) {
    (enabled ? on : off).push(key);
  }
  if (off.length === 0) {
    return "Canvas: showing all panels (metadata, raw, FFT, line plot, histogram, row mean).";
  }
  return `Canvas: showing ${on.join(", ") || "nothing"}; hidden ${off.join(", ")}.`;
}
