# SPEC 03 — Menú de pausa con selección de nivel

> **Status:** Implemented
> **Depends on:** SPEC 01
> **Date:** 2026-09-15
> **Objective:** Agregar tecla P/Escape que abre un menú de pausa dibujado en canvas con 5 casillas numeradas para saltar directo a cualquier nivel.

---

## Scope

**In:**

- Tecla `P`/`p` o `Escape` alterna el menú de pausa. Funciona desde `'playing'`, `'gameover'` y `'victory'`.
- Al abrir, `state.screen` pasa a `'paused'` y se guarda `state.previousScreen` para saber a qué pantalla volver al cerrar.
- Menú dibujado en canvas (mismo estilo que `drawEndScreen`): overlay semitransparente + 5 casillas numeradas 1-5, una por nivel.
- Con el menú abierto, presionar tecla `1`-`5` salta directo a ese nivel: resetea vidas a 3, puntaje a 0, ajusta `ballSpeedMultiplier` a `1.15^(N-1)`, reconstruye bloques de `LEVELS[N-1]`, resetea paddle y bola, y vuelve a `'playing'`.
- Se agregan layouts nuevos `LEVELS[3]` y `LEVELS[4]` (nivel 4 y 5), mismo formato de grid 10x5 que niveles existentes, para que los 5 botones tengan nivel real.
- Selección solo por teclado (sin click de mouse sobre las casillas).
- Cerrar el menú sin elegir nivel (volver a presionar `P`/`Escape`) restaura `state.previousScreen` sin resetear nada (si estaba `'playing'`, el juego sigue igual que antes de pausar; si estaba `'gameover'`/`'victory'`, vuelve a esa pantalla).
- Tecla `M`/`m` funciona solo con `state.screen === 'paused'` y alterna `state.muted`. El menú muestra el estado actual (silenciado/activado). El valor persiste en `localStorage` (`MUTE_KEY`) y se lee al cargar la página.
- `playSound` no reproduce nada si `state.muted` es `true`.

**Out of scope (for future specs):**

- Click de mouse sobre las casillas del menú.
- Otras opciones adicionales en el menú de pausa (reiniciar, salir).
- Persistir el nivel/progreso entre sesiones (localStorage). Saltar de nivel es solo en memoria, como hoy.
- Animar la transición de apertura/cierre del menú.
- Deshabilitar visualmente botones (no aplica: los 5 niveles existen desde este spec).

---

## Data model

```js
// state.screen ahora puede ser: 'playing' | 'gameover' | 'victory' | 'paused'
state.previousScreen = 'playing'; // pantalla a la que se vuelve al cerrar el menú

// Nuevos layouts, mismo formato que LEVELS[0..2] (grid 10 cols x 5 filas)
LEVELS[3] = [ /* nivel 4 */ ];
LEVELS[4] = [ /* nivel 5 */ ];

// Nuevo: estado de silenciado, leído/escrito en localStorage
const MUTE_KEY = 'arkanoid:muted';
state.muted = localStorage.getItem( MUTE_KEY ) === 'true';
```

Convenciones:

- `state.previousScreen` se escribe cada vez que se abre el menú (transición hacia `'paused'`), y se lee/aplica cada vez que se cierra.
- No se agrega ninguna constante nueva de layout; se reutiliza `buildBlocks` y la paleta de colores ya soportada por el spritesheet (`gray`, `red`, `yellow`, `cyan`, `magenta`, `hotpink`, `green`).
- `MUTE_KEY` sigue la misma convención que `HIGH_SCORE_KEY` (prefijo `arkanoid:`).

---

## Implementation plan

1. Agregar `LEVELS[3]` y `LEVELS[4]` en `game.js` con grids nuevos de 10x5 usando los colores soportados. Sistema sigue funcional (niveles 1-3 sin cambios, nivel 4-5 alcanzables solo si se llega jugando o vía menú).
2. Agregar `state.previousScreen = 'playing'` al estado inicial.
3. Agregar listener de `keydown` para `'p'`, `'P'`, `'Escape'`: si `state.screen` es `'playing'`, `'gameover'` o `'victory'`, guardar `state.previousScreen = state.screen` y poner `state.screen = 'paused'`; si `state.screen === 'paused'`, restaurar `state.screen = state.previousScreen`.
4. Ajustar el listener existente de `' '` (restart) para que solo dispare en `'gameover'`/`'victory'`, no en `'paused'` (hoy dispara en cualquier `screen !== 'playing'`).
5. Agregar listener de `keydown` para `'1'`-`'5'`: si `state.screen === 'paused'`, llamar `jumpToLevel(Number(e.key))`.
6. Implementar `jumpToLevel(n)`: `state.level = n`, `state.score = 0`, `state.lives = 3`, `state.ballSpeedMultiplier = Math.pow(1.15, n - 1)`, `state.blocks = buildBlocks(LEVELS[n - 1])`, `resetPaddle()`, `resetBall()`, `state.screen = 'playing'`.
7. Implementar `drawPauseMenu()` (estilo `drawEndScreen`): overlay semitransparente, título "PAUSA", 5 casillas numeradas 1-5 en fila u grid, texto indicando "Presiona 1-5 para saltar de nivel" y "P/Escape para continuar".
8. En `draw()`, llamar `drawPauseMenu()` cuando `state.screen === 'paused'` (misma rama donde hoy se llama `drawEndScreen`).
9. Agregar `const MUTE_KEY = 'arkanoid:muted';` y `state.muted = localStorage.getItem( MUTE_KEY ) === 'true';` al estado inicial.
10. Modificar `playSound(audio)` para retornar sin reproducir si `state.muted` es `true`.
11. Agregar listener de `keydown` para `'m'`/`'M'`: si `state.screen === 'paused'`, alternar `state.muted = !state.muted` y guardar `localStorage.setItem( MUTE_KEY, String( state.muted ) )`.
12. En `drawPauseMenu()`, mostrar línea de texto con el estado actual, ej. `'M: Sonido ' + (state.muted ? 'silenciado' : 'activado')`.

---

## Acceptance criteria

- [x] Presionar `P` o `Escape` durante `'playing'` abre el menú de pausa y detiene el juego (bola, paddle, power-ups quedan congelados).
- [x] Presionar `P` o `Escape` de nuevo estando en el menú lo cierra y el juego continúa exactamente donde estaba (misma posición de bola/paddle/bloques).
- [x] Presionar `P` o `Escape` durante `'gameover'` o `'victory'` abre el menú; cerrarlo sin elegir nivel vuelve a esa misma pantalla de fin de juego.
- [x] Con el menú abierto, presionar `1`, `2` o `3` salta a ese nivel con vidas=3, puntaje=0, bloques del nivel correspondiente, y velocidad de bola ajustada (`1.15^(N-1)`).
- [x] Con el menú abierto, presionar `4` o `5` salta a los nuevos niveles 4 y 5 con bloques propios visibles y jugables (romper todos termina el nivel o el juego si es el nivel 5).
- [x] El resto de la jugabilidad (colisiones, HUD, power-ups, animaciones de SPEC 02) sigue funcionando igual en cualquier nivel, incluidos 4 y 5.
- [x] Con el menú abierto, presionar `M` alterna silenciar/activar sonido; el menú muestra el estado actual y ningún sonido (`ball-bounce.mp3`, `break-sound.mp3`) se reproduce mientras está silenciado.
- [x] El estado de mute persiste tras recargar la página (se guarda en `localStorage`).

---

## Decisions

- **Yes:** overlay dibujado en canvas, no HTML/CSS separado. Consistente con `drawEndScreen` existente, sin introducir DOM nuevo.
- **Yes:** selección solo por teclado (1-5), sin hit-test de mouse. Menor complejidad, alcanza el pedido original.
- **Yes:** saltar de nivel resetea vidas/puntaje/velocidad como si fuera una partida nueva empezando en ese nivel, evita estados inconsistentes (ej. llegar a nivel 5 con 0 vidas).
- **Yes:** se crean niveles 4 y 5 ahora (grids nuevos), en vez de dejar botones deshabilitados, porque el pedido original fue explícitamente "botones 1-5".
- **Yes:** P/Escape también abre el menú desde game over/victoria, permitiendo saltar de nivel sin pasar por restart completo.
- **No:** click de mouse sobre las casillas. Fuera de alcance, teclado alcanza.
- **No:** persistencia de nivel alcanzado entre sesiones. No se pidió y no hay sistema de guardado hoy.
- **Yes:** mute solo activable desde el menú de pausa (tecla `M`), no como tecla global. Evita silenciar por accidente durante el juego y mantiene todas las acciones de audio agrupadas en el mismo menú.
- **Yes:** mute persiste en `localStorage`, mismo mecanismo que `HIGH_SCORE_KEY`, consistente con lo ya implementado en SPEC 01.

---

## What is **not** in this spec

- Click de mouse sobre las casillas del menú de pausa.
- Otras opciones dentro del menú (reiniciar, mute, salir).
- Persistencia de progreso/nivel entre sesiones.
- Animaciones de transición al abrir/cerrar el menú.

Cada uno de estos, si se decide implementar, va en su propio spec.
