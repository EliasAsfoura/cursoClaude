# SPEC GJ-eco-01 — Motor y canvas (ECO)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-09-30
> **Objective:** Implementar el motor puro `eco-engine.ts` y el wrapper `EcoCanvas.tsx` de ECO (tema de game jam: **"eco"**) y registrarlo en `GAME_REGISTRY`: el jugador recoge núcleos durante rondas de 12 s y su propio recorrido grabado vuelve en la ronda siguiente como un eco fantasma que lo persigue.

---

## Scope

**In:**

- **Concepto:** arena 800×600. El jugador (círculo) se mueve libre con las 4 flechas y recoge núcleos (+puntos). Cada ronda dura 12 s; su trayectoria se graba a 30 Hz y, al terminar, se convierte en un **eco** que reproduce exactamente ese recorrido en las rondas siguientes. Tocar un eco cuesta una vida. Versus contra tu propio pasado; cada ronda hay un eco más (máx. 5). Se gana al sobrevivir la ronda 12; se pierde al quedarse sin vidas.
- `components/games/eco-engine.ts` (puro; sin `document`/`window`/`localStorage`/`Audio`; recibe `ctx`, `W`, `H`, `input` y `dt` por parámetro):
  - Constantes: `W = 800`, `H = 600`, `MARGIN = 20`, `PLAYER_R = 10`, `ECHO_R = 10`, `HIT_DIST = 18` (`PLAYER_R + ECHO_R - 2`), `ORB_R = 9`, `PLAYER_SPEED = 230` (px/s), `ROUND_TIME = 12` (s), `SAMPLE_HZ = 30`, `SAMPLE_DT = 1 / 30`, `MAX_ECHOES = 5`, `MAX_LEVEL = 12`, `INITIAL_LIVES = 3`, `HIT_INVULN = 1.5` (s), `INTERMISSION = 1.2` (s), `PHASE_GRACE = 1.0` (s al inicio de cada ronda en que los ecos son intangibles), `ORB_MIN_DIST_PLAYER = 140`, `ORB_MIN_DIST_ECHO = 60`, `ORB_SPAWN_TRIES = 20`.
  - Tipos: `Input = { left: boolean; right: boolean; up: boolean; down: boolean }`; `Echo = { path: number[] }` (pares `x,y` intercalados, ≤ 360 muestras); `Orb = { x: number; y: number; age: number }`; `Particle = { x; y; vx; vy; life; maxLife; color: string }` (se declara aquí, se puebla en GJ-eco-03); `GameState = { state: "playing" | "intermission" | "gameover" | "win"; px: number; py: number; lives: number; score: number; level: number; roundT: number; interT: number; invuln: number; streak: number; hitThisRound: boolean; orb: Orb | null; echoes: Echo[]; rec: number[]; recAcc: number; particles: Particle[]; shake: number; flash: number; rng: number }`.
  - `initGame(seed?: number): GameState` — `state: "playing"`, jugador en `(400, 300)`, `lives = 3`, `score = 0`, `level = 1`, `roundT = 0`, `echoes = []`, `rec = [400, 300]`, `orb = spawnOrb(gs)`, `rng = seed ?? (Date.now() >>> 0)` (la única lectura de reloj vive en `initGame` cuando no se pasa `seed`; el resto es determinista).
  - `rand(gs): number` — PRNG mulberry32 sobre `gs.rng` (muta el estado, devuelve `[0,1)`).
  - `levelParams(level): { echoSpeed: number; orbLife: number }` — en esta spec devuelve fijo `{ echoSpeed: 1, orbLife: 6 }`; GJ-eco-03 lo reemplaza por la tabla de niveles.
  - `spawnOrb(gs): Orb` — hasta `ORB_SPAWN_TRIES` posiciones aleatorias en `[MARGIN+ORB_R, W-MARGIN-ORB_R] × [MARGIN+ORB_R, H-MARGIN-ORB_R]` que cumplan distancia ≥ `ORB_MIN_DIST_PLAYER` al jugador y ≥ `ORB_MIN_DIST_ECHO` a la posición actual de cada eco; si ninguna cumple, usa la esquina más lejana del jugador `(MARGIN+ORB_R | W-MARGIN-ORB_R, MARGIN+ORB_R | H-MARGIN-ORB_R)`. `age = 0`.
  - `echoPos(echo, t, speed): { x: number; y: number }` — `f = t * speed * SAMPLE_HZ`, `i = floor(f)`, interpola linealmente entre muestra `i` e `i+1`; si `i+1` supera la última muestra devuelve la última (el eco se queda quieto donde terminó).
  - `update(gs, dt, input): void` — no hace nada si `state` es `gameover`/`win`. Estados:
    - `intermission`: `interT -= dt`; al llegar a 0 → `state = "playing"`, `roundT = 0`, `rec = [px, py]`, `recAcc = 0`, `hitThisRound = false`, `orb = spawnOrb(gs)`.
    - `playing`: (1) `roundT += dt`; (2) mover jugador: `dx = (right?1:0)-(left?1:0)`, `dy = (down?1:0)-(up?1:0)`, normalizar si ambos ≠ 0 (`× 0.7071`), `px += dx*PLAYER_SPEED*dt`, `py += dy*PLAYER_SPEED*dt`, clamp a `[MARGIN+PLAYER_R, W-MARGIN-PLAYER_R]` × `[MARGIN+PLAYER_R, H-MARGIN-PLAYER_R]`; (3) grabación: `recAcc += dt`; mientras `recAcc >= SAMPLE_DT` empujar `px,py` a `rec` y restar `SAMPLE_DT` (tope 360 muestras); (4) `invuln = max(0, invuln - dt)`; (5) orbe: `orb.age += dt`; si `age >= orbLife` → `orb = spawnOrb(gs)` sin penalización ni reset de `streak`; si `dist(jugador, orb) <= PLAYER_R + ORB_R` → `collectOrb(gs)`; (6) colisión con ecos: por cada eco, `pos = echoPos(echo, roundT, echoSpeed)`; si `roundT >= PHASE_GRACE && invuln === 0 && dist(jugador,pos) < HIT_DIST` → `hitPlayer(gs)`; (7) si `roundT >= ROUND_TIME` → `endRound(gs)`.
  - `collectOrb(gs)`: `base = 100 + floor(max(0, 50 - orb.age * 10))`; `mult = 1 + 0.25 * min(streak, 8)`; `score += round(base * mult)`; `streak += 1`; `orb = spawnOrb(gs)`.
  - `hitPlayer(gs)`: `lives -= 1`, `invuln = HIT_INVULN`, `streak = 0`, `hitThisRound = true`; si `lives <= 0` → `endGame(gs)`.
  - `endRound(gs)`: `score += 50 * level` (+ `200` si `!hitThisRound`, "ronda perfecta"); guardar `rec` como `Echo` en `echoes` (si ya hay `MAX_ECHOES`, descarta el más viejo con `shift()`); si `level >= MAX_LEVEL` → `state = "win"`; si no → `level += 1`, `state = "intermission"`, `interT = INTERMISSION`, `px = 400`, `py = 300`, `orb = null`, `invuln = 0`.
  - `endGame(gs): void` — `lives = 0`, `state = "gameover"`. Reutilizable por vidas agotadas y por `forceGameOver`.
  - `draw(ctx, gs, W, H): void` — fondo `#0a0a18` + grilla tenue cada 40 px (`rgba(255,255,255,0.04)`), borde de arena en `MARGIN` (`#ff006e` 2 px); ecos como círculos radio 10 color `#ff006e` con `globalAlpha = 0.35` mientras `roundT < PHASE_GRACE` y `0.9` después, con estela de 8 muestras previas a `alpha` decreciente; orbe `#f5ff00` radio 9 con halo (`shadowBlur = 12`) y anillo que se encoge según `age/orbLife`; jugador `#00f5ff` radio 10, parpadea (alpha alterna 0.3/1 cada 0.1 s) mientras `invuln > 0`; barra de tiempo de ronda de 4 px en la parte inferior (`(1 - roundT/ROUND_TIME) * W`); texto en canvas `RONDA n · ECOS m` arriba-izquierda y, en `intermission`, `RONDA n` centrado. Sin HUD de score/vidas (los pinta React).
- `components/games/EcoCanvas.tsx` (`"use client"`): `forwardRef<GameCanvasHandle, GameCanvasProps>` + `useImperativeHandle(ref, () => ({ forceGameOver }))` (llama `endGame(gs)` y dispara `onGameOver` una sola vez). Canvas 800×600, `GameCanvasProps`/`GameCanvasHandle` importadas de `./registry`. Refs: `canvasRef`, `gsRef = useRef(initGame())`, `pausedRef`, `inputRef = { left, right, up, down }`, `gameOverFiredRef`. `useEffect` con listeners `keydown`/`keyup` en `window` para `ArrowLeft`/`ArrowRight`/`ArrowUp`/`ArrowDown` con `e.preventDefault()` en esas teclas y `blur` que limpia el input; loop `requestAnimationFrame` con `dt = Math.min((now - last) / 1000, 0.05)`; si `!pausedRef.current` → `update(gs, dt, input)`; siempre `draw(...)`. Callbacks `onScoreChange`/`onLivesChange`/`onLevelChange` solo cuando el valor cambia respecto del frame previo (valores iniciales emitidos una vez al montar: score 0, vidas 3, nivel 1); `onGameOver(gs.score)` al pasar a `gameover` o `win`, una única vez. Cleanup: `removeEventListener` de los 3 listeners + `cancelAnimationFrame`. Ignora `skin` (sin skins en esta spec).
- `components/games/registry.ts`: importar `EcoCanvas` y agregar `eco: { Canvas: EcoCanvas, hasLives: true, initialLives: 3 }` a `GAME_REGISTRY` (sin `skins` ni `touch`; sin tocar tipos ni entradas existentes).

**Out of scope (para otra spec):**

- Fila en `games`, CSS `cover-eco`, verificación de rutas y leaderboard → GJ-eco-02.
- Tabla de niveles, partículas, flashes, shake, balance final → GJ-eco-03.
- Skins (`clasico`/`neon`/`retro`), controles táctiles (`mobile-porter`), sonido, mouse, gamepad.

---

## Data model

Sin tablas nuevas ni migraciones en esta spec. Tipos locales del motor (no se exportan al resto de la app salvo `GameState`, `Input` y las funciones):

```ts
export type Input = { left: boolean; right: boolean; up: boolean; down: boolean };
export type Echo = { path: number[] };
export type Orb = { x: number; y: number; age: number };
export type GameState = {
  state: "playing" | "intermission" | "gameover" | "win";
  px: number; py: number;
  lives: number; score: number; level: number;
  roundT: number; interT: number; invuln: number;
  streak: number; hitThisRound: boolean;
  orb: Orb | null; echoes: Echo[];
  rec: number[]; recAcc: number;
  particles: Particle[]; shake: number; flash: number;
  rng: number;
};
```

`GameCanvasProps`/`GameCanvasHandle` de `registry.ts` no cambian.

---

## Implementation plan

1. `components/games/eco-engine.ts` — constantes, tipos, `rand`, `levelParams`, `spawnOrb`, `echoPos`, `initGame`, `collectOrb`, `hitPlayer`, `endRound`, `endGame`, `update`, `draw` según Scope. Verificación: `npx tsc --noEmit` sin errores; el archivo no referencia `window`/`document`.
2. `components/games/EcoCanvas.tsx` — wrapper siguiendo el patrón de `SnakeCanvas.tsx` (refs, effect de `paused`, loop rAF, `useImperativeHandle`, cleanup), pero sin skins ni assets.
3. `components/games/registry.ts` — import + entrada `eco`.
4. Prueba manual local tras GJ-eco-02 (o forzando `/jugar/eco` con la fila ya sembrada): jugar 2 rondas y ver que el eco de la ronda 1 repite el recorrido exacto.
5. `npm run build` y `npm run lint`.

---

## Acceptance criteria

- [ ] HUD superior (Jugador/Puntuación/Vidas/Nivel) refleja score, vidas (3 al inicio) y nivel (ronda) reales en vivo.
- [ ] PAUSA congela jugador, ecos, orbe y temporizador exactamente donde estaban; REANUDAR continúa sin saltos (`dt` cap 0.05 s).
- [ ] FIN fuerza el fin real (`vidas = 0`, `onGameOver(score)`) y abre el modal con el score real.
- [ ] Quedarse sin vidas por ecos también abre el modal con el score real; completar la ronda 12 (`win`) idem.
- [ ] Guardar puntuación vía `saveScoreAction` (solo `gameId`/`name`/`score`) se ve en `/salon` tras recargar.
- [ ] JUGAR DE NUEVO remonta el canvas (`key={runId}`): score 0, vidas 3, nivel 1, sin ecos.
- [ ] `rocas`, `tetris`, `arkanoid`, `snake` y los ids sin entrada en el registry siguen exactamente igual (placeholder mock).
- [ ] El jugador se mueve con las 4 flechas a 230 px/s, diagonal normalizada, sin salirse del borde de arena; las flechas no hacen scroll de la página.
- [ ] Recoger un orbe suma `round((100 + bonus rapidez) × multiplicador de racha)` y aparece otro a ≥ 140 px del jugador.
- [ ] Al terminar la ronda 1 (12 s) aparece un eco que repite el recorrido grabado; durante el primer segundo de cada ronda los ecos se ven translúcidos e intangibles.
- [ ] Tocar un eco (fuera de gracia e invulnerabilidad) resta 1 vida, activa 1.5 s de invulnerabilidad (parpadeo) y resetea la racha.
- [ ] Nunca hay más de 5 ecos; el más viejo se descarta primero.
- [ ] Las teclas `P`/`Escape` no pausan nada dentro del canvas.
- [ ] `npm run build` y `npm run lint` pasan sin errores.

---

## Decisions

- **Sí:** tema inventado por game-jam: **"eco"**. Juego `eco`. Razón: no hay usuario; ningún spec en `specs/game-jam/` (solo `rana`) ni en `references/` lo usa. — decidido por game-jam — revisar.
- **Sí:** mecánica de "bucle temporal" (recorrido grabado → enemigo futuro) con PRNG determinista propio en el estado. Razón: no duplica shooter (rocas), caída de piezas (tetris), pala/rebote (arkanoid) ni crecimiento/colisión de cuerpo (snake); el PRNG mantiene el motor testeable y sin globals. — decidido por game-jam — revisar.
- **Sí:** 12 rondas de 12 s, máx. 5 ecos simultáneos, 3 vidas (`hasLives: true`, `initialLives: 3`). Razón: partidas de ~2.5 min máx.; con cap de ecos la dificultad se estabiliza. — decidido por game-jam — revisar.
- **Sí:** solo flechas (sin WASD). Razón: consistente con el resto de los juegos y con los códigos `Arrow*` del futuro layout táctil. — decidido por game-jam — revisar.
- **Sí:** `levelParams` devuelve valores fijos aquí y se reemplaza en GJ-eco-03. Razón: 01 debe ser jugable de punta a punta por sí sola.
- **No:** skins ni `touch` en el registry. Razón: se agregan luego con `skin-designer`/`mobile-porter`.
- **Heredado (no re-decidir):** sin pausa propia (`P`/`Esc`; la controla `paused`), sin sonido, sin mouse/touch/gamepad, sin RLS, `best`/`plays` fijos, `saveScoreAction` solo guarda `gameId`/`name`/`score`, HUD React genérico de 4 campos (lo específico se dibuja en el canvas), sin `document`/`window`/`localStorage` en el motor.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Ecos y jugador coinciden en `(400,300)` al inicio de cada ronda → muerte injusta | `PHASE_GRACE = 1 s` de intangibilidad de ecos y jugador reseteado al centro solo en intermission. |
| Grabación dependiente de `dt` variable → eco desincronizado | Grabación con acumulador fijo `SAMPLE_DT`; el eco interpola linealmente por tiempo de ronda. |
| Rondas con 5 ecos sin espacio seguro para orbes | `spawnOrb` prueba 20 posiciones y cae a la esquina más lejana; `orbLife` reubica el orbe si no se toma. |
| Dt grande al reanudar de pausa | Cap `Math.min(dt, 0.05)` igual que los demás canvas. |
| Callbacks React en cada frame | Solo se emiten cuando el valor cambia (comparación con el frame previo). |
| Agregar `eco` al registry rompe otros juegos | Criterio explícito de no-regresión y prueba manual de `/jugar/rocas`, `/jugar/tetris`. |

---

## What is **not** in this spec

- Migración/seed de `games` y CSS de portada (GJ-eco-02).
- Tabla de niveles, efectos visuales y balance (GJ-eco-03).
- Skins, controles táctiles, sonido, mouse, gamepad.
- Persistir ronda alcanzada o `win` en el score guardado.
- Recalcular `best`/`plays` con datos reales; RLS.

Cada uno de estos, si se necesita, va en su propia spec.
