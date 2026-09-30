# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm start` — run production build
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- No test setup exists in this repo yet. UI verification is done via Playwright MCP (screenshots go to `.playwright-screenshots/`, gitignored).

## Stack & conventions

- Next.js 16.3.5 App Router, React 19.2. Routes live in `app/` (no `src/`).
- Next 16 generates global route-typed prop helpers — `app/layout.tsx` uses `LayoutProps<"/">`, pages use `PageProps<"/juego/[id]">` etc. Don't hand-write prop types.
- ESLint flat config composes `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`.
- Tailwind v4: no `tailwind.config.*` file — theme tokens are declared inline via `@theme inline` in `app/globals.css`, wired through the `@tailwindcss/postcss` plugin. Game covers are CSS classes `cover-<id>` in `globals.css`.
- TS path alias `@/*` maps to the repo root.
- Prettier is installed; a `PostToolUse` hook (`.claude/hooks/format-on-edit.mjs`, configured in `.claude/settings.json`) runs Prettier + `eslint --fix` on every file Claude writes/edits.
- Next 16 has breaking changes vs. older versions — check `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`) before writing code, per `AGENTS.md`.
- UI copy, specs and README are in Spanish.

## Architecture

### Routes (`app/`)

- `/` — catalog (`HomeClient`, category filter via `CATS` in `lib/data.ts`)
- `/inicio` — marketing landing (`InicioClient`)
- `/juego/[id]` — game detail + top scores
- `/jugar/[id]` — player (`components/player/GamePlayerClient.tsx`)
- `/salon` — hall of fame, top scores per game (`components/hall/HallOfFameClient.tsx`)
- `/about` — about + contact form → `app/api/contact/route.ts` (sends email via Resend)
- `/auth` — local "login": username stored in `localStorage` (`lib/storage.ts`, key `av_user`, consumed with `useSyncExternalStore`). No Supabase Auth.

### Data (Supabase)

- Clients: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server, `@supabase/ssr` + `cookies()`).
- Tables: `games` (id slug, title, short, long, cat, cover, color, best, plays — `best`/`plays` are seeded fixed values, not computed) and `scores` (game_id, name, score, created_at).
- Reads: `lib/queries.ts` (`getGames`, `getGame`, `getTopScores`, `getAllTopScores`) — call from Server Components.
- Writes: `lib/actions.ts` server action `saveScoreAction`.
- Types `Game`, `ScoreRow`, `GameColor`, `CATS` in `lib/data.ts`.
- Supabase MCP server configured in `.mcp.json` (project `atluaewaqzzmsgawtopz`) — use it for schema inspection, migrations and seeding.
- Env vars (see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_EMAIL`.

### Games (`components/games/`)

Each game = pure engine (`<name>-engine.ts`: `initGame`/`update`/`draw`, no DOM globals, receives `ctx`, `W`, `H`, input) + client canvas wrapper (`<Name>Canvas.tsx`, `forwardRef` exposing `forceGameOver`).

- `registry.ts` defines shared `GameCanvasProps` (`paused`, `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`) and `GameCanvasHandle`, plus `GAME_REGISTRY` mapping game id → `{ Canvas, hasLives, initialLives }`.
- Implemented: `rocas` (Asteroids), `tetris`, `arkanoid`, `snake`. A game in the `games` table without a registry entry shows the mock placeholder.
- Pause is controlled by the `paused` prop (no in-game P/Esc pause). HUD (score/lives/level) lives in React via callbacks; games without lives show `—`.
- Game assets go in `public/games/<id>/` (e.g. `public/games/snake/fruits.png`).
- Original vanilla-JS sources to port live in `references/started-games/NN-name/`; raw assets in `references/source-assets/`.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario.

- `/spec` and `/spec-impl` (from `Klerith/fernando-skills`) — spec-driven workflow. Specs live in `specs/NN-<slug>.md` (01–09 so far); implement with `/spec-impl specs/NN-...`.
- `/nuevo-juego` (project skill, `.claude/skills/nuevo-juego/`) — generates the spec to port/create a canvas game with Supabase leaderboard and register it in `GAME_REGISTRY`. Accepts a `references/started-games/*` path or a text description. Only writes the spec, not code.
- `/spec-impl-game` (project skill, `.claude/skills/spec-impl-game/`) — same as `/spec-impl` (same phases, same spec, branch, step-by-step) + Phase 5: when done, runs `skin-designer <id>` then `mobile-porter <id>` sequentially (never parallel). Flow: `/nuevo-juego` → `/spec-impl-game specs/NN-...`.
- `/worktree` — creates an isolated git worktree in `.trees/` to run instructions there.
- `game-planner` subagent (`.claude/agents/game-planner.md`) — curates which new game fits the catalog; evaluates/records suggestions in `references/game-suggestions-to-do.md`. Flow: `game-planner` → `/nuevo-juego` → `/spec-impl`.
- `game-jam` subagent (`.claude/agents/game-jam.md`) — given a theme, invents one game and writes 3 full specs (`01-motor-y-canvas`, `02-integracion-supabase`, `03-niveles-y-pulido`) in `specs/game-jam/<game-id>/`, same format as specs 07/08. Only writes specs. Flow: `game-jam <tema>` → review → `/spec-impl specs/game-jam/<id>/01-...`.
- `skin-designer` subagent (`.claude/agents/skin-designer.md`) — audits only the game ids the user passes (e.g. `skin-designer snake tetris`; no ids → asks) for ≥3 skins: `clasico` (default), `neon`, `retro`. Writes report to `references/skin-audit.md`; current per-game status in `references/game-with-themes.md`. Only audits, no code. Flow: `skin-designer <ids>` → `/spec` → `/spec-impl`.
- `mobile-porter` subagent (`.claude/agents/mobile-porter.md`) — given one game id, adds its `touch` layout to `GAME_REGISTRY` following `specs/10-controles-tactiles-moviles.md`; never touches engines/canvas/other games. Also audits site on mobile + PWA readiness → `references/mobile-audit.md`. Flow: `/nuevo-juego` → `/spec-impl` → `mobile-porter <id>`.
- `game-performance` subagent (`.claude/agents/game-performance.md`) — given one game id (no id → asks), measures load + in-game perf (dev and prod, profile of `references/performance-frogger.md`), applies fixes only if thresholds are crossed, re-measures and reverts if no gain. Writes `references/performance-<id>.md`. Flow: `game-performance <id>` → review → `/spec` for out-of-scope items.

## Project

Arcade Vault: online platform to play games and compete on scores (see `README.md`, in Spanish).

Workflow: one branch per spec (`spec-NN-<slug>`), merged into `main` via PR.

```bash
npx skills@latest add Klerith/fernando-skills
```
