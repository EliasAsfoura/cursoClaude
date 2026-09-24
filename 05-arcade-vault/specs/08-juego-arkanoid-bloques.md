# SPEC 08 — Juego real: Arkanoid (04-arkanoid)

> **Status:** Implemented
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-09-24
> **Objective:** Portar el juego standalone `references/started-games/04-arkanoid/game.js` a un motor+canvas de Next.js, integrarlo en `/jugar/arkanoid` con leaderboard real en Supabase, usando el `GAME_REGISTRY` ya existente (spec 07).

---

## Scope

**In:**

- `components/games/arkanoid-engine.ts`: motor puro portado de `game.js` + `levels.js`. `GameState { paddle, ball, blocks[], explosions[], lives: 3, score, level, state: "playing" | "gameover" | "win" }`. Funciones: `initGame()`, `loadLevel(gs, n)` (5 niveles embebidos, portados literal de `levels.js`), `update(gs, dt, input)` (paddle por teclado y/o mouse-x normalizado, rebotes en pared/paddle, colisión AABB bloque por bloque, explosiones con duración fija, avance de nivel al vaciar bloques, pérdida de vida al caer la bola, `win` al pasar nivel 5), `draw(ctx, gs, W, H)` (bloques por color, explosiones, paddle, bola — sin HUD de texto propio, sin overlay de pausa con botones de salto de nivel), `endGame(gs)` reutilizable por colisión normal (vidas a 0) y por `forceGameOver`. Sprites: en vez de `assets/spritesheet.js` (imagen), los bloques/paddle/bola se dibujan con `ctx.fillRect`/formas planas en los colores originales (`red/yellow/cyan/magenta/hotpink/green`) — no se porta el spritesheet PNG. Sin `document`/`window`/`Audio` — recibe `ctx`, `W`, `H` e inputs por parámetro, igual que `asteroids-engine.ts`/`tetris-engine.ts`.
- `components/games/ArkanoidCanvas.tsx` (`"use client"`): wrapper con canvas 800×600, mismo patrón que `AsteroidsCanvas.tsx`/`TetrisCanvas.tsx` — `forwardRef` + `useImperativeHandle({ forceGameOver })`, props `GameCanvasProps` (importadas de `registry.ts`), loop `requestAnimationFrame` con `dt` cap a 0.05s, listeners `keydown`/`keyup` en `window` para `ArrowLeft`/`ArrowRight` (paddle), sin `mousemove` (el original lo tiene como control alternativo pero teclado ya cubre el control principal — se omite para no atar el mouse al canvas dentro de `.crt-screen`), sin tecla `P`/`Escape` de pausa propia ni overlay de "saltar a nivel" (ambos se eliminan — la pausa la controla la prop `paused`, decisión ya tomada en spec 05/07). Callbacks (`onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`) se disparan solo cuando el valor cambia. Cleanup de listeners + `cancelAnimationFrame` en el `useEffect`.
- `components/games/registry.ts`: agregar entrada `arkanoid: { Canvas: ArkanoidCanvas, hasLives: true, initialLives: 3 }` al `GAME_REGISTRY` existente (no se crea de cero — ya existe desde spec 07).
- Migración Supabase (`mcp__supabase__apply_migration`, nombre `seed_game_arkanoid`): `insert into games` con la fila de arkanoid.
- `app/globals.css`: no se agrega nada nuevo — `.game-arena canvas` ya fuerza `width:100%; height:100%; aspect-ratio:4/3` y `.cover-bricks` (línea ~417) ya existe con un gradiente de bloques de colores que encaja con arkanoid. El paso de implementación solo **verifica** que ambas reglas sigan aplicando tal cual, sin escribir CSS.

**Out of scope (para otra spec):**

- Adaptar los otros 5 juegos restantes de `references/started-games/`.
- Sonido (`ball-bounce.mp3`, `break-sound.mp3`) — confirmado por el usuario, mismo criterio que rocas/tetris (spec 05/07): sonido queda fuera de scope hasta que se decida agregarlo a todos los juegos reales a la vez.
- Spritesheet/sprites con imagen (`assets/spritesheet-breakout.png`) — se reemplaza por formas planas de color; no se copian assets a `public/games/arkanoid/`.
- Control por mouse (`mousemove` para mover el paddle) — se mantiene solo teclado.
- Overlay de pausa con botones de salto de nivel (`drawPauseOverlay`, click en canvas) — la pausa la controla el contenedor React, sin mecanismo propio de selección de nivel.
- Gamepad, controles táctiles/mobile.
- Persistir nivel alcanzado o `win` como parte del score guardado — `saveScoreAction` sigue guardando solo `gameId`, `name`, `score`.
- Recalcular `best`/`plays` con datos reales de partidas jugadas.
- Configurar RLS (sigue diferido, mismo estado que spec 06/07).

---

## Data model

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays) values
  ('arkanoid', 'ARKANOID', 'Destruí ladrillos a rebote de pala y bola.',
   'Cinco niveles de ladrillos esperan tu pala. Rebota la bola, no dejes que caiga, y limpia cada patrón de bloques antes de perder tus 3 vidas. Cada nivel sube la velocidad de la bola.',
   'ARCADE', 'cover-bricks', 'green', 33400, '11.2K');
```

Tipos TS de `lib/data.ts` no cambian (`ARCADE` ya está en `CATS`, `green` ya está en `GameColor`). Tipos compartidos de `components/games/registry.ts` (`GameCanvasProps`, `GameCanvasHandle`) tampoco cambian, solo se agrega la entrada nueva al `GAME_REGISTRY`.

---

## Implementation plan

1. `components/games/arkanoid-engine.ts` — copiar constantes/lógica de `game.js` + niveles de `levels.js`, quitar DOM/Audio/spritesheet, dibujar bloques/paddle/bola con `fillRect`/formas planas en vez de `drawSprite`, exponer `initGame`, `loadLevel`, `update`, `draw`, `endGame` operando sobre `GameState`.
2. `components/games/ArkanoidCanvas.tsx` — wrapper `"use client"` siguiendo el patrón exacto de `AsteroidsCanvas.tsx`/`TetrisCanvas.tsx`: `useRef` al canvas, `useEffect` con listeners de teclado (`ArrowLeft`/`ArrowRight`) y loop rAF (dt cap 0.05s), `useImperativeHandle` con `forceGameOver` (llama `endGame(gs)` del motor), comparación de `score`/`lives`/`level`/`state` contra el frame previo para disparar callbacks, cleanup de listeners y `cancelAnimationFrame`.
3. `components/games/registry.ts` — agregar `arkanoid: { Canvas: ArkanoidCanvas, hasLives: true, initialLives: 3 }` a `GAME_REGISTRY` (sin tocar tipos compartidos ni las entradas de `rocas`/`tetris`).
4. Aplicar migración `seed_game_arkanoid` (`mcp__supabase__apply_migration`) con el insert de la sección Data model.
5. Verificar en `app/globals.css` que `.game-arena canvas` y `.cover-bricks` siguen cubriendo el caso sin cambios — no se escribe CSS nuevo.
6. Sin assets nuevos (no se porta spritesheet ni sonido).
7. Verificar `npm run build` y `npm run lint`.

---

## Acceptance criteria

- [ ] El juego aparece en `/`, `/inicio` y `/salon` (tab propio "ARKANOID").
- [ ] `/juego/arkanoid` muestra su leaderboard real (vacío si no hay scores).
- [ ] `/jugar/arkanoid` es jugable con controles reales (mover paddle con flechas) dentro de `.crt-screen`.
- [ ] La bola rebota en paredes, paddle y bloques igual que el original (ángulo invertido en `vy`, bloque desaparece con explosión).
- [ ] Los 5 niveles cargan en orden con el patrón de bloques correcto (`levels.js` portado literal) y la velocidad de bola sube por nivel (`speed` multiplier).
- [ ] HUD superior (Jugador/Puntuación/Vidas/Nivel) refleja score, vidas y nivel reales en vivo.
- [ ] Perder una vida (bola cae) resta una vida real y relanza la bola; llegar a 0 vidas dispara el fin de partida real.
- [ ] Completar el nivel 5 (`win`) también dispara el fin de partida real con el score alcanzado.
- [ ] La tecla `P`/`Escape` no pausa nada dentro del canvas; solo el botón PAUSA/REANUDAR del contenedor controla la pausa.
- [ ] PAUSA congela el juego exactamente donde quedó; REANUDAR continúa sin saltos.
- [ ] FIN fuerza el fin real de la partida (vidas a 0) y abre el modal con el score real.
- [ ] Guardar puntuación inserta en `scores` vía `saveScoreAction` y se refleja en `/salon` tras recargar.
- [ ] JUGAR DE NUEVO reinicia una partida real (canvas remontado vía `key={runId}`, score/vidas/nivel del HUD en sus valores iniciales), igual que ya corregido para rocas/tetris en spec 07.
- [ ] `rocas` y `tetris` siguen funcionando exactamente igual que antes; cualquier id sin entrada en el registry sigue mostrando el placeholder mock.
- [ ] `npm run build` y `npm run lint` pasan sin errores.

---

## Decisions

- **Sí:** reutilizar `GAME_REGISTRY` ya existente (spec 07) en vez de crear otro mecanismo — solo se agrega una entrada. Razón: la abstracción ya se construyó explícitamente para esto; agregar un tercer juego es el caso que la justifica.
- **Sí:** id `arkanoid` (no `bloques`), cat `ARCADE`, color `green`, cover `cover-bricks` (reusa clase existente sin CSS nuevo). Razón: confirmado por el usuario vía preguntas de este skill.
- **No:** portar sonido (`ball-bounce.mp3`, `break-sound.mp3`). Razón: confirmado por el usuario — mismo criterio que rocas/tetris, que tampoco portaron sonido; se difiere a una spec futura que lo agregue de forma consistente a todos los juegos reales.
- **No:** portar el spritesheet de imagen — se reemplaza por formas planas (`fillRect`) en los mismos colores. Razón: confirmado por el usuario — evita depender de carga de imagen async en el motor y de copiar el asset PNG a `public/`; el original ya define los colores por bloque (`BLOCK_COLORS`), que se preservan.
- **No:** control por mouse (`mousemove`) ni overlay propio de pausa con salto de nivel. Razón: decisión ya tomada en spec 05/07 — la pausa la controla el contenedor; el salto de nivel por click era una utilidad de desarrollo del original, no una mecánica del juego en sí, y no fue pedida.
- **No:** gamepad, controles táctiles/mobile. Razón: el original no los tiene, no fue pedido.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Reemplazar sprites por `fillRect` cambia el aspecto visual respecto al original (que usa spritesheet con arte pixelado) | Aceptado explícitamente por el usuario — se preservan los colores exactos (`BLOCK_COLORS`) y las dimensiones (`BLOCK_W`/`BLOCK_H`/paddle/ball), solo cambia el render de imagen a forma plana. |
| Sin control por mouse, el paddle puede sentirse menos preciso que el original (que lo prioriza) | Aceptado — teclado (`ArrowLeft`/`ArrowRight` a `PADDLE_SPEED`) es el control ya usado por rocas/tetris, mantiene consistencia entre los 3 juegos reales. |
| `dt` grande al reanudar de pausa (mismo riesgo que specs 05/07) | Mismo cap de 50ms (`Math.min(dt, 0.05)`) que ya usan `AsteroidsCanvas.tsx`/`TetrisCanvas.tsx`. |
| Migrar el patrón de niveles (`levels.js`, funciones generadoras con loops) a TS sin errores de índice fuera de rango | Portar literal con los mismos loops/arrays del original; verificar visualmente los 5 niveles cargan con el mismo conteo de bloques que el original antes de dar el paso por terminado. |
| Agregar `arkanoid` al registry rompe `rocas`/`tetris` existentes | Acceptance criteria explícito "rocas y tetris siguen funcionando exactamente igual"; se prueba manualmente `/jugar/rocas` y `/jugar/tetris` end-to-end tras el cambio. |

---

## What is **not** in this spec

- Adaptar los otros 5 juegos restantes de `references/started-games/`.
- Sonido (`ball-bounce.mp3`, `break-sound.mp3`).
- Spritesheet/sprites con imagen — se usan formas planas de color.
- Control por mouse.
- Overlay de pausa con salto de nivel.
- Gamepad, controles táctiles.
- Persistir nivel alcanzado o `win` en el score guardado.
- Actualizar `best`/`plays` con datos reales.
- Configuración de RLS/policies.

Cada uno de estos, si se necesita, va en su propia spec.
