# SPEC 09 — Juego real: Snake (frutas)

> **Status:** Approved
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-25
> **Objective:** Crear un juego de Snake desde cero (sin `game.js` fuente — no hay carpeta en `references/started-games/` para este juego) usando como referencia visual el atlas de sprites en `references/source-assets/snake-assets/` (`fruits.png` + `sprites.js`), integrarlo en `/jugar/snake` con leaderboard real en Supabase vía `GAME_REGISTRY` (ya existe, tercer juego que se agrega ahí).

---

## Scope

**In:**

- `components/games/snake-engine.ts`: motor puro. `GameState { snake: {x,y}[], dir: {x,y}, nextDir: {x,y}, fruit: {x,y,kind}, score, level, lives: 0, state: "playing" | "gameover", moveAccum, moveInterval }`. Grid lógico `COLS=20, ROWS=20`, celda `CELL=30` (tablero 600×600 dibujado centrado dentro de un canvas 800×600, con panel lateral igual que `tetris-engine.ts`, para reusar `.game-arena canvas { aspect-ratio: 4/3 }` sin CSS nuevo). Funciones: `initGame()`, `setDirection(gs, dx, dy)` (ignora reversa de 180°, guarda en `nextDir` hasta el próximo tick para no perder inputs entre frames), `update(gs, dtMs)` (auto-tick por `moveAccum`/`moveInterval`: aplica `nextDir`, mueve cabeza, detecta colisión con pared o con el propio cuerpo → `endGame(gs)`, detecta comer fruta → crece la serpiente, suma puntos, sube nivel cada 5 frutas, reduce `moveInterval`, coloca fruta nueva en celda libre con `kind` aleatorio del atlas), `draw(ctx, gs, W, H, fruitImg)` (tablero, grid tenue, serpiente por segmentos con cabeza diferenciada, fruta dibujada con `ctx.drawImage` recortando `fruitImg` según `FRUIT_ATLAS[gs.fruit.kind]`, panel lateral con NIVEL), `endGame(gs)` reutilizable por colisión normal y por `forceGameOver`. Sin `document`/`window`/DOM — recibe `ctx`, `W`, `H`, la imagen ya cargada y acciones por parámetro, igual que `tetris-engine.ts`.
- `components/games/snake-engine.ts` incluye también `FRUIT_ATLAS`: copia tipada (`Record<string, {x,y,w,h}>`) de las 21 entradas de `fruits` en `references/source-assets/snake-assets/sprites.js` (banana, orange, grape, garlic, eggplant, strawberry, cherry, carrot, mushroom, broccoli, watermelon, pepper, kiwi, lemon, peach, peanut, apple, tomato, berries, grapes2, pineapple, melon), sin el wrapper `window.SPRITE_ATLAS`/`sources`.
- `public/games/snake/fruits.png`: copia de `references/source-assets/snake-assets/fruits.png` (hoja 3790×442px, fondo transparente).
- `components/games/SnakeCanvas.tsx` (`"use client"`): wrapper con canvas 800×600, mismo patrón que `TetrisCanvas.tsx` — `forwardRef` + `useImperativeHandle({ forceGameOver })`, props `GameCanvasProps`, carga `fruitImg` una vez con `new Image()` apuntando a `/games/snake/fruits.png` en un `useEffect` (guardada en `useRef`, `draw` se llama solo si `img.complete` para evitar parpadeo del primer frame sin imagen cargada), loop `requestAnimationFrame` con `dt` cap a 0.05s, listeners `keydown` en `window` (`ArrowUp/Down/Left/Right` y `KeyW/KeyA/KeyS/KeyD` → `setDirection`, con `preventDefault` en las flechas para no scrollear la página), sin tecla de pausa propia (la controla la prop `paused`). `onLivesChange(0)` una vez al montar, igual que tetris. Cleanup de listener + `cancelAnimationFrame`.
- `components/games/registry.ts`: agrega la entrada `snake: { Canvas: SnakeCanvas, hasLives: false, initialLives: 0 }` al `GAME_REGISTRY` ya existente (no se crea desde cero — ya lo creó SPEC 07 y lo extendió SPEC 08 con arkanoid).
- Migración Supabase (`mcp__supabase__apply_migration`, nombre `seed_game_snake`): `insert into games` con la fila de snake.
- `app/globals.css`: no se agrega nada nuevo — `.game-arena canvas` (línea ~695) ya fuerza `width:100%; height:100%; aspect-ratio:4/3`, y `.cover-snake` (línea ~442) ya existe con gradiente verde + serpiente de puntos. El paso de implementación solo **verifica** que ambas reglas sigan aplicando tal cual.

**Out of scope (para otra spec):**

- Adaptar los demás juegos restantes de `references/started-games/`.
- Sonido, gamepad, controles táctiles/mobile.
- Tema claro/oscuro (la app ya tiene su propio tema global).
- "Wrap around" de bordes (teletransportar al lado opuesto) — el original de referencia (Google Snake) usa pared sólida = game over; se mantiene esa regla, no se agrega wrap.
- Obstáculos, power-ups o múltiples frutas simultáneas — un único fruto en pantalla a la vez, igual que el Snake clásico.
- Mostrar tipo de fruta actual por nombre en el HUD compartido — el panel lateral del canvas solo muestra NIVEL, igual criterio que tetris con "LÍNEAS" (dato específico del juego, no se toca el HUD de 4 campos).
- Persistir nivel alcanzado como parte del score guardado — `saveScoreAction` sigue guardando solo `gameId`, `name`, `score`.
- Recalcular `best`/`plays` con datos reales de partidas jugadas.
- Configurar RLS (sigue diferido, mismo estado que spec 06).

---

## Data model

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays) values
  ('snake', 'SNAKE', 'Come frutas, crece, no te muerdas ni choques.',
   'Guía la serpiente por el tablero comiendo frutas reales —banana, sandía, kiwi, uva— tomadas de un atlas de sprites. Cada fruta te hace crecer y sube el puntaje; cada 5 frutas el nivel sube y la velocidad aumenta. Chocar contra la pared o contra tu propio cuerpo termina la partida.',
   'ARCADE', 'cover-snake', 'cyan', 15200, '11.4K');
```

Tipos TS de `lib/data.ts` no cambian (`ARCADE` ya está en `CATS`, `cyan` ya está en `GameColor`). `components/games/registry.ts` no cambia de forma, solo agrega la entrada `snake` al `GAME_REGISTRY` existente (mismo tipo `GameRegistryEntry` de SPEC 07/08).

---

## Implementation plan

1. `public/games/snake/fruits.png` — copiar desde `references/source-assets/snake-assets/fruits.png`.
2. `components/games/snake-engine.ts` — `FRUIT_ATLAS` portado de `sprites.js`, `GameState`, `initGame`, `setDirection`, `update` (tick por `moveAccum`/`moveInterval`, colisión pared/cuerpo, crecimiento, fruta nueva en celda libre), `draw` (tablero 600×600 centrado en canvas 800×600, grid, serpiente, fruta vía `drawImage` recortado del atlas, panel NIVEL), `endGame`.
3. `components/games/SnakeCanvas.tsx` — wrapper `"use client"` siguiendo patrón exacto de `TetrisCanvas.tsx`: carga de `fruits.png` en `useRef<HTMLImageElement>`, `useEffect` con listeners de teclado (flechas + WASD) y loop rAF (dt cap 0.05s), `useImperativeHandle` con `forceGameOver` (llama `endGame(gs)`), callbacks `onScoreChange`/`onLevelChange` solo cuando cambian, `onLivesChange(0)` al montar, cleanup de listener + `cancelAnimationFrame`.
4. `components/games/registry.ts` — agregar `snake: { Canvas: SnakeCanvas, hasLives: false, initialLives: 0 }` al `GAME_REGISTRY`.
5. Aplicar migración `seed_game_snake` (`mcp__supabase__apply_migration`) con el insert de la sección Data model.
6. Verificar en `app/globals.css` que `.game-arena canvas` y `.cover-snake` siguen cubriendo el caso sin cambios — no se escribe CSS nuevo.
7. Verificar `npm run build` y `npm run lint`.

---

## Acceptance criteria

- [ ] El juego aparece en `/`, `/inicio` y `/salon` (tab propio "SNAKE").
- [ ] `/juego/snake` muestra su leaderboard real (vacío si no hay scores).
- [ ] `/jugar/snake` es jugable con flechas y WASD dentro de `.crt-screen`.
- [ ] La serpiente crece un segmento por cada fruta comida; la fruta se dibuja con el sprite real recortado de `fruits.png` (no un cuadrado de color placeholder).
- [ ] El tipo de fruta varía aleatoriamente entre las 21 disponibles en el atlas en cada aparición.
- [ ] Chocar contra la pared o contra el propio cuerpo termina la partida (game over inmediato, sin sistema de vidas).
- [ ] Invertir dirección 180° en un solo input (ej. derecha→izquierda) no causa auto-colisión inmediata (se ignora el input inválido).
- [ ] El nivel sube cada 5 frutas comidas y la velocidad de movimiento (tick) aumenta según fórmula definida en el motor.
- [ ] HUD superior (Jugador/Puntuación/Vidas/Nivel) refleja score y nivel reales en vivo; Vidas muestra `—` siempre (snake no tiene vidas).
- [ ] Flechas de dirección no hacen scroll de la página.
- [ ] PAUSA congela el juego exactamente donde quedó (incluida la fruta visible y su posición); REANUDAR continúa sin saltos ni tick perdido/duplicado.
- [ ] FIN fuerza el fin real de la partida y abre el modal con el score real.
- [ ] Chocar por las reglas propias del juego (sin tocar FIN) también abre el modal automáticamente con el score real.
- [ ] Guardar puntuación inserta en `scores` vía `saveScoreAction` y se refleja en `/salon` tras recargar.
- [ ] JUGAR DE NUEVO reinicia una partida real (canvas remontado vía `key={runId}`, snake/fruta/score/nivel en valores iniciales).
- [ ] `rocas`, `tetris` y `arkanoid` siguen funcionando exactamente igual (registry solo extendido, no modificado en forma).
- [ ] `npm run build` y `npm run lint` pasan sin errores.

---

## Decisions

- **Sí:** modo "juego nuevo" sin `game.js` fuente — no existe carpeta en `references/started-games/` para snake; el usuario aportó en cambio `references/source-assets/snake-assets/` (`fruits.png` + `sprites.js`) solo como referencia de sprites de frutas, no como motor a portar. El motor (`snake-engine.ts`) se diseña desde cero siguiendo mecánica clásica de Snake, confirmada con el usuario vía preguntas de este skill.
- **Sí:** canvas 800×600 (no 600×600) con tablero de juego 600×600 centrado y panel lateral de NIVEL, igual criterio que `tetris-engine.ts`. Razón: el usuario pidió grid 20×20 a 30px (tablero 600×600), pero `.game-arena canvas` ya fuerza `aspect-ratio: 4/3` sin CSS nuevo — envolver el tablero cuadrado en un canvas 800×600 con panel lateral reutiliza esa regla existente sin distorsionar la serpiente/frutas y sin agregar CSS específico para este juego.
- **Sí:** id `snake`, cat `ARCADE`, color `cyan`, cover `cover-snake` (reusa clase existente, ya tiene gradiente verde + puntos de serpiente, sin CSS nuevo). Razón: confirmado por el usuario vía preguntas de este skill; `cyan` es el único `GameColor` aún no usado por ningún juego existente.
- **Sí:** variar el tipo de fruta aleatoriamente entre las 21 del atlas en cada aparición, en vez de fruta fija. Razón: confirmado por el usuario — aprovecha visualmente todo el atlas entregado como referencia.
- **Sí:** sin sistema de vidas (`hasLives: false, initialLives: 0`, igual patrón que tetris), game over inmediato al chocar. Razón: mecánica clásica de Snake — no hay concepto de "vidas extra" en el género, un choque termina la partida.
- **No:** wrap-around de bordes. Razón: no pedido; Google Snake (la referencia visual usada para los sprites) usa pared sólida, se mantiene esa regla por defecto sin agregar una variante no solicitada.
- **No:** obstáculos, power-ups o múltiples frutas simultáneas. Razón: no pedido, mecánica clásica de un solo fruto a la vez.
- **No:** mostrar nombre de la fruta actual en el HUD React compartido. Razón: dato específico de este juego; mismo criterio que "LÍNEAS" en spec 07 — se queda en el panel dibujado dentro del canvas.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| `fruits.png` no cargó aún en el primer frame (`Image.onload` async) y `drawImage` con imagen incompleta no dibuja nada o rompe | `SnakeCanvas.tsx` solo dibuja la fruta si `img.complete` es `true`; mientras tanto el resto del tablero (serpiente, grid) se dibuja normal, la fruta simplemente no aparece hasta que cargue (carga es casi instantánea, archivo local en `public/`). |
| Coordenadas del atlas en `sprites.js` (portadas manualmente a `FRUIT_ATLAS`) tienen un typo y recortan mal un sprite | Se copian literalmente las 21 entradas de `sprites.js` sin recalcular, y se verifica visualmente cada fruta en `/jugar/snake` durante la implementación (varias partidas hasta ver la mayoría de tipos). |
| Tick de movimiento (`moveAccum`/`moveInterval`) acumula `dt` grande al reanudar de pausa y mueve la serpiente varias celdas de golpe | Mismo cap de 50ms (`Math.min(dt, 0.05)`) que ya usan `AsteroidsCanvas.tsx`/`TetrisCanvas.tsx`; `moveAccum` no se acumula mientras `paused`. |
| Input de dirección en el mismo tick que el giro anterior permite un giro de 180° válido en apariencia pero causa auto-colisión instantánea | `setDirection` compara contra la dirección **actual del movimiento** (`dir`, no la última tecla), no contra `nextDir`; una reversa exacta (`dx,dy` opuesto a `dir`) se ignora siempre, sin importar cuántas teclas se presionen entre ticks. |
| Fruta nueva se coloca sobre una celda ocupada por el cuerpo de la serpiente | `update` busca celda libre iterando hasta encontrar una no ocupada por `gs.snake` antes de asignar `gs.fruit` (tablero 20×20=400 celdas, nunca se llena en una partida normal, sin necesidad de límite de reintentos). |
| Listeners de teclado globales (`window`) interfieren con el `<input>` de iniciales del modal de fin de partida | El motor ignora input cuando `state === "gameover"`; el `useEffect` remueve los listeners en cleanup al desmontar el canvas, mismo patrón que tetris/rocas. |

---

## What is **not** in this spec

- Adaptar los demás juegos restantes de `references/started-games/`.
- Sonido, gamepad, controles táctiles.
- Wrap-around de bordes, obstáculos, power-ups, múltiples frutas.
- Nombre de fruta actual en el HUD React compartido.
- Persistir nivel alcanzado en el score guardado.
- Actualizar `best`/`plays` con datos reales.
- Configuración de RLS/policies.

Cada uno de estos, si se necesita, va en su propia spec.
