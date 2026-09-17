# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm start` — run production build
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- No test setup exists in this repo yet.

## Stack & conventions

- Next.js 16.3.5 App Router, React 19.2. Routes live in `app/` (no `src/`).
- Next 16 generates global route-typed prop helpers — e.g. `app/layout.tsx` uses `LayoutProps<"/">` instead of a hand-written props type. Use the equivalent `PageProps<...>` on pages rather than importing/defining prop types yourself.
- ESLint flat config composes `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`.
- Tailwind v4: no `tailwind.config.*` file — theme tokens are declared inline via `@theme inline` in `app/globals.css`, wired through the `@tailwindcss/postcss` plugin.
- TS path alias `@/*` maps to the repo root.
- Next 16 has breaking changes vs. older versions — check `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`) before writing code, per `AGENTS.md`.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario.

## Project

Arcade Vault: online platform to play games and compete on scores (see `README.md`, in Spanish).

Development follows spec-driven design using `/spec` and `/spec-impl` skills from `Klerith/fernando-skills`:

```bash
npx skills@latest add Klerith/fernando-skills
```
