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

- **Node** 20+
- **pnpm** 10+
- **uv** ([install](https://docs.astral.sh/uv/getting-started/installation/)) for Python analysis

## Setup

```bash
cd python/analysis
uv sync
```

## Dev

From repo root:

```bash
pnpm dev
```

Runs **API** (`@agent-plot/server`, default port **8787**) and **web** (`@agent-plot/web`, **5173**) in parallel. The web app proxies `/api` and `/ws` to the API.

- `POST /api/sessions` — create session  
- `POST /api/sessions/:id/upload` — multipart field `file` (TIFF)  
- `GET /ws?sessionId=…` — WebSocket (send `{ "type": "user.message", "text": "…" }` to run the assistant, rebuild artifacts, and broadcast `canvas.tree`)

The **web** client renders `canvas.tree` with [`@json-render/react`](https://json-render.dev) and a small in-repo catalog (`Stack`, `Caption`, `PreviewImage`, `LinePlot`, `Histogram`) matching `apps/server/src/starter-canvas.json`.

### Optional remote assistant

If `AGENT_PLOT_AGENT_URL` is set, each `user.message` first `POST`s JSON `{ "sessionId", "text" }` to that URL and streams the reply into chat. The response may be plain text or JSON with `reply`, `text`, or `message`. Without it, the server uses a **local stub** that runs `describe_tiff` when a TIFF is present.

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
