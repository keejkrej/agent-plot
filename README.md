# agent-plot

Chat with an AI agent about scientific data on your local machine. The agent inspects files, writes Python analysis scripts in a per-session sandbox, and displays results as tables, metrics, charts, and images using json-render.

## Architecture

- **Next.js full-stack app** — the same Node runtime serves the UI and runs the Eve agent. No separate worker, no WebSocket hub.
- **Eve agent** (`agent/`) is filesystem-first: `agent/agent.ts`, `agent/tools/`, `agent/skills/`, `agent/hooks/`, and `agent/instructions.md`.
- **SQLite + Drizzle** for sessions, chat history, activities, and artifacts.
- **AI SDK OpenAI provider** pointed at a local Ollama-compatible endpoint. Default model is `kimi-k2.7-code:cloud`.
- **Python sandbox** (`python/analysis`) provides data helpers and lets the agent write and run arbitrary scripts under each session.

## Quick start

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Pull the local model in Ollama:
   ```bash
   # Default model is kimi-k2.7-code:cloud — make sure it exists in Ollama under that name,
   # or override with a model you have pulled, e.g.:
   # ollama pull qwen2.5-coder:14b
   ```

3. Start Ollama:
   ```bash
   ollama serve
   ```

4. Start the app:
   ```bash
   pnpm dev
   ```

5. Open http://localhost:3000, click **Session setup**, and either:
   - point the agent at a local data folder, or
   - click **Generate sample data** to create synthetic TIFF/CSV in the session workspace.

6. Try prompts like:
   - `Analyze the sample image and build a canvas preview`
   - `Read the sample time series and plot intensity over time`

## Configuration

All environment variables are optional unless noted.

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENT_PLOT_HOME` | `~/.agent-plot` | Runtime home. Sessions, DB, and the isolated Python environment live here. |
| `AGENT_PLOT_DATA_DIR` | `$AGENT_PLOT_HOME` | Where sessions and the SQLite database live. |
| `AGENT_PLOT_MODEL` | `kimi-k2.7-code:cloud` | Model name. Must exist in Ollama or in your OpenAI-compatible proxy. |
| `AGENT_PLOT_OLLAMA_BASE_URL` | `http://127.0.0.1:11434/v1` | Ollama OpenAI-compatible endpoint. |
| `AGENT_PLOT_OLLAMA_API_KEY` | `ollama` | Dummy key for Ollama; ignored by Ollama but required by the SDK. |
| `OLLAMA_BASE_URL` | — | Fallback for the Ollama endpoint if the `AGENT_PLOT_` variant is not set. |
| `OLLAMA_API_KEY` | — | Fallback for the Ollama API key. |

## Agent tools

The agent has filesystem, execution, and canvas tools:

- `read_file` — read a file (any path the user points to).
- `list_directory` — list a directory.
- `write_file` — write a file inside the session workspace.
- `run_shell` — run a shell command in the session directory.
- `run_python` — write and execute a Python script in the session sandbox.
- `describe_tiff` — metadata for TIFF files.
- `build_artifacts` — generate canvas artifacts (images, stats, meta, summary) and return a merged json-render spec.
- `set_canvas_visibility` — show/hide canvas panels.
- `set_user_context` — record experimental goal, background, preferred output format, and local data folder.

## Isolated Python runtime

The first time the agent needs Python, the app bootstraps a self-contained environment under `~/.agent-plot/.uv`:

- `~/.agent-plot/.uv/bin/uv` — private `uv` binary downloaded from GitHub releases
- `~/.agent-plot/.uv/python/` — managed CPython install
- `~/.agent-plot/.uv/venv/` — project virtualenv with numpy, pandas, pillow, tifffile
- `~/.agent-plot/.uv/cache/` — uv package cache

The app does **not** use a global `uv` or system Python. It manages its own isolated runtime so the repo stays clean.

## Session context

Click **Session setup** in the chat header to set:

- Experimental goal
- Scientific background
- Preferred output format
- Local data folder

The agent reads this context for every turn and can also update it via the `set_user_context` tool when you describe your experiment in chat.

## json-render canvas

When the agent calls `build_artifacts`, the server merges the generated artifacts into a json-render canvas spec. The right-hand canvas panel extracts that spec from the Eve stream and renders it using the local component catalog (`components/canvas/`). Supported blocks include metrics, tables, alerts, images, line plots, histograms, scatter plots, and bar charts.

## Development commands

```bash
pnpm dev                 # run the Next.js app (also the Eve agent runtime)
pnpm run typecheck       # TypeScript check
pnpm run build           # production build
pnpm run db:migrate      # run Drizzle migrations
pnpm run db:studio       # open Drizzle studio
```
