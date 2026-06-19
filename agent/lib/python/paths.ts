import os from "node:os";
import path from "node:path";

/** User-level runtime home. Override with AGENT_PLOT_HOME. */
export const AGENT_PLOT_HOME = process.env.AGENT_PLOT_HOME
  ? path.resolve(process.env.AGENT_PLOT_HOME)
  : path.join(os.homedir(), ".agent-plot");

/** Project root. Override with AGENT_PLOT_REPO_ROOT. */
export const REPO_ROOT = process.env.AGENT_PLOT_REPO_ROOT
  ? path.resolve(process.env.AGENT_PLOT_REPO_ROOT)
  : path.resolve(/* turbopackIgnore: true */ process.cwd());

/** Source Python analysis project in the repo. */
export const PY_ANALYSIS_ROOT = path.join(REPO_ROOT, "python", "analysis");

/** Isolated uv runtime under ~/.agent-plot/.uv. */
export const UV_ROOT = path.join(AGENT_PLOT_HOME, ".uv");
export const UV_BIN_DIR = path.join(UV_ROOT, "bin");
export const UV_BIN_PATH = path.join(
  UV_BIN_DIR,
  process.platform === "win32" ? "uv.exe" : "uv",
);
export const UV_VENV_PATH = path.join(UV_ROOT, "venv");
export const UV_PYTHON_BIN_PATH = path.join(
  UV_VENV_PATH,
  process.platform === "win32" ? "Scripts" : "bin",
  process.platform === "win32" ? "python.exe" : "python",
);
export const UV_PYTHON_INSTALL_DIR = path.join(UV_ROOT, "python");
export const UV_CACHE_DIR = path.join(UV_ROOT, "cache");
export const UV_TEMP_DIR = path.join(UV_ROOT, "tmp");

/** Example datasets shipped with the app. */
export const EXAMPLES_DIR = path.join(AGENT_PLOT_HOME, "examples");

/** Runtime data: DB and sessions live under AGENT_PLOT_HOME. */
export const DATA_DIR = process.env.AGENT_PLOT_DATA_DIR?.trim()
  ? path.resolve(process.env.AGENT_PLOT_DATA_DIR.trim())
  : AGENT_PLOT_HOME;
export const SESSIONS_ROOT_PATH = path.join(DATA_DIR, "sessions");
