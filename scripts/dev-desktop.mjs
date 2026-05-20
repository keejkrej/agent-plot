#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backendPort = process.env.AGENT_PLOT_PORT?.trim() || "8787";
const webPort = process.env.AGENT_PLOT_WEB_PORT?.trim() || "5173";
const loopbackHost = "127.0.0.1";

const env = {
  ...process.env,
  AGENT_PLOT_PORT: backendPort,
  VITE_DEV_SERVER_URL: `http://${loopbackHost}:${webPort}`,
  VITE_HTTP_URL: `http://${loopbackHost}:${backendPort}`,
  VITE_WS_URL: `ws://${loopbackHost}:${backendPort}`,
};

const runChecked = (args) => {
  const result = spawnSync("pnpm", args, { cwd: repoRoot, env, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

runChecked(["--filter", "@agent-plot/server", "build"]);

const children = [
  ["--filter", "@agent-plot/server", "run", "dev:bundle"],
  // bundle watch keeps dist/bin.mjs fresh for Electron; server dev uses src/bin.ts directly
  ["--filter", "@agent-plot/web", "dev"],
  ["--filter", "@agent-plot/desktop", "dev"],
].map((args) =>
  spawn("pnpm", args, {
    cwd: repoRoot,
    env,
    stdio: "inherit",
  }),
);

const shutdown = (code) => {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  process.exit(code);
};

for (const child of children) {
  child.on("exit", (code, signal) => {
    if (signal || (code ?? 0) !== 0) {
      shutdown(code ?? 1);
    }
  });
}

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));
