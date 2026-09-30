# SPEC GJ-polaridad-01 — Motor y canvas (POLARIDAD)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-09-30
> **Objective:** Implementar el motor puro `polaridad-engine.ts` y el wrapper `PolaridadCanvas.tsx` de POLARIDAD (tema de game jam: **"gravedad invertida"**) y registrarlo en `GAME_REGISTRY`: un cubo corre por un pasillo con piso y techo que avanza hacia la izquierda; con un solo botón invierte la gravedad, cae al lado opuesto y esquiva picos y pilares mientras recoge núcleos.

---

## Scope

**In:**

- **Concepto:** pasillo 800×600 con piso (`y = 560`) y techo (`y = 40`). El cubo del jugador está fijo en X; el mundo se desplaza hacia la izquierda a velocidad creciente. Con **un solo botón** (`Space`, o `ArrowUp`/`ArrowDown`) la gravedad se invierte: el cubo "cae" hacia el otro lado en ≈ 0,55 s (también se puede invertir a mitad de caída). Picos y pilares nacen pegados al piso o al techo; hay que estar del lado opuesto (o cruzando por un hueco) cuando pasan. Los núcleos suman puntos. Golpe = pierde 1 vida (3 vidas). Sin final ganador: la partida termina al quedarse sin vidas.
- `components/games/polaridad-engine.ts` (puro; sin `document`/`window`/`localStorage`/`Audio`; recibe `ctx`, `W`, `H`, `input` y `dt` por parámetro):
  - Constantes: `W = 800`, `H = 600`, `FLOOR_Y = 560`, `CEIL_Y = 40`, `PLAYER_X = 180`, `PLAYER_SIZE = 28`, `GRAVITY = 4200` (px/s²), `VMAX = 1200` (px/s), `INITIAL_LIVES = 3`, `HIT_INVULN = 1.5` (s), `SPIKE_H = 36`, `SPIKE_W = 36`, `PILLAR_W = 40`, `PILLAR_H = 120`, `CORE_R = 9`, `CORE_POINTS = 50`, `START_GRACE = 900` (px sin obstáculos al inicio), `MAX_LEVEL = 10`, `LEVEL_DIST = 3000` (px por nivel), `BASE_SPEED = 300` (px/s), `SPEED_STEP = 25` (px/s por nivel), `FLIP_TIME = 0.55` (s, tiempo de cruce piso↔techo derivado de `GRAVITY`/`VMAX`, solo para calcular huecos), `PX_PER_POINT = 10` (1 punto por cada 10 px de distancia).
  - Tipos: `Input = { flip: boolean }` (borde: el canvas lo pone en `true` en `keydown` sin `repeat`; `update` lo consume y lo devuelve a `false`); `Side = "floor" | "ceil"`; `Obstacle = { x: number; w: number; h: number; side: Side; kind: "spike" | "pillar" }` (`x` en coordenadas de pantalla, se resta `speed*dt` por frame); `Core = { x: number; y: number }`; `Particle = { x; y; vx; vy; life; maxLife; color: string }` (se declara aquí, se puebla en GJ-polaridad-03); `GameState = { state: "playing" | "gameover"; y: number; vy: number; dir: 1 | -1; lives: number; score: number; level: number; dist: number; invuln: number; combo: number; obstacles: Obstacle[]; cores: Core[]; nextSpawn: number; particles: Particle[]; shake: number; flash: number; time: number; rng: number }`.
  - `initGame(seed?: number): GameState` — `state: "playing"`, `dir: 1` (cae hacia el piso), `y = FLOOR_Y - PLAYER_SIZE` (532), `vy = 0`, `lives = 3`, `score = 0`, `level = 1`, `dist = 0`, `invuln = 0`, `combo = 0`, `obstacles = []`, `cores = []`, `nextSpawn = START_GRACE`, `rng = seed ?? (Date.now() >>> 0)` (la única lectura de reloj vive en `initGame` cuando no se pasa `seed`; el resto es determinista).
  - `rand(gs): number` — PRNG mulberry32 sobre `gs.rng` (muta, devuelve `[0,1)`).
  - `levelParams(level): { speed: number }` — en esta spec devuelve `speed = BASE_SPEED + SPEED_STEP * (level - 1)`; GJ-polaridad-03 lo amplía con la tabla de niveles.
  - `restY(dir): number` — `dir === 1 ? FLOOR_Y - PLAYER_SIZE : CEIL_Y`.
  - `spawnChunk(gs, speed): number` — crea un bloque de obstáculos a partir de `x = W + 40` y devuelve el ancho total ocupado. En esta spec el patrón se elige uniforme entre 4: (a) `picos-piso`: 1–3 picos contiguos en el piso; (b) `picos-techo`: 1–3 picos contiguos en el techo; (c) `pilar`: 1 pilar en un lado aleatorio; (d) `zigzag`: picos en el piso y, separados por un hueco `zigGap = speed * FLIP_TIME + PLAYER_SIZE + 60`, picos en el techo. Cantidad de picos con `1 + floor(rand(gs) * 3)`; lado con `rand(gs) < 0.5 ? "floor" : "ceil"`. Además, con probabilidad 0,5 agrega un `Core` en el centro vertical del pasillo `y = 300` sobre el chunk.
  - `flip(gs): void` — `dir = -dir`; `vy` se conserva (permite reinvertir en el aire con frenado natural por `GRAVITY`).
  - `update(gs, dt, input): void` — no hace nada si `state === "gameover"`. Orden: (1) `speed = levelParams(level).speed`; (2) `time += dt`, `dist += speed*dt`, `level = min(MAX_LEVEL, 1 + floor(dist / LEVEL_DIST))`; (3) si `input.flip` → `flip(gs)` y `input.flip = false`; (4) física: `vy += dir * GRAVITY * dt`, clamp `|vy| ≤ VMAX`, `y += vy * dt`; al llegar a `restY(dir)` → `y = restY(dir)`, `vy = 0`; (5) mover obstáculos y núcleos `x -= speed*dt` y descartar los que salieron por `x + w < -40`; (6) `nextSpawn -= speed*dt`; si `nextSpawn <= 0` → `used = spawnChunk(gs, speed)`; `nextSpawn = used + speed * 0.7 + 120 + rand(gs) * (260 - 15 * level)` (el hueco mínimo siempre supera el tiempo de cruce); (7) `invuln = max(0, invuln - dt)`; (8) colisiones AABB jugador (`PLAYER_X`, `y`, 28×28) vs cada obstáculo (spike y pillar ocupan `[x, x+w]` × piso: `[FLOOR_Y-h, FLOOR_Y]` / techo: `[CEIL_Y, CEIL_Y+h]`); si hay solape e `invuln === 0` → `hitPlayer(gs, obstacle)`; (9) núcleos: si el círculo `CORE_R` en `(x, y)` solapa al cubo → `collectCore(gs, core)`; (10) score por distancia: se calcula `prev = floor(dist / PX_PER_POINT)` antes de sumar `speed*dt` a `dist` y, tras sumarlo, `score += floor(dist / PX_PER_POINT) - prev` (incremental, así el bono de núcleos no se pisa).
  - `collectCore(gs, core)`: `combo = min(combo + 1, 5)`; `score += CORE_POINTS * combo`; se quita el núcleo. (`combo` vuelve a 0 al recibir un golpe.)
  - `hitPlayer(gs, o)`: `lives -= 1`, `invuln = HIT_INVULN`, `combo = 0`, se quita el obstáculo golpeado (evita golpes repetidos), `shake = 8`; si `lives <= 0` → `endGame(gs)`.
  - `endGame(gs): void` — `lives = 0`, `state = "gameover"`. Reutilizable por vidas agotadas y por `forceGameOver`.
  - `draw(ctx, gs, W, H): void` — fondo `#0a0a18` con grilla tenue vertical que se desplaza con `dist` (`rgba(255,255,255,0.04)` cada 40 px); piso y techo como líneas `#f5ff00` de 3 px con `shadowBlur = 10` y franja de relleno `#14142a` fuera del pasillo; picos como triángulos `#ff006e` (base `w` = `SPIKE_W` por pico, alto 36); pilares como rectángulos `#ff006e` con borde `#f5ff00` de 2 px; núcleos `#00f5ff` radio 9 con halo; jugador cuadrado `#f5ff00` 28×28 con "ojo" `#0a0a18` de 6 px del lado hacia donde cae (indica `dir`), parpadea (alpha alterna 0.3/1 cada 0.1 s) mientras `invuln > 0`; texto en canvas `NIVEL n · COMBO xN` arriba-izquierda. Sin HUD de score/vidas (los pinta React).
- `components/games/PolaridadCanvas.tsx` (`"use client"`): `forwardRef<GameCanvasHandle, GameCanvasProps>` + `useImperativeHandle(ref, () => ({ forceGameOver }))` (llama `endGame(gs)` y dispara `onGameOver` una sola vez). Canvas 800×600, `GameCanvasProps`/`GameCanvasHandle` importadas de `./registry`. Refs: `canvasRef`, `gsRef = useRef(initGame())`, `pausedRef`, `inputRef = { flip: false }`, `gameOverFiredRef`. `useEffect` con listeners `keydown` en `window` para `Space`/`ArrowUp`/`ArrowDown` con `e.preventDefault()` en esas teclas; solo pone `inputRef.current.flip = true` si `!e.repeat` y `!pausedRef.current`; `blur` limpia el input. Loop `requestAnimationFrame` con `dt = Math.min((now - last) / 1000, 0.05)`; si `!pausedRef.current` → `update(gs, dt, input)`; siempre `draw(...)`. Callbacks `onScoreChange`/`onLivesChange`/`onLevelChange` solo cuando el valor cambia respecto del frame previo (valores iniciales emitidos una vez al montar: score 0, vidas 3, nivel 1); `onGameOver(gs.score)` al pasar a `gameover`, una única vez. Cleanup: `removeEventListener` de `keydown` y `blur` + `cancelAnimationFrame`. Ignora `skin` (sin skins en esta spec).
- `components/games/registry.ts`: importar `PolaridadCanvas` y agregar `polaridad: { Canvas: PolaridadCanvas, hasLives: true, initialLives: 3 }` a `GAME_REGISTRY` (sin `skins` ni `touch`; sin tocar tipos ni entradas existentes).

**Out of scope (para otra spec):**

- Fila en `games`, CSS `cover-polaridad`, verificación de rutas y leaderboard → GJ-polaridad-02.
- Tabla de niveles, patrones avanzados, partículas, flashes, balance final → GJ-polaridad-03.
- Skins (`clasico`/`neon`/`retro`), controles táctiles (`mobile-porter`), sonido, mouse, gamepad.

---

## Data model

Sin tablas nuevas ni migraciones en esta spec. Tipos del motor (se exportan `GameState`, `Input` y las funciones; el resto es local):

```ts
export type Input = { flip: boolean };
export type Side = "floor" | "ceil";
export type Obstacle = { x: number; w: number; h: number; side: Side; kind: "spike" | "pillar" };
export type Core = { x: number; y: number };
export type GameState = {
  state: "playing" | "gameover";
  y: number; vy: number; dir: 1 | -1;
  lives: number; score: number; level: number;
  dist: number; invuln: number; combo: number;
  obstacles: Obstacle[]; cores: Core[]; nextSpawn: number;
  particles: Particle[]; shake: number; flash: number;
  time: number; rng: number;
};
```

`GameCanvasProps`/`GameCanvasHandle` de `registry.ts` no cambian.

---

## Implementation plan

1. `components/games/polaridad-engine.ts` — constantes, tipos, `rand`, `levelParams`, `restY`, `spawnChunk`, `initGame`, `flip`, `collectCore`, `hitPlayer`, `endGame`, `update`, `draw` según Scope. Verificación: `npx tsc --noEmit` sin errores; el archivo no referencia `window`/`document`.
2. `components/games/PolaridadCanvas.tsx` — wrapper siguiendo el patrón de `SnakeCanvas.tsx`/`ArkanoidCanvas.tsx` (refs, effect de `paused`, loop rAF, `useImperativeHandle`, cleanup), sin skins ni assets.
3. `components/games/registry.ts` — import + entrada `polaridad`.
4. Prueba manual local tras GJ-polaridad-02 (o forzando `/jugar/polaridad` con la fila ya sembrada): invertir gravedad, esquivar picos del nivel 1 y recibir un golpe a propósito.
5. `npm run build` y `npm run lint`.

---

## Acceptance criteria

- [ ] HUD superior (Jugador/Puntuación/Vidas/Nivel) refleja score, vidas (3 al inicio) y nivel reales en vivo.
- [ ] PAUSA congela cubo, obstáculos y núcleos exactamente donde estaban; REANUDAR continúa sin saltos (`dt` cap 0.05 s).
- [ ] FIN fuerza el fin real (`vidas = 0`, `onGameOver(score)`) y abre el modal con el score real.
- [ ] Quedarse sin vidas por golpes también abre el modal con el score real.
- [ ] Guardar puntuación vía `saveScoreAction` (solo `gameId`/`name`/`score`) se ve en `/salon` tras recargar.
- [ ] JUGAR DE NUEVO remonta el canvas (`key={runId}`): score 0, vidas 3, nivel 1, sin obstáculos.
- [ ] `rocas`, `tetris`, `arkanoid`, `snake` y los ids sin entrada en el registry siguen exactamente igual (placeholder mock).
- [ ] `Space`, `ArrowUp` y `ArrowDown` invierten la gravedad una vez por pulsación (mantener la tecla no repite); no hacen scroll de la página.
- [ ] El cruce piso↔techo tarda ≈ 0,55 s y se puede reinvertir a mitad de caída.
- [ ] Los primeros 900 px de recorrido no tienen obstáculos.
- [ ] Un golpe resta 1 vida, activa 1,5 s de invulnerabilidad (parpadeo), resetea el combo y elimina el obstáculo golpeado (no resta dos veces).
- [ ] El score sube por distancia (1 pt cada 10 px) y por núcleos (`50 × combo`, combo máx. 5).
- [ ] El nivel sube cada 3000 px hasta 10 y la velocidad de scroll sube 25 px/s por nivel.
- [ ] El hueco entre chunks consecutivos siempre permite un cruce completo (nunca hay secuencia imposible).
- [ ] Las teclas `P`/`Escape` no pausan nada dentro del canvas.
- [ ] `npm run build` y `npm run lint` pasan sin errores.

---

## Decisions

- **Sí:** tema inventado por game-jam: **"gravedad invertida"**. Juego `polaridad`. Razón: no hay usuario; los temas ya usados en `specs/game-jam/` son `eco` y `rana` (frogger). — decidido por game-jam — revisar.
- **Sí:** mecánica de runner lateral con inversión de gravedad a un botón, PRNG determinista propio en el estado. Razón: no duplica shooter (rocas), caída de piezas (tetris), pala/rebote (arkanoid), crecimiento/colisión (snake), cruce de carriles (rana) ni bucle de fantasmas (eco); el PRNG mantiene el motor testeable y sin globals. — decidido por game-jam — revisar.
- **Sí:** id `polaridad`, con vidas: `hasLives: true`, `initialLives: 3`. Razón: partidas de decenas de segundos a ~2 min, castigo suave por golpe. — decidido por game-jam — revisar.
- **Sí:** teclas `Space`/`ArrowUp`/`ArrowDown` hacen lo mismo (un solo botón lógico). Razón: consistente con los códigos `Arrow*` y `Space` del futuro layout táctil. — decidido por game-jam — revisar.
- **Sí:** `levelParams` devuelve solo `speed` aquí y se amplía en GJ-polaridad-03. Razón: 01 debe ser jugable de punta a punta por sí sola.
- **Sí:** catálogo inferido sin acceso a DB (Supabase no disponible en la corrida) a partir de `lib/data.ts`, `registry.ts`, `references/*` y `specs/*`. — decidido por game-jam — revisar: catálogo inferido sin acceso a DB.
- **No:** skins ni `touch` en el registry. Razón: se agregan luego con `skin-designer`/`mobile-porter`.
- **Heredado (no re-decidir):** sin pausa propia (`P`/`Esc`; la controla `paused`), sin sonido, sin mouse/touch/gamepad, sin RLS, `best`/`plays` fijos, `saveScoreAction` solo guarda `gameId`/`name`/`score`, HUD React genérico de 4 campos (lo específico se dibuja en el canvas), sin `document`/`window`/`localStorage` en el motor.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Secuencia de obstáculos imposible (dos lados seguidos sin tiempo de cruce) | Hueco mínimo `speed*0.7 + 120` px tras cada chunk (> `speed*FLIP_TIME`) y `zigGap` dentro del zigzag calculado con `FLIP_TIME + PLAYER_SIZE + 60`. |
| Golpe inmediato al reanudar de pausa o al arrancar | `START_GRACE = 900` px sin obstáculos; cap `Math.min(dt, 0.05)`; flip ignorado si `paused`. |
| Un solo golpe cuenta varias veces al solapar varios frames | `invuln = 1.5 s` y el obstáculo golpeado se elimina en `hitPlayer`. |
| Auto-repetición de teclado dispara múltiples flips | El canvas ignora `e.repeat`. |
| Callbacks React en cada frame | Solo se emiten cuando el valor cambia (comparación con el frame previo). |
| Agregar `polaridad` al registry rompe otros juegos | Criterio explícito de no-regresión y prueba manual de `/jugar/rocas`, `/jugar/tetris`. |

---

## What is **not** in this spec

- Migración/seed de `games` y CSS de portada (GJ-polaridad-02).
- Tabla de niveles, patrones avanzados, efectos visuales y balance (GJ-polaridad-03).
- Skins, controles táctiles, sonido, mouse, gamepad.
- Persistir nivel alcanzado en el score guardado.
- Recalcular `best`/`plays` con datos reales; RLS.

Cada uno de estos, si se necesita, va en su propia spec.
