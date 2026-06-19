import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type AgentProvider = "ollama" | "cursor" | "remote";

function provider(): AgentProvider {
  const env = process.env.AGENT_PLOT_AGENT_PROVIDER?.trim().toLowerCase();
  if (env === "cursor") return "cursor";
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
  return process.env.AGENT_PLOT_OLLAMA_API_KEY?.trim() || process.env.OLLAMA_API_KEY?.trim() || "ollama";
}

function modelName(): string {
  return (
    process.env.AGENT_PLOT_MODEL?.trim() ||
    process.env.OLLAMA_MODEL?.trim() ||
    "kimi-k2.7-code:cloud"
  );
}

export function isAgentConfigured(): boolean {
  return provider() !== "cursor" || Boolean(process.env.CURSOR_API_KEY?.trim());
}

export function createAgentModel(): LanguageModel {
  const p = provider();
  if (p === "ollama") {
    const openai = createOpenAI({
      baseURL: baseURL(),
      apiKey: apiKey(),
      name: "ollama",
    });
    return openai(modelName());
  }
  if (p === "remote") {
    const url = process.env.AGENT_PLOT_AGENT_URL?.trim();
    if (!url) throw new Error("AGENT_PLOT_AGENT_URL is not set for remote provider");
    const openai = createOpenAI({
      baseURL: url,
      apiKey: apiKey(),
    });
    return openai(modelName());
  }
  throw new Error("Cursor provider is handled separately; use cursorAssistantReply from cursorAgent.js");
}

export function describeModel(): string {
  const p = provider();
  if (p === "ollama") {
    return `Ollama-compatible endpoint at ${baseURL()} with model ${modelName()}`;
  }
  if (p === "remote") {
    return `Remote OpenAI-compatible endpoint at ${process.env.AGENT_PLOT_AGENT_URL?.trim() ?? "unset"} with model ${modelName()}`;
  }
  return "Cursor agent";
}
