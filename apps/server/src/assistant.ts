import { describeTiff } from "./pythonRun.js";

type DescribeOk = {
  ok: true;
  path: string;
  shape: number[];
  dtype: string;
  min: number;
  max: number;
  p1: number;
  p99: number;
};

function isDescribeOk(v: unknown): v is DescribeOk {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    o.ok === true &&
    typeof o.path === "string" &&
    Array.isArray(o.shape) &&
    typeof o.dtype === "string" &&
    typeof o.min === "number" &&
    typeof o.max === "number" &&
    typeof o.p1 === "number" &&
    typeof o.p99 === "number"
  );
}

async function remoteAgent(url: string, sessionId: string, userText: string): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, text: userText }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) return `[agent] HTTP ${res.status} ${res.statusText}`;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const body = (await res.json()) as unknown;
    if (typeof body === "string") return body;
    if (body && typeof body === "object") {
      const o = body as Record<string, unknown>;
      if (typeof o.reply === "string") return o.reply;
      if (typeof o.text === "string") return o.text;
      if (typeof o.message === "string") return o.message;
    }
    return JSON.stringify(body);
  }
  return (await res.text()).trim();
}

/**
 * Optional HTTP agent (`AGENT_PLOT_AGENT_URL`): POST JSON `{ sessionId, text }`, response JSON `{ reply }` / `{ text }` or plain text.
 * Otherwise a local stub uses `describe_tiff` when an input file exists.
 */
export async function assistantReply(sessionId: string, sessionDir: string, userText: string): Promise<string> {
  const url = process.env.AGENT_PLOT_AGENT_URL?.trim();
  if (url) {
    try {
      return await remoteAgent(url, sessionId, userText);
    } catch (e) {
      return `[agent] ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  const d = await describeTiff(sessionDir);
  if (d.ok && isDescribeOk(d.data)) {
    const m = d.data;
    return [
      `Assistant (stub): ${m.path} — shape [${m.shape.join("×")}], dtype ${m.dtype}.`,
      `Value range about ${m.min.toFixed(3)}–${m.max.toFixed(3)} (p1–p99: ${m.p1.toFixed(3)}–${m.p99.toFixed(3)}).`,
      "",
      `Your message: ${userText.slice(0, 800)}${userText.length > 800 ? "…" : ""}`,
    ].join("\n");
  }

  return [
    "Assistant (stub): no TIFF in this session yet, or describe failed.",
    d.ok ? "" : `(${d.stderr})`,
    "",
    `Your message: ${userText.slice(0, 400)}${userText.length > 400 ? "…" : ""}`,
  ]
    .filter(Boolean)
    .join("\n");
}
