import { Agent, CursorAgentError, type SDKAgent } from "@cursor/sdk";
import path from "node:path";
import { describeVisibility, type CanvasVisibility } from "./canvasIntent.js";
import { PY_ANALYSIS_ROOT, REPO_ROOT } from "./pythonRun.js";
import { readSessionAgentId, type Session, writeSessionAgentId } from "./session.js";

const liveAgents = new Map<string, SDKAgent>();

function apiKey(): string | undefined {
  return process.env.CURSOR_API_KEY?.trim() || undefined;
}

function modelSelection() {
  const id = process.env.AGENT_PLOT_CURSOR_MODEL?.trim() || "composer-2";
  return { id };
}

function agentOptions(session: Session) {
  const key = apiKey();
  if (!key) throw new Error("CURSOR_API_KEY is not set");
  return {
    apiKey: key,
    model: modelSelection(),
    name: `agent-plot-${session.id.slice(0, 8)}`,
    local: {
      cwd: REPO_ROOT,
      settingSources: [],
    },
  };
}

function pythonToolsGuide(sessionDir: string): string {
  const describeScript = path.join(PY_ANALYSIS_ROOT, "scripts", "describe_tiff.py");
  const buildScript = path.join(PY_ANALYSIS_ROOT, "scripts", "build_artifacts.py");
  return [
    "## Python analysis tools (you choose when to run them)",
    "Read the user message and decide which script fits. Do not assume a fixed TIFF location.",
    "",
    `Session workspace (write artifacts here): ${sessionDir}`,
    `Python project: ${PY_ANALYSIS_ROOT}`,
    "",
    "**describe_tiff.py** — quick metadata (shape, dtype, intensity percentiles).",
    "```bash",
    `uv run --directory "${PY_ANALYSIS_ROOT}" python "${describeScript}" "${sessionDir}" "<absolute-or-relative-tiff-path>"`,
    "```",
    "",
    "**build_artifacts.py** — canvas artifacts under session artifacts/ (previews, stats, metadata).",
    "Run this when the user wants plots/canvas previews. Pass the TIFF path they refer to.",
    "```bash",
    `uv run --directory "${PY_ANALYSIS_ROOT}" python "${buildScript}" "${sessionDir}" "<absolute-or-relative-tiff-path>"`,
    "```",
    "",
    "After build_artifacts succeeds, artifacts live at:",
    `- ${path.join(sessionDir, "artifacts/raw_preview.png")}`,
    `- ${path.join(sessionDir, "artifacts/fft_mag.png")}`,
    `- ${path.join(sessionDir, "artifacts/stats.csv")} (profile, hist, row_mean series)`,
    `- ${path.join(sessionDir, "artifacts/meta.json")}`,
    `- ${path.join(sessionDir, "artifacts/summary.json")}`,
    "",
    "Canvas json-render component types (see apps/web/src/canvas/catalog.ts):",
    "Stack, Grid, Divider, Caption, Metric, MetricGrid, KeyValueList, Table, Text, Alert,",
    "PreviewImage, LinePlot, Histogram, ScatterPlot, BarChart.",
    "Layout template: session canvas.json (copied from starter-canvas.json). Use $payload keys in props.",
    "",
    "Use your shell/read tools to verify paths exist before running. Interpret paths from the user's wording.",
  ].join("\n");
}

function buildPrompt(sessionDir: string, userText: string, visibility: CanvasVisibility): string {
  return [
    "You are the scientific imaging assistant for agent-plot.",
    pythonToolsGuide(sessionDir),
    "",
    describeVisibility(visibility),
    "The server applies canvas panel visibility from the user's wording (hide/show raw, FFT, metadata, charts, row mean).",
    "Answer in clear prose after you have inspected data or script output.",
    "Do not edit canvas.json unless the user explicitly asks to change the layout.",
    "",
    "User message:",
    userText,
  ].join("\n");
}

async function createOrResumeAgent(session: Session): Promise<SDKAgent> {
  const opts = agentOptions(session);
  const savedId = await readSessionAgentId(session);
  if (savedId) {
    try {
      return await Agent.resume(savedId, opts);
    } catch {
      /* fall through to fresh agent */
    }
  }
  const agent = await Agent.create(opts);
  await writeSessionAgentId(session, agent.agentId);
  return agent;
}

async function getSessionAgent(session: Session): Promise<SDKAgent> {
  const cached = liveAgents.get(session.id);
  if (cached) return cached;
  const agent = await createOrResumeAgent(session);
  liveAgents.set(session.id, agent);
  return agent;
}

async function streamRun(
  run: Awaited<ReturnType<SDKAgent["send"]>>,
  onDelta?: (text: string) => void,
): Promise<string> {
  let full = "";
  if (run.supports("stream")) {
    for await (const event of run.stream()) {
      if (event.type !== "assistant") continue;
      for (const block of event.message.content) {
        if (block.type === "text" && block.text) {
          full += block.text;
          onDelta?.(block.text);
        }
      }
    }
  }
  const result = await run.wait();
  if (result.status === "error") {
    throw new Error(`agent run failed (${result.id})`);
  }
  const tail = result.result?.trim();
  if (tail && !full.includes(tail)) {
    full += tail;
    onDelta?.(tail);
  }
  return full.trim();
}

export function isCursorAgentConfigured(): boolean {
  return Boolean(apiKey());
}

/** Run the Cursor SDK local agent for this session (multi-turn via resume). */
export async function cursorAssistantReply(
  session: Session,
  sessionDir: string,
  userText: string,
  visibility: CanvasVisibility,
  onDelta?: (text: string) => void,
): Promise<string> {
  const agent = await getSessionAgent(session);
  const prompt = buildPrompt(sessionDir, userText, visibility);
  const run = await agent.send(prompt);
  return streamRun(run, onDelta);
}

export async function disposeSessionAgent(sessionId: string): Promise<void> {
  const agent = liveAgents.get(sessionId);
  if (!agent) return;
  liveAgents.delete(sessionId);
  await agent[Symbol.asyncDispose]();
}

export function formatCursorAgentError(err: unknown): string {
  if (err instanceof CursorAgentError) {
    return `[cursor agent] ${err.message}${err.isRetryable ? " (retryable)" : ""}`;
  }
  if (err instanceof Error) return `[cursor agent] ${err.message}`;
  return `[cursor agent] ${String(err)}`;
}
