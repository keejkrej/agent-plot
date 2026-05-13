import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { z } from "zod";

const PayloadSchema = z.record(z.string(), z.unknown());

export type CanvasSpec = {
  root: string;
  elements: Record<string, unknown>;
};

function isPayloadRef(v: unknown): v is { $payload: string } {
  return typeof v === "object" && v !== null && "$payload" in v && typeof (v as { $payload: unknown }).$payload === "string";
}

function resolvePath(sessionDir: string, p: string) {
  const abs = path.resolve(sessionDir, p);
  if (!abs.startsWith(path.resolve(sessionDir))) {
    throw new Error("path escapes session directory");
  }
  return abs;
}

export async function loadStatsSeries(
  sessionDir: string,
  statsRelative: string,
): Promise<{ lineX: number[]; lineY: number[]; histX: number[]; histY: number[] }> {
  const abs = resolvePath(sessionDir, statsRelative);
  const raw = await readFile(abs, "utf-8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true }) as { kind: string; x: string; y: string }[];
  const lineX: number[] = [];
  const lineY: number[] = [];
  const histX: number[] = [];
  const histY: number[] = [];
  for (const r of rows) {
    const k = r.kind;
    const x = Number(r.x);
    const y = Number(r.y);
    if (k === "profile") {
      lineX.push(x);
      lineY.push(y);
    } else if (k === "hist") {
      histX.push(x);
      histY.push(y);
    }
  }
  return { lineX, lineY, histX, histY };
}

export function mergePayloadIntoSpec(
  sessionDir: string,
  sessionId: string,
  publicOrigin: string,
  template: CanvasSpec,
  payload: Record<string, unknown>,
): CanvasSpec {
  const parsed = PayloadSchema.safeParse(payload);
  if (!parsed.success) throw new Error(`invalid payload: ${parsed.error.message}`);

  const augmented: Record<string, unknown> = { ...parsed.data };

  const statsPath = typeof augmented.stats === "string" ? (augmented.stats as string) : "./artifacts/stats.csv";
  // stats series filled synchronously by caller before merge — we need async; split API

  const artifactUrl = (rel: string) => {
    const relClean = rel.replace(/^\.?\//, "");
    return `${publicOrigin}/api/sessions/${sessionId}/artifacts/${relClean}`;
  };

  for (const key of ["raw", "fft"]) {
    const v = augmented[key];
    if (typeof v === "string") {
      augmented[key] = artifactUrl(v);
    }
  }

  const clone = JSON.parse(JSON.stringify(template)) as CanvasSpec;

  const walk = (node: unknown): unknown => {
    if (isPayloadRef(node)) {
      const k = node.$payload;
      const val = augmented[k];
      if (val === undefined) throw new Error(`missing payload key: ${k}`);
      return val;
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      const o = node as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(o)) out[k] = walk(v);
      return out;
    }
    return node;
  };

  const elements: Record<string, unknown> = {};
  for (const [k, el] of Object.entries(clone.elements)) {
    elements[k] = walk(el);
  }
  return { root: clone.root, elements };
}

export async function jsonRender(
  sessionDir: string,
  sessionId: string,
  publicOrigin: string,
  payload: Record<string, unknown>,
): Promise<CanvasSpec> {
  const raw = await readFile(path.join(sessionDir, "canvas.json"), "utf-8");
  const template = JSON.parse(raw) as CanvasSpec;
  const statsRel = typeof payload.stats === "string" ? String(payload.stats) : "./artifacts/stats.csv";
  const series = await loadStatsSeries(sessionDir, statsRel);
  const fullPayload = {
    ...payload,
    lineX: series.lineX,
    lineY: series.lineY,
    histX: series.histX,
    histY: series.histY,
  };
  return mergePayloadIntoSpec(sessionDir, sessionId, publicOrigin, template, fullPayload);
}
