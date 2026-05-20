# AGENTS.md

Spec for the **agent-plot** monorepo: scientific data paths → agent inspection → session artifacts → json-render canvas. Primary workflow is chat; HTTP upload is an optional TIFF shortcut.

## Stack

| Area | Tools |
| ---- | ----- |
| Repo | **pnpm** workspaces (`apps/*`, `packages/*`) |
| Server | **Effect v4** (`effect/unstable/http`, `@effect/platform-node`), Node **22+**, **tsdown** bundle (`dist/bin.mjs`) |
| Web | **React 19**, **Vite 7**, **Tailwind v4**, **Base UI**, **@json-render/react** canvas |
| Desktop | **Electron** (follows t3code reference design); spawns API child, loads Vite dev URL |
| Agent | **Cursor SDK** (`@cursor/sdk`) when `CURSOR_API_KEY` is set; fallback HTTP stub or `describe_tiff` stub |
| Analysis | **uv** Python project in `python/analysis/` (TIFF scripts: `describe_tiff`, `build_artifacts`) |
| Rust | Placeholder workspace in `crates/` (`empty` crate) |

## Dependency pinning

| Ecosystem | Source of truth | Consume as |
| --------- | --------------- | ---------- |
| TypeScript (shared) | `pnpm-workspace.yaml` `catalog` | `"name": "catalog:"` |

**Rule of thumb:** catalog for shared/version-sensitive deps (`effect`, `@effect/*`, `typescript`, `vitest`, `tsdown`); inline semver for app-specific leaves (Electron, Vite plugins, UI libs).

Native builds allowed via `allowBuilds` in `pnpm-workspace.yaml`: `electron`, `esbuild`, `sqlite3` (pulled in by `@cursor/sdk`).

## Effect (v4)

- **`effect`** and **`@effect/*`** are pinned via **pnpm catalog**; depend with `"effect": "catalog:"`.
- **Imports:** subpaths (`effect/Effect`, `effect/Schema`, `effect/unstable/http`, …), not the `effect` barrel. `@effect/language-service` enforces this in `tsconfig.base.json`.
- **Scope:** server, desktop, `packages/contracts`, and `packages/shared` use Effect. The web app does **not** — it uses React + Zod for client-side validation.
- **Services:** prefer `Context.Service`, `Layer`, and `Effect.gen`; use `@effect/platform-node` for Node I/O.

## Packages

- **`@agent-plot/contracts`** — shared wire types (WebSocket payloads, desktop IPC, settings). Effect Schema + types only; no HTTP/WS runtime logic. Subpath exports: `.`, `./desktop`, `./settings`.
- **`@agent-plot/shared`** — Effect utilities consumed by server and desktop. Explicit subpath exports only (e.g. `@agent-plot/shared/Net`); no root barrel.
- **`@agent-plot/tailscale`** — optional LAN exposure helpers for desktop.
- **`@agent-plot/utils`** — small shared helpers without Effect.

## Ports & env

| Service | Default | Env override |
| ------- | ------- | ------------ |
| API | 8787 | `AGENT_PLOT_PORT` |
| Web (Vite) | 5173 | — |
| Desktop dev | — | `VITE_DEV_SERVER_URL` (set by `pnpm dev:desktop`) |

Required for real agent chat: `CURSOR_API_KEY`. Optional: `AGENT_PLOT_CURSOR_MODEL`, `AGENT_PLOT_AGENT_URL`, `PUBLIC_ORIGIN`.

Readiness: `GET /.well-known/agent-plot/environment`.

## Commands

`pnpm install` · `pnpm dev` (API + web) · `pnpm dev:server` · `pnpm dev:web` · `pnpm dev:desktop` · `pnpm build` · `pnpm typecheck` · `pnpm --filter @agent-plot/server test` · `cd python/analysis && uv sync`

Per-package: `pnpm --filter @agent-plot/<pkg> <script>`.

## Conventions

Workspace scope **`@agent-plot/*`**. One root **`Cargo.toml`** workspace (placeholder).

**TypeScript imports:** server, desktop, and packages use **`NodeNext`** resolution from `tsconfig.base.json` with explicit **`.ts`** extensions in relative imports (e.g. `from "./config.ts"`). The web app overrides to **`Bundler`** resolution and `@/*` path aliases — extensionless imports are fine there.

**Canvas:** server merges session artifacts into `canvas.tree` WebSocket events; web renders via catalog in `apps/web/src/canvas/catalog.ts` (`Stack`, `Grid`, `Metric`, `PreviewImage`, `LinePlot`, `Histogram`, etc.).

**Sessions:** runtime data under `data/sessions/` (gitignored). Agent `cwd` is the session directory.

**Path attachments:** composer file/folder explorer uses `fs.browse` over WebSocket; paths are expanded server-side in `pathAttachments.ts`.

## Reference design

**[pingdotgg/t3code](https://github.com/pingdotgg/t3code)** — or a local clone at **`../t3code`** — is the reference design for server bootstrap, desktop/Electron layout, Effect service wiring, IPC contracts, and dev scripts. When unsure how to structure something in `apps/server`, `apps/desktop`, or shared packages, check t3code first and adapt for agent-plot domain logic (sessions, canvas, Python bridge).

Other references:

- Canvas rendering: [@json-render/react](https://json-render.dev)
- User-facing setup and workflow: [`README.md`](README.md)
