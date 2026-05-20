# agent-plot

Scientific **data paths → agent inspection → artifacts → json-render canvas** MVP. The primary workflow is chat: you tell the agent where your data lives (`.tif`, `.h5`, `.csv`, `.npy`, etc.); it inspects the files and writes session artifacts for the canvas. HTTP upload is an optional shortcut for TIFF only.

## Layout

```text
agent-plot/
├── apps/
│   ├── server/           # Hono + WebSocket + sessions + `uv` Python bridge
│   └── web/              # Vite + React UI (proxy to API)
├── packages/
│   ├── contracts/        # Shared TS types (WS payloads, etc.)
│   └── utils/            # Shared helpers
├── crates/               # Rust workspace (`empty` placeholder crate)
├── python/
│   └── analysis/         # `uv` project: TIFF scripts (`describe_tiff`, `build_artifacts`)
├── data/sessions/        # Created at runtime (gitignored)
└── pnpm-workspace.yaml   # `apps/*`, `packages/*`
```

## Prerequisites

- **Node** 20+ (LTS **22** recommended; `.nvmrc` pins 22). `@cursor/sdk` pulls in native `sqlite3` — use **pnpm** from this repo so `allowBuilds` in `pnpm-workspace.yaml` runs its install script.
- **pnpm** 10+
- **uv** ([install](https://docs.astral.sh/uv/getting-started/installation/)) for Python analysis
- **Cursor API key** (for the default chat agent) — [Cloud Agents dashboard](https://cursor.com/dashboard/cloud-agents)

## Setup

```bash
cd python/analysis
uv sync
```

## Dev

From repo root:

```bash
export CURSOR_API_KEY="cursor_..."   # required for Cursor SDK agent (see below)
pnpm dev
```

Runs **API** (`@agent-plot/server`, default port **8787**) and **web** (`@agent-plot/web`, **5173**) in parallel. The web app proxies `/api` and `/ws` to the API.

- `GET /api/sessions` — list sessions on disk  
- `POST /api/sessions` — create session  
- `GET /api/sessions/:id/chat` — persisted chat history (`messages`, `activities`)  
- `POST /api/sessions/:id/upload` — optional multipart `file` (TIFF shortcut; triggers `build_artifacts`)  
- `GET /ws?sessionId=…` — WebSocket (`user.message` runs the assistant; server emits structured `chat.*`, `activity.*`, `canvas.tree`)
- **Path attachments** — composer file/folder buttons open a server-backed explorer; selected paths are sent as `pathAttachments` on `user.message` and expanded into a `Data paths attached…` block for the agent (see `apps/server/src/pathAttachments.ts`).
- **`fs.browse`** (same WebSocket) — client sends `{ type: "fs.browse", requestId, partialPath }`; server replies `fs.browse.ok` with `{ parentPath, entries: [{ name, fullPath, kind }] }` or `fs.browse.error`. Lists the host filesystem the API process can read (`~` expansion, absolute paths). Local-only trust model.

### Typical workflow

1. `pnpm dev` → create a session in the web UI.
2. Attach data paths with the **file** or **folder** buttons (path explorer), or type paths in chat. Use **Enter path manually** if the explorer is unavailable.
3. Send a message (text optional when paths are attached). The agent receives full paths in the prompt block.
4. Alternatively, point the agent at data in prose, e.g. `The volume is at /data/experiment/stack.h5`.
5. The agent inspects format and contents (shell, Python, or the bundled `describe_tiff` / `build_artifacts` scripts when appropriate), writes under `<session>/artifacts/`, then the server refreshes the canvas on each message.
6. Use natural language to hide/show panels (`hide histogram`, `show only meta`).

`build_artifacts.py` currently produces the default canvas bundle from **2D TIFF-like** slices (PNG previews, `stats.csv`, `meta.json`, `summary.json`). For other formats the agent should summarize in chat and extend artifacts or scripts as needed.

### Verification (manual)

1. `pnpm dev` with `CURSOR_API_KEY` set → new session.
2. **File** button → path explorer at `~` → navigate → **Attach** a `.tif` / `.h5` path → chip shows basename, tooltip full path.
3. **Folder** button → attach a directory path (Attach uses the current listing).
4. Send with chips only → agent prompt includes attached paths.
5. Chat: reference an on-disk TIFF path in text, e.g. `Build canvas previews from /path/to/sample.tif`.
6. After the agent runs `build_artifacts`, confirm the canvas shows metadata metrics, key-value list, raw/FFT images, profile + histogram + row-mean plot.
7. Chat: `hide histogram` / `show only meta` — visibility toggles apply.
8. Invalid browse path or permission error → explorer shows `fs.browse.error` message.
9. Rename or remove `artifacts/meta.json` in the session dir, send another message → `canvas.error` should surface via WebSocket.

The **web** client renders `canvas.tree` with [`@json-render/react`](https://json-render.dev) and an in-repo catalog in `apps/web/src/canvas/catalog.ts` (layout: `Stack`, `Grid`, `Divider`, `Caption`; data: `Metric`, `MetricGrid`, `KeyValueList`, `Table`, `Text`, `Alert`; media/plots: `PreviewImage`, `LinePlot`, `Histogram`, `ScatterPlot`, `BarChart`), matching `apps/server/src/starter-canvas.json`. `build_artifacts.py` writes `meta.json`, `summary.json`, and extended `stats.csv` for the server merge layer.

### Chat agent backend

Priority for each `user.message`:

| Priority | Env | Behavior |
|----------|-----|----------|
| 1 | `CURSOR_API_KEY` | **Cursor SDK** (`@cursor/sdk`) local agent with `cwd` = session directory (multi-turn via `Agent.resume`) |
| 2 | `AGENT_PLOT_AGENT_URL` | Custom HTTP `POST { sessionId, text }` → plain text or JSON `{ reply }` / `{ text }` / `{ message }` |
| 3 | *(none)* | **Stub** — `describe_tiff` + canvas visibility note |

Optional:

- `AGENT_PLOT_CURSOR_MODEL` — model id (default `composer-2`)
- `PUBLIC_ORIGIN` — prefix for artifact URLs when not using same-origin `/api/...`

Canvas panel hide/show (raw, FFT, metadata, charts, row mean) is applied server-side from your message wording; the SDK agent handles inspection and artifact generation.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | API + web dev servers |
| `pnpm dev:api` | API only |
| `pnpm dev:web` | Web only |
| `pnpm build` | Build all packages that define `build` |
| `pnpm typecheck` | `tsc` across packages |

## License

MIT (align with dependencies as needed).
