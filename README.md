# agent-plot

Chat with an AI agent about tabular data on your local machine. The MVP demo uses the classic **Titanic Kaggle challenge**: the agent inspects files, writes Python analysis scripts in a safe per-session workspace, and displays results as tables, metrics, charts, and images using json-render.

## Architecture

- **Next.js full-stack app** — the same Node runtime serves the UI and runs the Eve agent. No separate worker, no WebSocket hub.
- **Eve agent** (`agent/`) is filesystem-first: `agent/agent.ts`, `agent/tools/`, `agent/skills/`, `agent/hooks/`, and `agent/instructions.md`.
- **SQLite + Drizzle** for sessions, chat history, activities, and artifacts.
- **AI SDK OpenAI provider** pointed at a local Ollama-compatible endpoint. Default model is `kimi-k2.7-code:cloud`.
- **Python sandbox** (`python/analysis`) provides scikit-learn, pandas, numpy, matplotlib, seaborn for the agent to write and run scripts.

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

4. Prepare the Titanic demo data:
   ```bash
   ~/.agent-plot/.uv/venv/bin/python examples/titanic/setup.py
   ```
   (Or click **Prepare Titanic example** in the app’s Session setup dialog.)

5. Start the app:
   ```bash
   pnpm dev
   ```

6. Open http://localhost:3000, click **Session setup**, then **Prepare Titanic example**. This downloads/creates the dataset in `~/.agent-plot/examples/titanic/` and points the session at that folder.

7. Try prompts like:
   - `Load the Titanic CSV and show me the first 10 rows and basic statistics.`
   - `Build a canvas showing survival rate by sex and passenger class, plus a histogram of ages.`
   - `Train a simple classifier to predict survival and report accuracy and feature importance.`
   - `Predict survival for Pclass=1, Sex=female, Age=28, SibSp=0, Parch=0, Fare=50, Embarked=S.`

## Configuration

All environment variables are optional unless noted.

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENT_PLOT_HOME` | `~/.agent-plot` | Runtime home. Sessions, DB, examples, and the isolated Python environment live here. |
| `AGENT_PLOT_DATA_DIR` | `$AGENT_PLOT_HOME` | Where sessions and the SQLite database live. |
| `AGENT_PLOT_MODEL` | `kimi-k2.7-code:cloud` | Model name. Must exist in Ollama or in your OpenAI-compatible proxy. |
| `AGENT_PLOT_OLLAMA_BASE_URL` | `http://127.0.0.1:11434/v1` | Ollama OpenAI-compatible endpoint. |
| `AGENT_PLOT_OLLAMA_API_KEY` | `ollama` | Dummy key for Ollama; ignored by Ollama but required by the SDK. |
| `OLLAMA_BASE_URL` | — | Fallback for the Ollama endpoint. |
| `OLLAMA_API_KEY` | — | Fallback for the Ollama API key. |

## Agent tools

- `read_file` — read a file (any path the user points to).
- `list_directory` — list a directory.
- `write_file` — write a file inside the session workspace.
- `run_shell` — run a shell command in the session directory.
- `run_python` — write and execute a Python script in the session sandbox.
- `build_artifacts` — merge CSV/JSON/PNG artifacts into a json-render canvas spec.
- `set_canvas_visibility` — show/hide canvas panels.
- `set_user_context` — record experimental goal, background, preferred output format, and local data folder.

## Isolated Python runtime

The first time the agent needs Python, the app bootstraps a self-contained environment under `~/.agent-plot/.uv`:

- `~/.agent-plot/.uv/bin/uv` — private `uv` binary downloaded from GitHub releases
- `~/.agent-plot/.uv/python/` — managed CPython install
- `~/.agent-plot/.uv/venv/` — project virtualenv with numpy, pandas, scikit-learn, matplotlib, seaborn
- `~/.agent-plot/.uv/cache/` — uv package cache

The app manages its own runtime and does not depend on a global `uv` or system Python.

## Example data

`examples/titanic/setup.py` prepares the classic Titanic dataset:

- Uses `kagglehub` when available to download the real dataset.
- Falls back to a synthetic Titanic-shaped CSV so the demo works offline without credentials.
- Writes data to `~/.agent-plot/examples/titanic/Titanic.csv`.

## Session context

Click **Session setup** in the chat header to set:

- Experimental goal
- Scientific background
- Preferred output format
- Local data folder (defaults to the Titanic example after clicking **Prepare Titanic example**)

## json-render canvas

When the agent calls `build_artifacts`, the server merges the generated artifacts into a json-render canvas spec. The right-hand canvas panel extracts that spec from the Eve stream and renders it. Supported blocks include metrics, tables, alerts, images, line plots, histograms, scatter plots, and bar charts.

## Development commands

```bash
pnpm dev                 # run the Next.js app (also the Eve agent runtime)
pnpm run typecheck       # TypeScript check
pnpm run build           # production build
pnpm run db:migrate      # run Drizzle migrations
pnpm run db:studio       # open Drizzle studio
```
