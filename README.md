# agent-plot

Scientific **TIFF → artifacts → json-render canvas** MVP. Repo layout follows the **kickstart** monorepo convention.

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
- `POST /api/sessions/:id/upload` — multipart field `file` (TIFF)  
- `GET /ws?sessionId=…` — WebSocket (`user.message` runs the assistant; server emits structured `chat.*`, `activity.*`, `canvas.tree`)

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

Canvas panel hide/show (raw, FFT, charts) is still applied server-side from your message wording; the SDK agent handles analysis chat.

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
