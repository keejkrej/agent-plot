import * as fs from "node:fs";
import path from "node:path";
import type { CanvasVisibility } from "../canvasIntent.js";
import { REPO_ROOT } from "../python/paths.js";
import type { Session, SessionStore } from "../store.js";
import { createAgent } from "./agent.js";
import { createAgentTools, type ToolCallbacks } from "./tools.js";

export type ReplyOptions = {
  session: Session;
  sessionDir: string;
  userText: string;
  visibility: CanvasVisibility;
  store: SessionStore;
  onDelta?: (text: string) => Promise<void> | void;
  onActivity?: (label: string, detail?: string) => Promise<void> | void;
  onStepFinish?: (info: { toolCalls: string[]; toolResults: string[] }) => Promise<void> | void;
};

function loadInstructions(): string {
  const filePath = path.join(REPO_ROOT, "packages", "server-core", "src", "agent", "instructions.md");
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "You are the scientific data assistant for agent-plot.";
  }
}

function loadSkills(): string {
  const skillsDir = path.join(REPO_ROOT, "packages", "server-core", "src", "agent", "skills");
  const parts: string[] = [];
  try {
    for (const file of fs.readdirSync(skillsDir)) {
      if (file.endsWith(".md")) {
        parts.push(`## Skill: ${file.replace(/\.md$/, "")}\n`);
        parts.push(fs.readFileSync(path.join(skillsDir, file), "utf8"));
      }
    }
  } catch {
    // skills directory optional
  }
  return parts.join("\n");
}

function buildInstructions(sessionDir: string, context: Record<string, string> | undefined): string {
  const base = loadInstructions();
  const skills = loadSkills();
  const lines: string[] = [base, "", skills, "", `Session workspace: ${sessionDir}`, ""];
  if (context) {
    if (context.experimentalGoal) lines.push(`Experimental goal: ${context.experimentalGoal}`);
    if (context.scientificBackground) lines.push(`Scientific background: ${context.scientificBackground}`);
    if (context.preferredOutputFormat) lines.push(`Preferred output format: ${context.preferredOutputFormat}`);
    lines.push("");
  }
  lines.push(
    "Use the tools available to inspect data, run Python, write scripts, and update the canvas. " +
      "Answer concisely but show your reasoning.",
  );
  return lines.join("\n");
}

export async function agentAssistantReply(opts: ReplyOptions): Promise<string> {
  const { session, sessionDir, userText, store, onDelta, onActivity, onStepFinish } = opts;

  const context = await store.readSessionContext(session.id);
  const instructions = buildInstructions(sessionDir, context ?? undefined);

  const callbacks: ToolCallbacks = onActivity ? { onActivity } : {};

  const tools = createAgentTools({
    sessionId: session.id,
    sessionDir,
    store,
    callbacks,
  });

  const agent = createAgent(tools, instructions);

  const result = await agent.stream({
    prompt: userText,
    onStepFinish: async (event) => {
      const toolCalls = event.toolCalls.map((t) => `${t.toolName}(${JSON.stringify((t as { input?: unknown }).input)})`);
      const toolResults = event.toolResults.map((r) => `${r.toolName}: ${JSON.stringify((r as { output?: unknown }).output).slice(0, 200)}`);
      await onStepFinish?.({ toolCalls, toolResults });
    },
  });

  let full = "";
  for await (const chunk of result.textStream) {
    full += chunk;
    await onDelta?.(chunk);
  }

  return full.trim();
}
