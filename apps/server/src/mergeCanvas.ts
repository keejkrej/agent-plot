import path from "node:path";
import { parse } from "csv-parse/sync";
import {
  decodeCanvasPayloadRecord,
  type CanvasSpec,
} from "@agent-plot/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";

import type { Session } from "./session/Services/SessionStore.ts";
import { SessionStore } from "./session/Services/SessionStore.ts";

export type { CanvasSpec };

type ElementNode = {
  type?: string;
  props?: Record<string, unknown>;
  children?: string[];
};

type StatsSeries = {
  lineX: number[];
  lineY: number[];
  histX: number[];
  histY: number[];
  rowMeanX: number[];
  rowMeanY: number[];
};

function isPayloadRef(v: unknown): v is { $payload: string } {
  return (
    typeof v === "object" &&
    v !== null &&
    "$payload" in v &&
    typeof (v as { $payload: unknown }).$payload === "string"
  );
}

function resolvePath(sessionDir: string, p: string) {
  const abs = path.resolve(sessionDir, p);
  if (!abs.startsWith(path.resolve(sessionDir))) {
    throw new Error("path escapes session directory");
  }
  return abs;
}

function formatNum(n: unknown): string {
  if (typeof n === "number" && Number.isFinite(n)) {
    if (Number.isInteger(n)) return String(n);
    return n.toPrecision(4).replace(/\.?0+$/, "");
  }
  return String(n ?? "");
}

const readSessionRelativeFile = (sessionDir: string, relativePath: string) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const abs = resolvePath(sessionDir, relativePath);
    return yield* fileSystem.readFileString(abs);
  });

function parseStatsSeries(raw: string): StatsSeries {
  const rows = parse(raw, { columns: true, skip_empty_lines: true }) as {
    kind: string;
    x: string;
    y: string;
  }[];
  const lineX: number[] = [];
  const lineY: number[] = [];
  const histX: number[] = [];
  const histY: number[] = [];
  const rowMeanX: number[] = [];
  const rowMeanY: number[] = [];
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
    } else if (k === "row_mean") {
      rowMeanX.push(x);
      rowMeanY.push(y);
    }
  }
  return { lineX, lineY, histX, histY, rowMeanX, rowMeanY };
}

export const loadStatsSeriesEffect = (sessionDir: string, statsRelative: string) =>
  readSessionRelativeFile(sessionDir, statsRelative).pipe(Effect.map(parseStatsSeries));

type MetaFile = {
  shape?: number[];
  dtype?: string;
  min?: number;
  max?: number;
  p1?: number;
  p99?: number;
  width?: number;
  height?: number;
  sliceIndex?: number;
};

function parseMetaPayload(raw: string) {
  const meta = JSON.parse(raw) as MetaFile;
  const shape = Array.isArray(meta.shape) ? meta.shape : [];
  const shapeStr = shape.length ? shape.join("×") : "—";
  const items = [
    { label: "Shape", value: shapeStr },
    { label: "Dtype", value: String(meta.dtype ?? "—") },
    { label: "Width × height", value: `${meta.width ?? "—"} × ${meta.height ?? "—"}` },
    { label: "Slice index", value: formatNum(meta.sliceIndex) },
    { label: "Min", value: formatNum(meta.min) },
    { label: "Max", value: formatNum(meta.max) },
    { label: "p1", value: formatNum(meta.p1) },
    { label: "p99", value: formatNum(meta.p99) },
  ];
  return {
    metaShape: shapeStr,
    metaDtype: String(meta.dtype ?? "—"),
    metaMin: formatNum(meta.min),
    metaMax: formatNum(meta.max),
    metaP1: formatNum(meta.p1),
    metaP99: formatNum(meta.p99),
    metaItems: items,
  };
}

export const loadMetaPayloadEffect = (sessionDir: string, metaRelative: string) =>
  readSessionRelativeFile(sessionDir, metaRelative).pipe(Effect.map(parseMetaPayload));

type SummaryFile = {
  warnings?: string[];
  histogramPeak?: number;
  dynamicRange?: number;
  table?: { columns?: string[]; rows?: string[][] };
};

function parseSummaryPayload(raw: string) {
  const summary = JSON.parse(raw) as SummaryFile;
  const warnings = Array.isArray(summary.warnings)
    ? summary.warnings.filter((w) => typeof w === "string")
    : [];
  const table = summary.table;
  const columns = Array.isArray(table?.columns) ? table.columns.map(String) : ["Metric", "Value"];
  const rows = Array.isArray(table?.rows)
    ? table.rows.map((row) => (Array.isArray(row) ? row.map(String) : []))
    : [];
  return {
    summaryWarnings: warnings,
    summaryAlertMessage: warnings.join(" "),
    summaryTableColumns: columns,
    summaryTableRows: rows,
  };
}

const emptySummaryPayload = {
  summaryWarnings: [] as string[],
  summaryAlertMessage: "",
  summaryTableColumns: ["Metric", "Value"],
  summaryTableRows: [] as string[][],
};

export const loadSummaryPayloadEffect = (sessionDir: string, summaryRelative: string) =>
  readSessionRelativeFile(sessionDir, summaryRelative).pipe(Effect.map(parseSummaryPayload));

export const buildAugmentedPayloadEffect = (
  sessionDir: string,
  sessionId: string,
  publicOrigin: string,
  payload: Record<string, unknown>,
) =>
  Effect.gen(function* () {
    const augmented: Record<string, unknown> = { ...payload };

    const artifactUrl = (rel: string) => {
      const relClean = rel.replace(/^\.?\//, "").replace(/^artifacts\//, "");
      const artifactPath = `/api/sessions/${sessionId}/artifacts/${relClean}`;
      return publicOrigin ? `${publicOrigin.replace(/\/$/, "")}${artifactPath}` : artifactPath;
    };

    for (const key of ["raw", "fft"]) {
      const v = augmented[key];
      if (typeof v === "string") {
        augmented[key] = artifactUrl(v);
      }
    }

    const statsRel =
      typeof augmented.stats === "string" ? String(augmented.stats) : "./artifacts/stats.csv";
    const series = yield* loadStatsSeriesEffect(sessionDir, statsRel);
    Object.assign(augmented, series);

    const metaRel =
      typeof augmented.meta === "string" ? String(augmented.meta) : "./artifacts/meta.json";
    const metaPayload = yield* loadMetaPayloadEffect(sessionDir, metaRel).pipe(Effect.option);
    if (Option.isSome(metaPayload)) {
      Object.assign(augmented, metaPayload.value);
    }

    const summaryRel =
      typeof augmented.summary === "string"
        ? String(augmented.summary)
        : "./artifacts/summary.json";
    const summaryPayload = yield* loadSummaryPayloadEffect(sessionDir, summaryRel).pipe(
      Effect.catch(() => Effect.succeed(emptySummaryPayload)),
    );
    Object.assign(augmented, summaryPayload);

    return augmented;
  });

export function mergePayloadIntoSpec(template: CanvasSpec, payload: Record<string, unknown>): CanvasSpec {
  let augmented: Record<string, unknown>;
  try {
    augmented = decodeCanvasPayloadRecord(payload);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`invalid payload: ${message}`);
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

/** Drop alerts node when there are no QC warnings. */
export function pruneEmptyAlerts(spec: CanvasSpec): CanvasSpec {
  const elements = JSON.parse(JSON.stringify(spec.elements)) as Record<string, ElementNode>;
  const alerts = elements.alerts;
  const message =
    alerts?.props && typeof alerts.props.message === "string" ? alerts.props.message.trim() : "";
  if (!message) {
    const main = elements.main;
    if (main?.children) {
      main.children = main.children.filter((id) => id !== "alerts");
    }
    delete elements.alerts;
  }
  return { root: spec.root, elements };
}

export const jsonRenderEffect = (
  session: Session,
  sessionId: string,
  publicOrigin: string,
  payload: Record<string, unknown>,
) =>
  Effect.gen(function* () {
    const store = yield* SessionStore;
    const templateRaw = yield* store.readCanvasTemplate(session);
    const template = JSON.parse(templateRaw) as CanvasSpec;
    const fullPayload = yield* buildAugmentedPayloadEffect(
      session.dir,
      sessionId,
      publicOrigin,
      payload,
    );
    const spec = mergePayloadIntoSpec(template, fullPayload);
    return pruneEmptyAlerts(spec);
  });
