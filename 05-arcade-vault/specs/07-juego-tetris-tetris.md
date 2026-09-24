# SPEC 07 — Juego real: Tetris (03-tetris)

> **Status:** Approved
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-24
> **Objective:** Portar el juego standalone `references/started-games/03-tetris/game.js` a un motor+canvas de Next.js, integrarlo en `/jugar/tetris` con leaderboard real en Supabase, y crear un `components/games/registry.ts` genérico de "juegos reales" migrando `rocas` a él (segundo juego real: ya no se adivina la forma de la abstracción).

---

## Scope

**In:**

- `components/games/tetris-engine.ts`: motor puro portado de `game.js`. `GameState { board, current, next, score, lines, level, lives: 0, state: "playing" | "gameover", dropAccum, dropInterval }`. Funciones: `initGame()`, `update(gs, dtMs)` (auto-drop por `dropAccum`/`dropInterval`, lock, `clearLines`), acciones `moveLeft(gs)`/`moveRight(gs)`/`softDrop(gs)`/`hardDrop(gs)`/`rotate(gs)` (con wall kicks `[0,-1,1,-2,2]`), `draw(ctx, gs, W, H)` (grid, tablero, ghost al 20% alpha, pieza actual, panel lateral con NEXT y LÍNEAS dibujado dentro del propio canvas), `endGame(gs)` reutilizable por el spawn-colisión normal y por `forceGameOver`. Mantiene idénticas las 8 piezas (7 estándar + "N" tuerca 3×3), la paleta `COLORS`, `LINE_SCORES`, la fórmula de nivel (`floor(lines/10)+1`) y de velocidad (`max(100, 1000-(level-1)*90)`), y el puntaje (soft +1/fila, hard +2/celda, línea × nivel). Sin `document`/`window`/`localStorage`/tema — recibe `ctx`, `W`, `H` e inputs por parámetro, igual que `asteroids-engine.ts`.
- `components/games/TetrisCanvas.tsx` (`"use client"`): wrapper con canvas 800×600, sigue el mismo patrón que `AsteroidsCanvas.tsx` — `forwardRef` + `useImperativeHandle({ forceGameOver })`, props `GameCanvasProps` (`paused`, `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`), loop `requestAnimationFrame` con `dt` cap a 0.05s, listeners `keydown` en `window` (`ArrowLeft/Right/Down`, `ArrowUp`/`KeyX` rotar, `Space` hard drop con `preventDefault`), sin tecla de pausa propia (`KeyP` del original se elimina — la pausa la controla la prop `paused`, decisión ya tomada en spec 05). Los callbacks se disparan solo cuando el valor cambia; `onLivesChange` nunca se llama (no hay vidas) o se llama una vez con `0` al montar, a definir en implementación siguiendo lo que ya haga `AsteroidsCanvas` para consistencia. Cleanup de listeners + `cancelAnimationFrame` en el `useEffect`.
- `components/games/registry.ts` (**nuevo**): extrae los tipos compartidos `GameCanvasProps`/`GameCanvasHandle` (hoy definidos inline en `AsteroidsCanvas.tsx`) y define `GAME_REGISTRY: Record<string, { Canvas: ForwardRefExoticComponent<GameCanvasProps & RefAttributes<GameCanvasHandle>>; hasLives: boolean; initialLives: number }>` con dos entradas: `rocas` (`hasLives: true, initialLives: 3`) y `tetris` (`hasLives: false, initialLives: 0`). `AsteroidsCanvas.tsx` pasa a importar `GameCanvasProps`/`GameCanvasHandle` desde `registry.ts` en vez de declararlos localmente.
- `components/player/GamePlayerClient.tsx`: reemplaza el `isRocas`/`asteroidsRef`/`rocasLevel` hardcodeados por `const entry = GAME_REGISTRY[game.id]`, un `canvasRef` genérico tipado `GameCanvasHandle`, y `realLevel` (renombre de `rocasLevel`). El HUD "Vidas" sigue mostrando `"♥ ".repeat(lives).trim() || "—"` sin cambios (ya cae en `—` cuando `lives` es 0). Botón FIN llama `canvasRef.current?.forceGameOver()` si `entry` existe, si no mantiene `endGame()`. Dentro de `.game-arena`: si `entry`, renderiza `<entry.Canvas key={runId} ref={canvasRef} paused={...} onScoreChange={...} onLivesChange={...} onLevelChange={setRealLevel} onGameOver={...} />`; si no, el placeholder mock actual sin cambios. `restart()` pasa a resetear `score` a 0, `lives` a `entry?.initialLives ?? 3`, `level`/`realLevel` a 1, y a incrementar un nuevo estado `runId` para forzar el remount del canvas vía `key` (hoy `restart()` no reinicia el canvas de rocas en absoluto — se corrige para ambos juegos del registry).
- Migración Supabase (`mcp__supabase__apply_migration`, nombre `seed_game_tetris`): `insert into games` con la fila de tetris.
- `app/globals.css`: no se agrega nada nuevo — `.game-arena canvas` (línea ~695) ya fuerza `width:100%; height:100%; aspect-ratio:4/3`, y `.cover-tetro` (línea ~425) ya existe con el gradiente/bloques correctos para el cover de este juego. El paso de implementación solo **verifica** que ambas reglas sigan aplicando tal cual, sin escribir CSS.

**Out of scope (para otra spec):**

- Adaptar los otros 6 juegos restantes de `references/started-games/`.
- Sonido, gamepad, controles táctiles/mobile (el original no los tiene).
- Tema claro/oscuro y `localStorage` del standalone original (la app ya tiene su propio tema global; el toggle de tetris no aplica).
- Hold piece, sistema de bolsa "7-bag" o SRS completo — se mantiene el generador aleatorio simple y los wall kicks básicos del original, sin mejoras de mecánica no pedidas.
- Mostrar "LÍNEAS" en el HUD React compartido (Jugador/Puntuación/Vidas/Nivel) — se queda dibujado dentro del canvas, como ya lo hacía el original en su propio panel, para no tocar el HUD compartido con un campo específico de un solo juego.
- Persistir `lines` o nivel alcanzado como parte del score guardado — `saveScoreAction` sigue guardando solo `gameId`, `name`, `score`.
- Recalcular `best`/`plays` con datos reales de partidas jugadas.
- Configurar RLS (sigue diferido, mismo estado que spec 06).

---

## Data model

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays) values
  ('tetris', 'TETRIS', 'Encaja bloques, borra líneas, no llegues arriba.',
   'Piezas de cuatro bloques —y una tuerca traicionera— caen sin pausa. Rótalas, deslízalas y completa filas para borrarlas. Cada diez líneas el nivel sube y la caída se acelera. Si la pila toca el techo, se acabó.',
   'PUZZLE', 'cover-tetro', 'magenta', 28750, '9.8K');
```

Tipos TS de `lib/data.ts` no cambian (`PUZZLE` ya está en `CATS`, `magenta` ya está en `GameColor`). Tipos nuevos en `components/games/registry.ts`:

```ts
export type GameCanvasProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

export type GameCanvasHandle = {
  forceGameOver: () => void;
};

export const GAME_REGISTRY: Record<
  string,
  {
    Canvas: ForwardRefExoticComponent<GameCanvasProps & RefAttributes<GameCanvasHandle>>;
    hasLives: boolean;
    initialLives: number;
  }
> = {
  rocas: { Canvas: AsteroidsCanvas, hasLives: true, initialLives: 3 },
  tetris: { Canvas: TetrisCanvas, hasLives: false, initialLives: 0 },
};
```

---

## Implementation plan

1. `components/games/tetris-engine.ts` — copiar constantes/piezas/lógica de `game.js`, quitar DOM/localStorage/tema, exponer `initGame`, `update`, `moveLeft`, `moveRight`, `softDrop`, `hardDrop`, `rotate`, `draw`, `endGame` operando sobre `GameState`.
2. `components/games/TetrisCanvas.tsx` — wrapper `"use client"` siguiendo el patrón exacto de `AsteroidsCanvas.tsx`: `useRef` al canvas, `useEffect` con listeners de teclado y loop rAF (dt cap 0.05s), `useImperativeHandle` con `forceGameOver` (llama `endGame(gs)` del motor), comparación de `score`/`level`/`state` contra el frame previo para disparar callbacks, cleanup de listeners y `cancelAnimationFrame`.
3. `components/games/registry.ts` — crear con los tipos compartidos (moviéndolos fuera de `AsteroidsCanvas.tsx`) y el `GAME_REGISTRY` con `rocas` + `tetris`; editar `AsteroidsCanvas.tsx` para importar `GameCanvasProps`/`GameCanvasHandle` desde ahí en vez de declararlos localmente.
4. `components/player/GamePlayerClient.tsx` — reemplazar `isRocas`/`asteroidsRef`/`rocasLevel` por `entry = GAME_REGISTRY[game.id]`/`canvasRef`/`realLevel`; agregar estado `runId` incrementado en `restart()`; `restart()` también resetea `lives` a `entry?.initialLives ?? 3` y `level`/`realLevel` a 1; renderizar `<entry.Canvas key={runId} .../>` cuando `entry` existe.
5. Aplicar migración `seed_game_tetris` (`mcp__supabase__apply_migration`) con el insert de la sección Data model.
6. Verificar en `app/globals.css` que `.game-arena canvas` y `.cover-tetro` siguen cubriendo el caso sin cambios — no se escribe CSS nuevo.
7. Sin assets nuevos (el original no usa imágenes/sonidos).
8. Verificar `npm run build` y `npm run lint`.

---

## Acceptance criteria

- [ ] El juego aparece en `/`, `/inicio` y `/salon` (tab propio "TETRIS").
- [ ] `/juego/tetris` muestra su leaderboard real (vacío si no hay scores).
- [ ] `/jugar/tetris` es jugable con controles reales (mover, rotar, soft/hard drop) dentro de `.crt-screen`.
- [ ] Las 8 piezas (7 estándar + tuerca "N") caen con los colores del original; la rotación horaria aplica los wall kicks `[0,-1,1,-2,2]`.
- [ ] La pieza fantasma (ghost) se ve al 20% de opacidad en la posición de aterrizaje.
- [ ] El panel del canvas muestra NEXT (siguiente pieza) y LÍNEAS acumuladas.
- [ ] Puntuación: `[0,100,300,500,800]` × nivel al limpiar líneas, +1 por fila en soft drop, +2 por celda en hard drop; el nivel sube cada 10 líneas y la velocidad de caída aumenta según la fórmula original.
- [ ] HUD superior (Jugador/Puntuación/Vidas/Nivel) refleja score y nivel reales en vivo; Vidas muestra `—` siempre (tetris no tiene vidas).
- [ ] La tecla `P` no pausa nada dentro del canvas; solo el botón PAUSA/REANUDAR del contenedor controla la pausa.
- [ ] `Espacio` (hard drop) no hace scroll de la página.
- [ ] PAUSA congela el juego exactamente donde quedó; REANUDAR continúa sin saltos.
- [ ] FIN fuerza el fin real de la partida (torre se congela, `state` pasa a game over) y abre el modal con el score real.
- [ ] Que una pieza nueva colisione al spawnear (torre llega arriba) también abre el modal automáticamente con el score real, sin tocar FIN.
- [ ] Guardar puntuación inserta en `scores` vía `saveScoreAction` y se refleja en `/salon` tras recargar.
- [ ] JUGAR DE NUEVO reinicia una partida real tanto en `/jugar/tetris` como en `/jugar/rocas` (canvas remontado desde cero, score/vidas/nivel del HUD en sus valores iniciales) — corrige el bug donde `restart()` no reiniciaba el canvas de rocas.
- [ ] `rocas` sigue funcionando exactamente igual que antes (ahora vía `GAME_REGISTRY`) y cualquier id sin entrada en el registry sigue mostrando el placeholder mock.
- [ ] `npm run build` y `npm run lint` pasan sin errores.

---

## Decisions

- **Sí:** crear `components/games/registry.ts` ahora. Razón: spec 05 difirió explícitamente esta abstracción hasta tener un segundo juego real "para no adivinar su forma correcta" — tetris es ese segundo juego, y la forma (`Canvas` + `hasLives`/`initialLives` por `GameCanvasProps`/`Handle` comunes) surge directamente de comparar `AsteroidsCanvas.tsx` con lo que necesita `TetrisCanvas.tsx`.
- **Sí:** migrar `rocas` al registry en la misma spec en vez de dejarlo hardcodeado y solo agregar tetris aparte. Razón: mantener dos mecanismos distintos (`isRocas` hardcodeado + registry nuevo) en el mismo componente sería peor que consolidar en uno solo; `GamePlayerClient.tsx` ya centraliza esa lógica.
- **Sí:** id `tetris`, cat `PUZZLE`, color `magenta`, cover `cover-tetro` (reusa clase existente sin CSS nuevo). Razón: confirmado por el usuario vía preguntas de este skill.
- **Sí:** canvas único 800×600 con panel NEXT/LÍNEAS dibujado dentro del propio canvas (no un `<canvas>` HTML separado como el original). Razón: confirmado por el usuario — encaja directamente en la regla `.game-arena canvas { aspect-ratio: 4/3 }` ya existente, sin CSS de letterboxing nuevo, igual que rocas.
- **Sí:** `lives` fijo en `0`/`hasLives: false` para tetris, sin criterio de "fin de partida por perder vidas". Razón: el juego original no tiene concepto de vidas — el fin de partida ocurre solo cuando una pieza nueva colisiona al spawnear (torre llena), documentado explícitamente en el skill.
- **Sí:** corregir el bug de `restart()` (no remonta el canvas de rocas hoy) como parte de esta spec, vía `key={runId}`. Razón: se toca `GamePlayerClient.tsx` de todas formas para introducir el registry, y sin este fix "JUGAR DE NUEVO" en tetris dejaría el tablero anterior visible con un HUD reseteado a medias — inconsistencia visible al agregar el segundo juego.
- **No:** tecla de pausa propia (`KeyP`) ni tema claro/oscuro del standalone original. Razón: decisión ya tomada en spec 05 (pausa la controla el contenedor) y la app ya tiene su propio sistema de tema global.
- **No:** mostrar LÍNEAS en el HUD React compartido. Razón: es un dato específico de tetris; agregarlo al HUD de 4 campos compartido por todos los juegos rompería su forma genérica por un solo caso — se queda dibujado en el canvas, como en el original.
- **No:** hold piece, 7-bag o SRS. Razón: no pedido, cambia mecánicas del original más allá de portarlo tal cual.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| `Espacio`/flechas hacen scroll de la página al jugar (comportamiento default del navegador) | `TetrisCanvas.tsx` llama `e.preventDefault()` en el listener de `keydown` para `Space` y las flechas, igual que ya hace `AsteroidsCanvas.tsx` para `Space`. |
| Listeners de teclado globales (`window`) interfieren con el `<input>` de iniciales del modal de fin de partida | El motor ignora input cuando `state === "gameover"`; el `useEffect` remueve los listeners en cleanup al desmontar el canvas. |
| `dt` grande al reanudar de pausa | Mismo cap de 50ms (`Math.min(dt, 0.05)`) que ya usa `AsteroidsCanvas.tsx`; no se acumula `dropAccum` mientras `paused`. |
| Migrar `rocas` al registry rompe su comportamiento actual | Acceptance criteria explícito "rocas sigue funcionando exactamente igual"; se prueba manualmente `/jugar/rocas` end-to-end tras el cambio, no solo tetris. |
| Remontar el canvas con `key={runId}` en cada `restart()` podría perder estado si se incrementa en el momento equivocado (ej. durante el juego, no solo al reiniciar) | `runId` solo se incrementa dentro de `restart()`, nunca en otro handler; se verifica que jugar normalmente (sin tocar "JUGAR DE NUEVO") no remonta el canvas. |
| `drawGrid` del original leía la variable CSS `--grid-line` vía `getComputedStyle` — no existe fuera del DOM del canvas standalone | El motor portado usa un color fijo (mismo valor hex que resuelve `--grid-line` hoy) en vez de leer CSS, igual que `asteroids-engine.ts` no depende de `getComputedStyle`. |

---

## What is **not** in this spec

- Adaptar los otros 6 juegos restantes de `references/started-games/`.
- Sonido, gamepad, controles táctiles.
- Tema claro/oscuro y `localStorage` del standalone original.
- Hold piece, 7-bag, SRS completo.
- "LÍNEAS" en el HUD React compartido.
- Persistir `lines`/nivel alcanzado en el score guardado.
- Actualizar `best`/`plays` con datos reales.
- Configuración de RLS/policies.

Cada uno de estos, si se necesita, va en su propia spec.
