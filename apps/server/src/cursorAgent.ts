import { Agent, CursorAgentError, type SDKAgent } from "@cursor/sdk";
import { access } from "node:fs/promises";
import path from "node:path";
import { describeVisibility, type CanvasVisibility } from "./canvasIntent.js";
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
      cwd: session.dir,
      settingSources: [],
    },
  };
}

async function sessionHasInputTiff(sessionDir: string): Promise<boolean> {
  for (const name of ["input.tif", "input.tiff"]) {
    try {
      await access(path.join(sessionDir, name));
      return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

function buildPrompt(sessionDir: string, userText: string, visibility: CanvasVisibility): string {
  return [
    "You are the scientific imaging assistant for agent-plot.",
    `Session workspace (absolute path): ${sessionDir}`,
    "Expected files:",
    "- input.tif or input.tiff — uploaded TIFF",
    "- artifacts/raw_preview.png, artifacts/fft_mag.png, artifacts/stats.csv — generated previews and plot data",
    "- canvas.json — json-render layout template for the UI",
    "",
    describeVisibility(visibility),
    "The server already applies canvas panel visibility from the user's wording (hide/show raw, FFT, charts).",
    "Analyze the TIFF and artifacts; answer in clear prose. Use your tools to read session files when helpful.",
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

  if (!(await sessionHasInputTiff(sessionDir))) {
    const note =
      "No TIFF uploaded in this session yet. Ask the user to upload input.tif before deep image analysis.";
    onDelta?.(note);
    const run = await agent.send(`${prompt}\n\n(${note})`);
    return streamRun(run, onDelta);
  }

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
