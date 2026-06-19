import { createOpenAI } from "@ai-sdk/openai";
import { defineAgent } from "eve";

export type AgentProvider = "ollama" | "remote";

function provider(): AgentProvider {
  const env = process.env.AGENT_PLOT_AGENT_PROVIDER?.trim().toLowerCase();
  if (env === "remote") return "remote";
  return "ollama";
}

function baseURL(): string {
  return (
    process.env.AGENT_PLOT_OLLAMA_BASE_URL?.trim() ||
    process.env.OLLAMA_BASE_URL?.trim() ||
    "http://127.0.0.1:11434/v1"
  );
}

function apiKey(): string {
  return (
    process.env.AGENT_PLOT_OLLAMA_API_KEY?.trim() ||
    process.env.OLLAMA_API_KEY?.trim() ||
    "ollama"
  );
}

function modelName(): string {
  return (
    process.env.AGENT_PLOT_MODEL?.trim() ||
    process.env.OLLAMA_MODEL?.trim() ||
    "kimi-k2.7-code:cloud"
  );
}

function createModel() {
  const p = provider();
  if (p === "remote") {
    const url = process.env.AGENT_PLOT_AGENT_URL?.trim();
    if (!url) throw new Error("AGENT_PLOT_AGENT_URL is not set for remote provider");
    const openai = createOpenAI({ baseURL: url, apiKey: apiKey() });
    return openai(modelName());
  }
  const openai = createOpenAI({
    baseURL: baseURL(),
    apiKey: apiKey(),
    name: "ollama",
  });
  return openai(modelName());
}

export function describeModel(): string {
  const p = provider();
  if (p === "remote") {
    return `Remote OpenAI-compatible endpoint at ${process.env.AGENT_PLOT_AGENT_URL?.trim() ?? "unset"} with model ${modelName()}`;
  }
  return `Ollama-compatible endpoint at ${baseURL()} with model ${modelName()}`;
}

export default defineAgent({
  model: createModel(),
  // Skip AI Gateway context-window lookup because we use a custom/local model.
  modelContextWindowTokens: 128000,
});
