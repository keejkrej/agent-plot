import path from "node:path";

export const REPO_ROOT = process.env.AGENT_PLOT_REPO_ROOT
  ? path.resolve(process.env.AGENT_PLOT_REPO_ROOT)
  : path.resolve(process.cwd(), "../..");

export const PY_ANALYSIS_ROOT = path.join(REPO_ROOT, "python", "analysis");
