# SIMULATOR_ENVIRONMENT_AUDIT.md

**Project inspected:** fundeddesk (current repo)
**Audit date:** 18 Aug 2026
**Mode:** Read-only inspection. Nothing was changed.

---

## 1. Node.js version

```
v24.15.0
```

Node 24 (current, LTS-track). Includes the built-in `node:sqlite` module (stable in
Node 24) — a ready-made embedded database for a standalone simulator with **zero
install dependencies**.

## 2. npm version

```
11.12.1
```

Also available on this machine: **pnpm** at `/usr/local/bin/pnpm` (bundled with
corepack-style install). No yarn, no bun.

## 3. Python version

```
Python 3.9.6   (system interpreter, macOS /usr/bin/python3)
```

- Has `sqlite3` module (bundled, SQLite 3.51.0)
- Has **pandas** and **numpy** installed ✅
- `pip3` at `/usr/bin/pip3`, and `uv` at `~/.local/bin/uv` (fast modern env manager)
- Note: system Python is old; for anything serious use `uv` to create a
  venv with a current Python. Python's role here would be data backfill/preprocessing,
  not the app itself.

## 4. Next.js version

```
Installed: 15.5.22   (package.json declares ^15.3.0, app router)
```

Latest-app-router line. `next.config.mjs` is empty defaults — no plugins, no
export mode, no transpile packages.

## 5. React version

```
19.2.8
```

(React 19, with `react-dom` 19.2.8.)

## 6. TypeScript version

```
5.9.3
```

`tsconfig.json` uses path aliases (`@/*` → root). The project ships a
`typecheck` script: `tsc --noEmit`.

## 7. Available database options currently configured

**Local:**
- **SQLite** is the only local engine available on this machine:
  - CLI: `sqlite3` 3.51.0 at `/usr/bin/sqlite3`
  - Python bindings: `python3 -c "import sqlite3"` works (3.51.0)
  - Node built-in: `node:sqlite` (Node 24) — no npm package required
- **No Docker** → no containers, no local Postgres/MySQL/MongoDB/Redis.
- **No** `psql`, `mongod`, `redis-server`, `mysql` binaries.

**Remote:**
- **Supabase cloud** project reachable over HTTPS (see #8).
- No `DATABASE_URL` / no direct Postgres wire credentials configured anywhere in
  the repo or `.env*` — only the Supabase REST/anon pair.

## 8. Is Supabase configured?

**Yes — fully configured and reachable.**

| Item | Value |
|---|---|
| `.env.local` | `NEXT_PUBLIC_SUPABASE_URL=https://mwmkxeuzweoblofhkfzk.supabase.co`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key present>` |
| Package | `@supabase/supabase-js@2.45.0` installed |
| Migrations | `supabase/*.sql` (schema, user-watchlist, plans, analytics, affiliate) — managed by SQL Editor, not the CLI |
| Live check | `GET https://mwmkxeuzweoblofhkfzk.supabase.co/rest/v1/` → HTTP **401** (authenticated guard up; project is alive) |
| Supabase CLI | **not installed** (`supabase` not found); no `config.toml`; no local stack (requires Docker anyway) |

Cannot run a local Supabase instance here (no Docker), but the cloud project is
usable for a simulator's persistence (new `sim_*` tables only).

## 9. Can a separate project/repository be created cleanly?

**Yes.**

- Git repo has **no remote** (`git remote -v` empty) — the current project is
  local-only, so a new standalone repo in a sibling directory cannot conflict.
- Working tree state: 2 modified files (`app/portal/page.js` and one more) — a
  pre-existing uncommitted change; irrelevant to new-project creation.
- `.gitignore` excludes `node_modules/`, `.next/`, `.env*` — a new project would
  naturally keep the same hygiene; no secrets would leak.
- Disk space ample: **554 GiB free**.
- npm registry reachable (HTTP 200), so `create-next-app` / `npm install` work.

Recommended layout: `~/Desktop/simulator/` as a **sibling** of `fundeddesk` (do not
nest inside the existing repo). Use `npx create-next-app@latest` (Next 15 + TS +
Tailwind + App Router) or pnpm (`pnpm create next-app`). Data files (SQLite DB,
CSV/Parquet archives) live in the new repo only.

## 10. Existing dependencies useful for a new standalone simulator

### From fundeddesk (already proven in this codebase)

| Dependency | Installed | Why it matters for the simulator |
|---|---|---|
| `lightweight-charts` | 5.2.0 | Proven candlestick charting (used by `/tv-chart`). Ideal replay chart; imperative `setData`/`update` API fits a playback clock |
| `@supabase/supabase-js` | 2.45.0 | Cloud persistence for sim archives/trades (new `sim_*` tables) |
| `zustand` | 5.0.14 | External-store state — same pattern as `TradingStore`/`PriceBus`; perfect for a sim trading store + replay clock |
| `@tanstack/react-query` | 5.101.4 | Query caching for history fetches / archiver status |
| `tailwindcss` | 4.3.3 | Styling (v4, PostCSS plugin already configured in this repo) |
| `framer-motion` | 12.43.0 | Timeline/player UI animations (play/pause, scrub, date transitions) |
| `react-resizable-panels` | 2.1.7 | Multi-pane workspace layout for chart + chain + positions |
| `react-virtuoso` | 4.12.3 | Virtualized lists (order book, trade history, chain) at high row counts |
| `highcharts` | 13.0.0 | Optional: equity curve / heatmap / analytics dashboards |
| `lucide-react`, `clsx`, `tailwind-merge` | — | Icons + the established `cn()` utility pattern |
| `klinecharts` | 10.0.1 | Installed (unused in the terminal) — alternative chart engine option |
| `@highcharts/map-collection` | 2.3.3 | Present (used by heatmap pages) |

### Non-JS tooling already on this machine

- `sqlite3` CLI + Python `sqlite3` + Node `node:sqlite` → **embedded archive DB**
- Python **pandas + numpy** + `uv` → data backfill pipelines (re-shape Angel relay
  history into SQLite/Parquet archives)
- `pnpm` → fast installs for the new repo

### Would NOT be carried over

- The Angel relay dependency itself (`NEXT_PUBLIC_ANGEL_RELAY_URL`) is runtime
  plumbing of the *live* terminal; a simulator must treat the relay as an optional
  backfill source (or skip it entirely and use offline archives).
- No charting decision is forced by the existing repo: nothing in `fundeddesk`
  would need to be imported at all — the useful items above are merely
  *recommendations*, available as plain npm packages in any new project.

---

## Summary answers

| # | Question | Answer |
|---|---|---|
| 1 | Node.js | **v24.15.0** (has built-in `node:sqlite`) |
| 2 | npm | **11.12.1** (pnpm also available; no yarn/bun) |
| 3 | Python | **3.9.6** system + pandas/numpy; `uv` available for modern venvs |
| 4 | Next.js | **15.5.22** (App Router) |
| 5 | React | **19.2.8** |
| 6 | TypeScript | **5.9.3** (with `tsc --noEmit` typecheck script) |
| 7 | Databases | **SQLite local** (CLI/Python/Node built-ins); **no Docker/PostgreSQL/MySQL/Mongo/Redis locally**; Supabase cloud remote |
| 8 | Supabase | **Configured & reachable** (REST 401 = live auth guard); anon-key client in repo; no local CLI/stack |
| 9 | Clean separate repo | **Yes** — no git remote, ample disk, registry reachable; recommend sibling dir `~/Desktop/simulator/` via `create-next-app` |
| 10 | Useful deps | lightweight-charts, zustand, @tanstack/react-query, tailwindcss, @supabase/supabase-js, react-resizable-panels, react-virtuoso, highcharts, lucide-react, framer-motion; Python pandas/numpy/uv + SQLite for the data layer |

*End of environment audit. No files were modified.*