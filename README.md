# agent-plot

Chat with an AI agent about scientific data on your local machine. The agent inspects files, writes Python analysis scripts in a per-session sandbox, and displays results as tables, metrics, charts, and images using json-render.

## Architecture

- **Next.js 15** full-stack app (`apps/web`) with Route Handlers.
- **SQLite** + Drizzle for sessions, chat history, jobs, and settings.
- **Standalone WebSocket hub** (`apps/ws-hub`) for real-time UI updates.
- **Worker** (`apps/worker`) polls a SQLite job queue and runs agent turns.
- **Agent** (`packages/server-core/src/agent`) is organized in an Eve-style filesystem layout and uses the Vercel AI SDK's `ToolLoopAgent` with `@ai-sdk/openai` pointed at a local Ollama-compatible endpoint.
- **Python sandbox** (`python/analysis`) provides data helpers and lets the agent write and run arbitrary scripts.

## Quick start

1. Install dependencies:
   ```bash
   pnpm install
   ```

   The app manages its own Python runtime, so you do **not** need a global Python or uv installed to run the agent. You only need [uv](https://docs.astral.sh/uv/getting-started/installation/) to generate the example data below.

2. Generate example data:
   ```bash
   uv run --directory python/analysis python scripts/generate_examples.py
   ```

3. Pull the local model in Ollama:
   ```bash
   # Default model is kimi-k2.7-code:cloud — make sure it exists in Ollama under that name,
   # or override with a model you have pulled, e.g.:
   # ollama pull qwen2.5-coder:14b
   ```

4. Start Ollama:
   ```bash
   ollama serve
   ```

5. Start the app:
   ```bash
   pnpm dev
   ```

   This runs the WebSocket hub, worker, and Next.js web app in parallel.

6. Open http://localhost:3000, create a session, and try:
   - `Analyze /Users/jack/workspace/agent-plot/data/examples/sample-image.tif and build a canvas preview`
   - `Read /Users/jack/workspace/agent-plot/data/examples/experiment.csv and show mean intensity per condition`

## Configuration

All environment variables are optional unless noted.

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENT_PLOT_HOME` | `~/.agent-plot` | Runtime home. Sessions, DB, and the isolated Python environment live here. |
| `AGENT_PLOT_DATA_DIR` | `$AGENT_PLOT_HOME` | Where sessions and the SQLite database live. |
| `AGENT_PLOT_AGENT_PROVIDER` | `ollama` | `ollama`, `remote`, or `cursor`. |
| `AGENT_PLOT_OLLAMA_BASE_URL` | `http://127.0.0.1:11434/v1` | Ollama OpenAI-compatible endpoint. |
| `AGENT_PLOT_MODEL` | `kimi-k2.7-code:cloud` | Model name. Must exist in Ollama or in your OpenAI-compatible proxy. |
| `AGENT_PLOT_OLLAMA_API_KEY` | `ollama` | Dummy key for Ollama; ignored by Ollama but required by the SDK. |
| `AGENT_PLOT_AGENT_URL` | — | OpenAI-compatible endpoint for `remote` provider. |
| `CURSOR_API_KEY` | — | Required when using `AGENT_PLOT_AGENT_PROVIDER=cursor`. |

## Agent tools

The agent has filesystem, execution, and canvas tools:

- `read_file` — read a file (any path the user points to).
- `list_directory` — list a directory.
- `write_file` — write a file inside the session workspace.
- `run_shell` — run a shell command in the session directory.
- `run_python` — write and execute a Python script in the session sandbox.
- `describe_tiff` — metadata for TIFF files.
- `build_artifacts` — generate canvas artifacts (images, stats, meta, summary).
- `set_canvas_visibility` — show/hide canvas panels.
- `set_user_context` — record experimental goal and background.

## Isolated Python runtime

The first time the agent needs Python, the worker bootstraps a self-contained environment under `~/.agent-plot/.uv`:

- `~/.agent-plot/.uv/bin/uv` — private `uv` binary downloaded from GitHub releases
- `~/.agent-plot/.uv/python/` — managed CPython install
- `~/.agent-plot/.uv/venv/` — project virtualenv with numpy, pandas, pillow, tifffile
- `~/.agent-plot/.uv/cache/` — uv package cache

This keeps the repo clean and avoids depending on the user's system Python.

## Session context

Click the settings icon in the chat header to set:

- Experimental goal
- Scientific background
- Preferred output format

The agent reads this context for every turn and can also update it via the `set_user_context` tool when you describe your experiment in chat.

## Development commands

```bash
pnpm dev                 # run ws-hub + worker + web
pnpm dev:web             # run only the Next.js app
pnpm dev:ws-hub          # run only the WebSocket hub
pnpm run typecheck       # TypeScript check across the workspace
pnpm run build           # production build
```

## Example datasets

See `data/examples/README.md` for sample prompts against the synthetic TIFF and CSV files.
