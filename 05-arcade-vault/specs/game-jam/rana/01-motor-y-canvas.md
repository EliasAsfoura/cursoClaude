# SPEC GJ-rana-01 — Motor y canvas (Rana)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-09-28
> **Objective:** Crear desde cero (modo "juego nuevo", sin `game.js` fuente) un Frogger llamado **RANA**: motor puro `components/games/rana-engine.ts` + wrapper `components/games/RanaCanvas.tsx`, y registrarlo en el `GAME_REGISTRY` existente para que `/jugar/rana` sea jugable con HUD real, pausa, FIN y modal de fin de partida. La fila en Supabase y la verificación de rutas van en GJ-rana-02; la tabla de niveles y el pulido visual, en GJ-rana-03.

---

## Scope

**In:**

- `components/games/rana-engine.ts`: motor puro, sin `document`/`window`/`localStorage`/`Image`/`Audio`. Recibe `ctx`, `W`, `H` y las acciones por parámetro, igual que `snake-engine.ts`/`arkanoid-engine.ts`.
  - **Grilla lógica:** `CELL = 40`, `COLS = 20`, `ROWS = 15` (800×600 exactos, sin panel lateral). Mapa de filas:
    - fila `0`: barra superior (texto `NIVEL NN` + 5 íconos de charca llena/vacía), fila decorativa, no jugable.
    - fila `1`: orilla/seto (`HEDGE_ROW = 1`) con 5 charcas de 2 celdas de ancho en columnas `HOME_COLS = [1, 5, 9, 13, 17]` (cada charca ocupa `col` y `col+1`, es decir x ∈ `[col*CELL, (col+2)*CELL)`).
    - filas `2`–`6`: río (`RIVER_ROWS`).
    - fila `7`: mediana segura (`MEDIAN_ROW`).
    - filas `8`–`12`: calle (`ROAD_ROWS`).
    - fila `13`: vereda de salida (`START_ROW`).
    - fila `14`: barra inferior con la barra de tiempo, fila decorativa, no jugable.
  - **Constantes:** `HOP_TIME = 0.1` (s, solo animación), `DEATH_TIME = 0.8` (s), `BASE_TIME_PER_FROG = 30` (s), `MIN_TIME_PER_FROG = 18` (s), `TIME_STEP_PER_LEVEL = 2` (s), `SPEED_STEP = 0.12`, `MAX_SPEED_MULT = 2.2`, `SPAWN_COL = 9`, `FROG_INSET = 6` (px de margen del hitbox de la rana por lado), `VEHICLE_INSET = 4` (px de margen vertical del hitbox de vehículos), `DIVE_CYCLE = 4` (s), `DIVE_UP = 2.8` (s arriba), `DIVE_SINKING = 0.6` (s hundiéndose, todavía seguro), `DIVE_UNDER = 0.6` (s sumergida, no segura), `SPAN = W + 6 * CELL = 1040` (px, período de wrap de carriles).
  - **Puntaje (constantes exportadas):** `SCORE_STEP = 10` (por cada salto que alcanza una fila nueva más alta que la mejor de ese intento), `SCORE_HOME = 50` (al llenar una charca), `SCORE_TIME_BONUS = 10` (× `floor(timeLeft)` segundos restantes al llenar una charca), `SCORE_ROUND = 1000` (al llenar las 5 charcas).
  - **Carriles base (`LANE_DEFS`, nivel 1):** `{ row, kind: "road" | "river", dir: 1 | -1, speed (px/s), obj: ObjKind, len (celdas), count }`:

    | Fila | Tipo | Dir | Speed | Objeto | Largo | Cantidad |
    | --- | --- | --- | --- | --- | --- | --- |
    | 12 | road | -1 | 60 | `car` | 1 | 3 |
    | 11 | road | +1 | 80 | `dozer` | 1 | 3 |
    | 10 | road | -1 | 100 | `car` | 1 | 3 |
    | 9 | road | +1 | 70 | `car` | 1 | 2 |
    | 8 | road | -1 | 140 | `truck` | 2 | 2 |
    | 6 | river | +1 | 50 | `log` | 3 | 3 |
    | 5 | river | -1 | 70 | `turtle` | 2 | 4 |
    | 4 | river | +1 | 90 | `log` | 5 | 2 |
    | 3 | river | -1 | 60 | `turtle` | 3 | 3 |
    | 2 | river | +1 | 80 | `log` | 4 | 3 |

    En la fila 3, el objeto de índice `0` es buceador (`diver: true`). En la fila 5 no hay buceadores en este spec (GJ-rana-03 los agrega por nivel).
  - **Tipos:**
    ```ts
    export type ObjKind = "car" | "dozer" | "truck" | "log" | "turtle";
    export type GameStatus = "playing" | "dying" | "gameover";
    export interface LaneObj { x: number; w: number; kind: ObjKind; diver: boolean; color: string }
    export interface Lane { row: number; kind: "road" | "river"; dir: 1 | -1; speed: number; objects: LaneObj[] }
    export interface Frog { x: number; row: number; fromX: number; fromRow: number; hopT: number; facing: "up" | "down" | "left" | "right" }
    export interface GameState {
      frog: Frog; lanes: Lane[]; homes: boolean[]; // 5
      score: number; lives: number; level: number; state: GameStatus;
      timeLeft: number; timePerFrog: number; speedMult: number;
      bestRow: number; // fila más alta (número menor) alcanzada en el intento actual
      deathTimer: number; diveClock: number; deathCause: "road" | "water" | "time" | "hedge" | null;
    }
    ```
  - **Funciones exportadas:**
    - `initGame(): GameState` — `lives: 3`, `score: 0`, `level: 1`, `state: "playing"`, `homes: [false×5]`, carriles construidos desde `LANE_DEFS` con `x_i = i * SPAN / count` (dir +1) o `x_i = W - i * SPAN / count` (dir -1), `w = len * CELL`, color por tipo (`car` alterna `#ff2bd6`/`#ffe600`/`#00f5ff` por índice, `dozer` `#ff8a00`, `truck` `#e8e8ff`, `log` `#7a4a1e`, `turtle` `#1f8a5a`); rana en `x = SPAWN_COL * CELL = 360`, `row = START_ROW`, `bestRow = START_ROW`, `timePerFrog = timeForLevel(1) = 30`, `timeLeft = 30`, `speedMult = speedForLevel(1) = 1`.
    - `timeForLevel(level) = max(MIN_TIME_PER_FROG, BASE_TIME_PER_FROG - (level - 1) * TIME_STEP_PER_LEVEL)`; `speedForLevel(level) = min(MAX_SPEED_MULT, 1 + (level - 1) * SPEED_STEP)`. Ambas exportadas para que GJ-rana-03 las reemplace por tabla sin tocar el resto.
    - `hop(gs, dx, dy)` — ignora si `state !== "playing"` o si `hopT > 0` (un salto a la vez). Guarda `fromX`/`fromRow`, `hopT = HOP_TIME`, `facing`. Nueva fila `clamp(row + dy, HEDGE_ROW, START_ROW)`; nueva x `clamp(x + dx * CELL, 0, W - CELL)`. Si la nueva fila `< bestRow` → `score += SCORE_STEP`, `bestRow = row`. Si la nueva fila es `HEDGE_ROW` → `resolveHome(gs)` inmediato.
    - `update(gs, dt)` (dt en segundos): si `gameover` no hace nada. Siempre (también en `dying`) mueve carriles: `x += dir * speed * speedMult * dt`; wrap `dir > 0 && x > W → x -= SPAN`, `dir < 0 && x + w < 0 → x += SPAN`; `diveClock += dt`. Baja `hopT` hasta 0. En `dying`: `deathTimer -= dt`; al llegar a 0 → si `lives <= 0` `state = "gameover"`, si no `respawn(gs)`. En `playing`: `timeLeft -= dt` (≤0 → `killFrog(gs, "time")`); luego colisiones sobre la posición lógica (`frog.x`, `frog.row`):
      - fila de calle: hitbox rana `[x+FROG_INSET, x+CELL-FROG_INSET]` vs cada vehículo `[o.x, o.x+o.w]` (vertical ya coincide por fila; `VEHICLE_INSET` solo se usa para dibujo/altura) → solapamiento → `killFrog(gs, "road")`.
      - fila de río: `cx = x + CELL/2`; buscar objeto seguro con `o.x <= cx <= o.x + o.w` (un buceador en fase sumergida —`diveClock % DIVE_CYCLE >= DIVE_UP + DIVE_SINKING`— no es seguro). Si hay → `frog.x += dir * speed * speedMult * dt` (arrastre, también desplaza `fromX` para que la animación no salte); si `cx < 0` o `cx > W` tras el arrastre → `killFrog(gs, "water")`. Si no hay → `killFrog(gs, "water")`.
      - filas 7 y 13: seguras.
    - `resolveHome(gs)` (interna): `cx = x + CELL/2`; si `cx` cae en la charca `i` (`HOME_COLS[i]*CELL <= cx < (HOME_COLS[i]+2)*CELL`) y `homes[i] === false` → `homes[i] = true`, `score += SCORE_HOME + SCORE_TIME_BONUS * floor(timeLeft)`, y si las 5 están llenas → `score += SCORE_ROUND`, `level += 1`, `homes` vacías, `speedMult = speedForLevel(level)`, `timePerFrog = timeForLevel(level)`; luego `respawn(gs)`. Si cae en charca llena o en el seto → `killFrog(gs, "hedge")`.
    - `killFrog(gs, cause)` (interna): `lives -= 1`, `state = "dying"`, `deathTimer = DEATH_TIME`, `deathCause = cause`.
    - `respawn(gs)` (interna): rana a `x = 360`, `row = START_ROW`, `hopT = 0`, `facing = "up"`, `bestRow = START_ROW`, `timeLeft = timePerFrog`, `state = "playing"`, `deathCause = null`.
    - `endGame(gs)`: `lives = 0`, `state = "gameover"`. Reusada por `forceGameOver`. No-op si ya es `gameover`.
    - `draw(ctx, gs, W, H)`: fondo por filas (fila 0 y 14 `#05050f`; seto fila 1 `#0a3a1a` con las 5 charcas `#001a4a` recortadas; río `#001a4a` con ondas `rgba(0,245,255,0.12)`; mediana y vereda `#2a0a3a`; calle `#111` con líneas discontinuas `#444` entre carriles); objetos: vehículos `fillRect` con inset vertical `VEHICLE_INSET` + ventana oscura del lado de avance, troncos `fillRect` redondeado con vetas `#5a3414`, tortugas como círculos `r = CELL/2 - 5` por celda (buceador hundiéndose al 50% alpha, sumergido no se dibuja salvo un anillo `rgba(0,245,255,0.3)`); charcas llenas con una rana dibujada adentro; rana `#00ff88` (cuerpo + 4 patas + 2 ojos orientados por `facing`), posición dibujada = lerp de `fromX/fromRow` a `x/row` con `t = 1 - hopT / HOP_TIME`; en `dying` se dibuja una "X" `#ff2b4a` (calle/tiempo/seto) o un círculo de salpicadura `#00f5ff` (agua) en lugar de la rana. Fila 0: `NIVEL NN` (monospace bold 16px, `#00ff88`) a la izquierda y 5 cuadritos de charca a la derecha. Fila 14: etiqueta `TIEMPO` y barra `width = (W - 160) * timeLeft / timePerFrog`, color `#00ff88`. En `gameover`: overlay `rgba(0,0,0,0.6)` + `GAME OVER` (bold 46px) + `PUNTAJE: N`, igual que arkanoid.
- `components/games/RanaCanvas.tsx` (`"use client"`): canvas 800×600, patrón exacto de `SnakeCanvas.tsx`. `forwardRef<GameCanvasHandle, GameCanvasProps>` (tipos importados de `./registry`), `useImperativeHandle({ forceGameOver })` → `endGame(gsRef.current)` si no es `gameover`. Refs: `canvasRef`, `gsRef = useRef(initGame())`, `pausedRef`, `gameOverFiredRef`. Listener `keydown` en `window`: `ArrowUp`/`KeyW` → `hop(gs, 0, -1)`, `ArrowDown`/`KeyS` → `hop(gs, 0, 1)`, `ArrowLeft`/`KeyA` → `hop(gs, -1, 0)`, `ArrowRight`/`KeyD` → `hop(gs, 1, 0)`; `preventDefault()` en las 4 flechas; `if (e.repeat) return` (un salto por pulsación); ignora input si `pausedRef.current` o `state !== "playing"`. Loop rAF con `dt = min((ts - last)/1000, 0.05)`; `update` solo si no está pausado; `draw` siempre. Compara `score`/`lives`/`level` contra el frame previo y dispara `onScoreChange`/`onLivesChange`/`onLevelChange` solo si cambian; `onGameOver(gs.score)` una única vez al entrar en `gameover`. Cleanup: `removeEventListener` + `cancelAnimationFrame`.
- `components/games/registry.ts`: agregar `import RanaCanvas from "./RanaCanvas";` y la entrada `rana: { Canvas: RanaCanvas, hasLives: true, initialLives: 3 }` al final del `GAME_REGISTRY`, sin tocar tipos ni las otras 4 entradas.

**Out of scope (para otra spec):**

- Fila `rana` en la tabla `games`, verificación de `/`, `/inicio`, `/juego/rana`, `/salon` y de `saveScoreAction` → GJ-rana-02.
- Tabla de niveles con valores por nivel, tortugas buceadoras extra, mosca bonus, vida extra, partículas, shake y flashes → GJ-rana-03.
- Sonido, mouse, touch y gamepad.
- Cocodrilos, nutrias, serpiente en la mediana y "lady frog" del Frogger original.
- Sprites/imágenes (todo con formas planas).

---

## Data model

Sin cambios en DB en esta spec (el `insert` va en GJ-rana-02). Hasta que exista la fila, `/jugar/rana` no resuelve el juego; para probar este spec aislado se implementa GJ-rana-02 inmediatamente después, o se prueba el motor tras aplicar la migración de 02.

Tipos TS de `lib/data.ts` no cambian. `components/games/registry.ts` no cambia de forma — solo suma la entrada:

```ts
export const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
  rocas: { Canvas: AsteroidsCanvas, hasLives: true, initialLives: 3 },
  tetris: { Canvas: TetrisCanvas, hasLives: false, initialLives: 0 },
  arkanoid: { Canvas: ArkanoidCanvas, hasLives: true, initialLives: 3 },
  snake: { Canvas: SnakeCanvas, hasLives: false, initialLives: 0 },
  rana: { Canvas: RanaCanvas, hasLives: true, initialLives: 3 },
};
```

Tipos nuevos (solo en `rana-engine.ts`): `ObjKind`, `GameStatus`, `LaneObj`, `Lane`, `Frog`, `GameState` (ver Scope).

---

## Implementation plan

1. `components/games/rana-engine.ts` — constantes de grilla/tiempo/puntaje, `LANE_DEFS`, tipos, `initGame`, `timeForLevel`, `speedForLevel`, `hop`, `update` (carriles con wrap, reloj de buceo, timer, colisiones calle/río/arrastre, estado `dying` → respawn/gameover), `resolveHome`, `killFrog`, `respawn`, `endGame`, `draw`.
2. `components/games/RanaCanvas.tsx` — wrapper `"use client"` copiando la estructura de `SnakeCanvas.tsx`: refs, `useImperativeHandle`, `keydown` (flechas + WASD, `e.repeat` ignorado, `preventDefault` en flechas), loop rAF con cap 0.05s, callbacks solo al cambiar, cleanup. Sin carga de imágenes.
3. `components/games/registry.ts` — import de `RanaCanvas` + entrada `rana`.
4. Verificar `npm run build` y `npm run lint`.
5. Tras aplicar GJ-rana-02, probar manualmente `/jugar/rana` contra los Acceptance criteria.

---

## Acceptance criteria

- [ ] `/jugar/rana` es jugable con flechas y WASD dentro de `.crt-screen`; cada pulsación mueve la rana exactamente una celda (40px) y mantener la tecla apretada no encadena saltos.
- [ ] Las flechas no hacen scroll de la página.
- [ ] La rana no puede salir por los bordes laterales saltando ni bajar de la vereda de salida (fila 13).
- [ ] Los 5 carriles de calle y los 5 de río se mueven con la dirección, velocidad, tipo, largo y cantidad de la tabla `LANE_DEFS`, y reaparecen del lado opuesto sin saltos visibles (wrap con `SPAN = 1040`).
- [ ] Tocar un vehículo en la calle cuesta una vida.
- [ ] Caer al agua (sin tronco/tortuga bajo el centro de la rana) cuesta una vida.
- [ ] Parada sobre un tronco o tortuga, la rana es arrastrada a la velocidad del objeto; si el arrastre la saca de la pantalla, pierde una vida.
- [ ] El grupo de tortugas buceador de la fila 3 se hunde cada 4s (0.6s hundiéndose seguro, 0.6s sumergido); estar encima mientras está sumergido cuesta una vida.
- [ ] Llegar a una charca vacía la llena, suma `50 + 10 × segundos restantes` y respawnea la rana en la vereda; saltar al seto o a una charca ya llena cuesta una vida.
- [ ] Llenar las 5 charcas suma 1000, sube el nivel (HUD Nivel en vivo), vacía las charcas, acelera los carriles (`1 + 0.12 × (nivel-1)`, tope 2.2) y reduce el tiempo por rana (`30 - 2 × (nivel-1)`, mínimo 18).
- [ ] Cada salto que alcanza una fila más alta que la mejor del intento suma 10; retroceder y volver a avanzar no vuelve a sumar.
- [ ] La barra de tiempo del canvas se vacía en 30s en nivel 1; al llegar a 0 se pierde una vida.
- [ ] Tras perder una vida hay 0.8s de animación de muerte (mundo en movimiento, input ignorado) antes del respawn.
- [ ] HUD superior (Jugador/Puntuación/Vidas/Nivel) refleja score, vidas (3 corazones al inicio) y nivel reales en vivo.
- [ ] `P`/`Escape` no pausan nada dentro del canvas; PAUSA congela el juego exactamente donde quedó (carriles, rana, timer, reloj de buceo); REANUDAR continúa sin saltos.
- [ ] FIN fuerza el fin real de la partida (vidas a 0, overlay GAME OVER) y abre el modal con el score real.
- [ ] Perder la última vida por las reglas propias del juego (sin tocar FIN) también abre el modal automáticamente con el score real, una sola vez.
- [ ] Guardar puntuación inserta en `scores` vía `saveScoreAction` y se refleja en `/salon` tras recargar (requiere GJ-rana-02 aplicado).
- [ ] JUGAR DE NUEVO reinicia una partida real (canvas remontado vía `key={runId}`, rana en la vereda, charcas vacías, score 0, 3 vidas, nivel 1).
- [ ] `rocas`, `tetris`, `arkanoid` y `snake` siguen funcionando exactamente igual; cualquier id sin entrada en el registry sigue mostrando el placeholder mock.
- [ ] `rana-engine.ts` no referencia `document`, `window`, `localStorage` ni `Image`.
- [ ] `npm run build` y `npm run lint` pasan sin errores.

---

## Decisions

- **Sí:** modo "juego nuevo" desde cero: no existe carpeta de Frogger en `references/started-games/`, así que las mecánicas se definen en esta spec a partir del Frogger clásico (Konami, 1981). **Decidido por game-jam — revisar.**
- **Sí:** id `rana`, title `RANA`, cat `ARCADE`, color `green`, cover `cover-rana` (la clase ya existe en `app/globals.css`). Razón: `rana` ya figuraba en `references/game-suggestions-to-do.md`. Se descartó `VERSUS` (la categoría vacía) porque Frogger no tiene rival, y PUZZLE/SHOOTER no encajan. Los 4 colores ya se usan una vez cada uno, así que se eligió verde porque combina con la rana y con el `--green` del cover existente. **Decidido por game-jam — revisar.**
- **Sí:** vidas (`hasLives: true, initialLives: 3`), igual que rocas/arkanoid. Razón: en el Frogger clásico se pierde una rana por choque, ahogo o tiempo. **Decidido por game-jam — revisar.**
- **Sí:** grilla 20×15 de 40px que ocupa todo el canvas 800×600, con barras propias en las filas 0 y 14 en vez de panel lateral. Razón: encaja exacto en `.game-arena canvas { aspect-ratio: 4/3 }` sin CSS nuevo y deja 5+5 carriles, mediana, vereda y orilla. **Decidido por game-jam — revisar.**
- **Sí:** movimiento discreto de una celda por pulsación, ignorando `e.repeat`. Razón: en Frogger se salta tecla por tecla; con el autorepeat, mantener la tecla haría cruzar la calle sin timing. **Decidido por game-jam — revisar.**
- **Sí:** posición horizontal continua (`x` float) y fila discreta. Razón: los troncos arrastran a la rana a velocidades no múltiplos de la celda. **Decidido por game-jam — revisar.**
- **Sí:** colisiones sobre la posición lógica (destino del salto), con la animación de 0.1s solo visual. Razón: simplifica el motor y evita casos en que la rana queda "en el aire" sobre el agua. **Decidido por game-jam — revisar.**
- **Sí:** que el arrastre fuera de la pantalla mate a la rana. Razón: regla clásica de Frogger. **Decidido por game-jam — revisar.**
- **Sí:** puntaje 10/fila nueva, 50 por charca + 10 por segundo restante, 1000 por ronda completa. Razón: es la estructura del original, adaptada a segundos enteros. **Decidido por game-jam — revisar.**
- **Sí:** barra de nivel y barra de tiempo dibujadas dentro del canvas. Razón: el HUD React compartido es genérico de 4 campos (decisión heredada de SPEC 07); el tiempo por rana es un dato propio de este juego.
- **No:** pausa propia con `P`/`Esc`. Razón: decisión ya tomada en SPEC 05/07 (la controla la prop `paused`).
- **No:** sonido, mouse, touch ni gamepad. Razón: decisión heredada de SPEC 05/07/08.
- **No:** sprites/imágenes. Razón: formas planas como arkanoid (SPEC 08); evita carga asíncrona en el motor. **Decidido por game-jam — revisar.**
- **No:** cocodrilos, nutrias, serpiente en la mediana ni "lady frog". Razón: suman complejidad sin cambiar la mecánica central; quedan para una spec futura si se piden. **Decidido por game-jam — revisar.**

---

## Risks

| Risk | Mitigation |
| --- | --- |
| `dt` grande al reanudar de pausa hace que los carriles "salten" o que el timer caiga de golpe | Cap `Math.min(dt, 0.05)` igual que los demás canvas; `update` no corre mientras `pausedRef.current`. |
| El wrap de objetos largos (troncos de 200px) aparece/desaparece dentro de la pantalla | `SPAN = W + 6*CELL = 1040` > `W + len_max` (800 + 200); el wrap solo ocurre cuando el objeto está totalmente afuera. |
| La rana muere "injustamente" al borde de un tronco por usar el centro | Se usa el centro de la rana (`cx`) con límites inclusivos `o.x <= cx <= o.x + o.w`; aceptado como regla clásica, se verifica jugando varias partidas. |
| Doble disparo de `onGameOver` (muerte por reglas + FIN el mismo frame) | `gameOverFiredRef` como en `SnakeCanvas.tsx`; `endGame` es no-op si ya es `gameover`. |
| Listeners globales de `keydown` capturan letras (W/A/S/D) al escribir iniciales en el modal | El motor ignora input en `gameover`; el cleanup del `useEffect` remueve el listener al desmontar; `preventDefault` solo se aplica a flechas, no a letras. |
| Agregar `rana` al registry rompe los otros juegos | Solo se agrega una línea de import y una entrada; se prueba manualmente `/jugar/rocas`, `/jugar/tetris`, `/jugar/arkanoid`, `/jugar/snake`. |

---

## What is **not** in this spec

- Seed de `games` y verificación de rutas/leaderboard (GJ-rana-02).
- Tabla de niveles, mosca bonus, vida extra, partículas, shake y flashes (GJ-rana-03).
- Sonido, mouse, touch, gamepad.
- Cocodrilos, nutrias, serpiente, lady frog.
- Sprites o assets en `public/games/rana/`.
- Persistir nivel alcanzado en el score guardado.
- Actualizar `best`/`plays` con datos reales.
- Configuración de RLS/policies.

Cada uno de estos, si se necesita, va en su propia spec.
