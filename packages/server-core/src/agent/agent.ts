import { stepCountIs, ToolLoopAgent } from "ai";
import type { AgentTools } from "./tools.js";
import { createAgentModel } from "./model.js";

export function createAgent(tools: AgentTools, instructions: string) {
  return new ToolLoopAgent({
    model: createAgentModel(),
    instructions,
    tools,
    stopWhen: stepCountIs(20),
    maxRetries: 1,
  });
}

export type Agent = ReturnType<typeof createAgent>;
