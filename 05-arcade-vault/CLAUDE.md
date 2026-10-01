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
- Skins: `lib/skins.ts` (`Skin` = `clasico` | `neon` | `retro`, `SKINS`, `DEFAULT_SKIN`, `isSkin`). Selected skin per game stored client-side via `lib/storage.ts` (`getSkin`/`setSkin`/`subscribeSkin`), consumed in `GamePlayerClient`.
- Types `Game`, `ScoreRow`, `GameColor`, `CATS` in `lib/data.ts`.
- Supabase MCP server configured in `.mcp.json` (project `atluaewaqzzmsgawtopz`) — use it for schema inspection, migrations and seeding.
- Env vars (see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_EMAIL`.

### Games (`components/games/`)

Each game = pure engine (`<name>-engine.ts`: `initGame`/`update`/`draw`, no DOM globals, receives `ctx`, `W`, `H`, input) + client canvas wrapper (`<Name>Canvas.tsx`, `forwardRef` exposing `forceGameOver`).

- `registry.ts` defines shared `GameCanvasProps` (`paused`, optional `skin`, `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`) and `GameCanvasHandle`, plus `GAME_REGISTRY` mapping game id → `{ Canvas, hasLives, initialLives, skins?, touch? }`. `skins: true` = game supports the 3 skins; `touch` = `TouchButton[]` layout rendered by `components/player/TouchControls.tsx` on mobile.
- Implemented: `rocas` (Asteroids), `tetris`, `arkanoid`, `snake`, `frogger`, `eco`. A game in the `games` table without a registry entry shows the mock placeholder.
- Current gaps (check `GAME_REGISTRY` for truth): `eco` has no `skins` nor `touch`; `tetris` has no `skins`.
- Pause is controlled by the `paused` prop (no in-game P/Esc pause). HUD (score/lives/level) lives in React via callbacks; games without lives show `—`.
- Game assets go in `public/games/<id>/` (e.g. `public/games/snake/fruits.png`).
- Original vanilla-JS sources to port live in `references/started-games/NN-name/`; raw assets in `references/source-assets/`; original design mockups in `references/templates/`.
- `references/implemented-games.md` (implemented list), `references/game-with-themes.md` (skin status per game), `references/game-suggestions-to-do.md` (backlog).

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario.

- `/spec` and `/spec-impl` (from `Klerith/fernando-skills`, installed in `~/.claude/skills/`) — spec-driven workflow. Specs live in `specs/NN-<slug>.md` (01–11 so far) and `specs/game-jam/<game-id>/` (`eco`, `rana`); implement with `/spec-impl specs/NN-...`.
- `/nuevo-juego` — spec to port/create a canvas game (path in `references/started-games/*` or text). Only writes the spec. Def: `.claude/skills/nuevo-juego/`.
- `/spec-impl-game` — `/spec-impl` + runs `skin-designer` then `mobile-porter` sequentially. Def: `.claude/skills/spec-impl-game/`. Flow: `/nuevo-juego` → `/spec-impl-game specs/NN-...`.
- `/worktree` — isolated git worktree in `.trees/` to run instructions there.

## Agents

Definitions in `.claude/agents/<name>.md` — read there for details, tools and flow.

- `game-planner` — curates which new game fits the catalog; logs suggestions in `references/game-suggestions-to-do.md`.
- `game-jam` — given a theme, invents a game and writes 3 specs in `specs/game-jam/<id>/`. Specs only.
- `skin-designer` — audits given game ids for ≥3 skins (`clasico`, `neon`, `retro`) → `references/skin-audit.md`. Audit only.
- `mobile-porter` — adds `touch` layout to one game in `GAME_REGISTRY` (spec 10) + mobile/PWA audit → `references/mobile-audit.md`.
- `game-performance` — audits/fixes 7 perf patterns on one game (id required) in its canvas + `GamePlayerClient.tsx`; reference impl `FroggerCanvas.tsx`, spec `specs/11-performance-carga-frogger.md`.
- `security-auditor` — read-only audit of Supabase DB (advisors, RLS, policies, grants, SECURITY DEFINER) + app (auth, server actions, API, proxy, secrets, headers) → `references/security/security-audit.md`. Optional arg `bd` | `app`. Fixes go via `/spec`.

Typical flow: `game-planner` → `/nuevo-juego` → `/spec-impl-game` (→ `skin-designer` → `mobile-porter`) → `game-performance <id>`. Alt: `game-jam <tema>` → `/spec-impl specs/game-jam/<id>/01-...`.

## Project

Arcade Vault: online platform to play games and compete on scores (see `README.md`, in Spanish).

Workflow: one branch per spec (`spec-NN-<slug>`), merged into `main` via PR.

```bash
npx skills@latest add Klerith/fernando-skills
```
