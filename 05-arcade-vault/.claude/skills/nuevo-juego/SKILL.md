---
name: nuevo-juego
description: Genera la spec para portar/crear un juego de canvas con leaderboard en Supabase e integrarlo en Arcade Vault (catálogo, /juego/[id], /jugar/[id], /salon). Se activa con "nuevo juego", "portar juego", "agregar <juego>" o una ruta de references/started-games/*.
argument-hint: <ruta-referencia | descripción del juego>
---

# Skill: nuevo-juego

Genera una **spec** (`specs/NN-juego-<id>-<nombre>.md`) para agregar un juego nuevo a Arcade Vault, siguiendo el patrón implementado en `specs/05-juego-rocas-asteroids.md` (motor + canvas) y `specs/06-leaderboard-y-tabla-juegos-supabase.md` (tabla `games`/`scores`). Este skill **no escribe código de la app ni migraciones** — solo produce el documento de spec. La implementación real queda para `/spec-impl specs/NN-...`.

Antes de escribir nada, lee estos archivos como referencia de patrón exacto:
- `specs/05-juego-rocas-asteroids.md`
- `specs/06-leaderboard-y-tabla-juegos-supabase.md`
- `components/games/asteroids-engine.ts`
- `components/games/AsteroidsCanvas.tsx`
- `components/player/GamePlayerClient.tsx`
- `lib/data.ts`, `lib/queries.ts`, `lib/actions.ts`

## 1. Resolver el input

- Si el argumento es una ruta bajo `references/started-games/NN-nombre/` → **modo port**: hay `game.js`/`index.html` fuente real para portar.
- Si el argumento es una descripción de texto (sin ruta) → **modo nuevo**: no hay código fuente, la spec describe las mecánicas desde cero (igual de detallado que si viniera de una referencia).
- Si no hay argumento: listar `references/started-games/`, cruzar contra `select id from games` (vía `mcp__supabase__execute_sql`) para ver cuáles ya están implementados, y preguntar con AskUserQuestion cuál portar.

## 2. Analizar la referencia (solo lectura, modo port)

Leer `game.js`, `index.html`, `style.css`, `README.md`, `CLAUDE.md` y `specs/` de la carpeta de referencia. Extraer:

- **Canvas**: tamaño (`width`/`height` del `<canvas>` o constantes tipo `W`/`H`/`COLS`×`ROWS`). Define el ratio del CSS de escalado.
- **Globales DOM**: todo `document.getElementById`, `document`/`window` directo — se elimina del motor portado; el motor solo recibe `ctx`, `W`, `H`, input.
- **HUD**: qué se dibuja fuera del canvas (score/lines/level/next-piece) vs. dentro. Lo que hoy vive en DOM propio (`scoreEl`, `levelEl`, etc.) pasa al HUD React existente (`hud-stat` de Jugador/Puntuación/Vidas/Nivel) vía callbacks, igual que rocas. Lo que solo tiene sentido dentro del canvas (ej. "next piece" de tetris) se queda dibujado ahí.
- **Input**: teclas, mouse (`mousemove`/`click`), y cualquier pausa propia (`P`/`Esc`) — la pausa propia se elimina, la controla la prop `paused` del contenedor (decisión ya tomada en spec 05, no se repregunta).
- **¿Tiene vidas?**: si el juego no tiene concepto de vidas (ej. tetris), el HUD "Vidas" muestra `—` y el fin de partida se dispara por otro criterio (game over del propio juego), pero `forceGameOver` (botón FIN) igual debe forzar ese fin.
- **Estados**: `playing`/`paused`/`gameover`/otros (`win`, niveles con `levels.js`).
- **Assets**: spritesheets, sonidos, imágenes → van a `public/games/<id>/`.
- **Loop**: `requestAnimationFrame` con `dt`, o tick fijo (ej. drop interval de tetris) — documentar cuál para que el wrapper lo respete.

En **modo nuevo** (sin referencia), estos mismos puntos se definen desde la descripción del usuario en vez de extraerse de código; si algo es ambiguo, preguntar con AskUserQuestion antes de escribir la spec.

## 3. Metadatos del juego

Preguntar con AskUserQuestion (proponiendo defaults razonables a partir del análisis):

- `id`: slug en español estilo `rocas` (no `uuid`, reusable en rutas `/juego/[id]` y `/jugar/[id]`).
- `title`, `short`, `long`: copy en español, mismo tono que `rocas` en `specs/06-*.md`.
- `cat`: una de `CATS` en `lib/data.ts` sin `TODOS` (`ARCADE`, `PUZZLE`, `SHOOTER`, `VERSUS` — ampliar si el juego no encaja y confirmarlo con el usuario).
- `color`: uno de `GameColor` (`cyan`/`magenta`/`yellow`/`green`).
- `cover`: `cover-<id>`; revisar si la clase ya existe en `app/globals.css` — si no, la spec incluye agregarla.
- `best`, `plays`: valores fijos seedeados (decisión ya tomada en spec 06 — no se recalculan en vivo).

## 4. Verificar registry

Comprobar si `components/games/registry.ts` ya existe (`ls components/games/`).

- **No existe** (primer juego nuevo desde rocas): la spec incluye crearlo — `Record<string, { Canvas: ...; hasLives: boolean }>` con tipos compartidos `GameCanvasProps`/`GameCanvasHandle` extraídos de `AsteroidsCanvas.tsx` — y **migrar rocas** al registry (reemplazar el `isRocas`/`asteroidsRef` hardcodeado en `components/player/GamePlayerClient.tsx` por `GAME_REGISTRY[game.id]`). Un juego sin entrada en el registry sigue mostrando el placeholder mock actual.
- **Ya existe**: la spec solo agrega la entrada del juego nuevo al registry, sin tocar el resto.

## 5. Estructura de la spec a generar

Archivo: `specs/NN-juego-<id>-<nombre-original>.md`, con `NN` = siguiente número libre en `specs/` (ver `ls specs/`). Copiar la estructura EXACTA de `specs/05-*.md`/`specs/06-*.md` — mismos headers de sección, mismo estilo (español, decisiones con "Sí/No" + razón, tabla de riesgos):

```
# SPEC NN — Juego real: <Título> (<origen>)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06
> **Date:** <hoy>
> **Objective:** ...

## Scope
**In:** ...
**Out of scope (para otra spec):** ...

## Data model
(insert SQL del seed en `games`; tipos TS si cambian — normalmente no cambian)

## Implementation plan
1. components/games/<id>-engine.ts — motor puro (GameState: score, lives, level, state; initGame/update/draw; función de muerte reutilizable por forceGameOver)
2. components/games/<Name>Canvas.tsx — wrapper "use client", forwardRef+useImperativeHandle({forceGameOver}), props paused/onScoreChange/onLivesChange/onLevelChange/onGameOver, loop rAF (dt cap 0.05s), cleanup listeners/rAF
3. components/games/registry.ts — crear o extender (ver sección 4 de este skill)
4. components/player/GamePlayerClient.tsx — usar GAME_REGISTRY[game.id] en vez de ternario hardcodeado (solo si el registry es nuevo)
5. Migración Supabase (mcp__supabase__apply_migration, nombre seed_game_<id>): insert en games
6. app/globals.css — regla de escalado del canvas (ratio del juego) + .cover-<id> si falta
7. Assets → public/games/<id>/ si aplica
8. Verificar npm run build y npm run lint

## Acceptance criteria
- [ ] El juego aparece en /, /inicio y /salon (tab propio)
- [ ] /juego/<id> muestra su leaderboard real (vacío si no hay scores)
- [ ] /jugar/<id> es jugable con controles reales dentro de .crt-screen
- [ ] HUD (Jugador/Puntuación/Vidas/Nivel) refleja valores reales en vivo
- [ ] PAUSA congela el juego exactamente donde quedó; REANUDAR continúa
- [ ] FIN fuerza el fin real de la partida (forceGameOver) y abre el modal con el score real
- [ ] Perder por las reglas propias del juego (sin tocar FIN) también abre el modal con el score real
- [ ] Guardar puntuación inserta en scores vía saveScoreAction y se refleja en /salon tras recargar
- [ ] rocas y cualquier id sin entrada en el registry siguen funcionando sin cambios
- [ ] npm run build y npm run lint pasan sin errores
(+ criterios propios de las mecánicas específicas del juego, ej. "las piezas rotan igual que el original")

## Decisions
(Sí/No + razón, mismo estilo que specs 05/06 — documentar explícitamente si se crea el registry y por qué, si el juego no tiene vidas, etc.)

## Risks
(tabla Risk/Mitigation, igual formato)

## What is **not** in this spec
(lista, mismo estilo)
```

## 6. Cierre

Al terminar de escribir el archivo de spec: mostrar un resumen corto (juego, id, si crea o extiende el registry, siguiente número de spec) y decir explícitamente que el siguiente paso es revisar la spec y correr `/spec-impl specs/NN-...`. No tocar código de la app, no correr migraciones, no correr `npm run build`/`lint` — esto es solo generación de spec.
