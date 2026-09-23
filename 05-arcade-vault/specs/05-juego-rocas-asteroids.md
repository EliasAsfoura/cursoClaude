# SPEC 05 — Juego real: Rocas (Asteroids)

> **Status:** Implemented
> **Depends on:** SPEC 01
> **Date:** 2026-09-23
> **Objective:** Portar el juego standalone `references/started-games/02-asteroids/game.js` a un componente canvas de Next.js e integrarlo en `/jugar/rocas`, reemplazando el placeholder mock solo para ese juego.

---

## Scope

**In:**

- `components/games/asteroids-engine.ts`: motor puro portado de `game.js` (clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`, funciones `initGame`/`update`/`draw`/`spawnAsteroids`/`nextLevel`/`killShip`/`explode`), sin dibujar su propio HUD de texto (se elimina `drawHUD`) y sin `document`/`window` globales — recibe `ctx`, `W`, `H` y un objeto de teclas por parámetro.
- `components/games/AsteroidsCanvas.tsx` (`"use client"`): wrapper que monta un `<canvas>` de 800×600, corre el loop (`requestAnimationFrame`), maneja input de teclado (`ArrowLeft/Right/Up`, `Space`) igual que el original, y expone:
  - Props: `paused: boolean` (si `true`, `update()` no corre pero el loop sigue vivo y `draw()` sigue pintando el frame congelado).
  - Callbacks: `onScoreChange(score)`, `onLivesChange(lives)`, `onLevelChange(level)`, `onGameOver(finalScore)` — se llaman solo cuando el valor cambia respecto al frame anterior.
  - `ref` con `useImperativeHandle` exponiendo `forceGameOver()`: mata la nave real (mismo camino que colisión, vidas a 0, dispara `onGameOver`) para que el botón "FIN" termine la partida real en vez de solo navegar.
- `app/jugar/[id]/page.tsx`: si `game.id === "rocas"`, renderiza `AsteroidsCanvas` dentro de `.game-arena` en vez del placeholder (`.grid-floor`, `.enemy`, `.player-ship`); el HUD React existente (`hud-stat` de Jugador/Puntuación/Vidas/Nivel) pasa a leer `score`/`lives`/`level` reales via los callbacks de arriba en vez del `setInterval` aleatorio y de `Math.floor(score / 2500) + 1`. Botón PAUSA togglea la prop `paused`. Botón FIN llama `forceGameOver()`. El modal de fin de partida y `saveScore()` no cambian, solo reciben el `score` real.
- Cualquier otro `id` (`bloque-buster`, `caida`, etc.) sigue mostrando exactamente el placeholder mock actual — sin cambios de comportamiento.

**Out of scope (para otra spec):**

- Adaptar los otros 7 juegos de `references/started-games/` (solo existe Asteroids ahora).
- Un mecanismo/registro genérico de "juego real vs mock" reutilizable — se decide explícitamente no construirlo todavía; se resuelve con un `if (game.id === "rocas")` puntual.
- Sonido, gamepad, mobile/touch controls (el original no los tiene).
- Guardar el nivel alcanzado o estadísticas extra del run — `saveScore` sigue guardando solo `gameId`, `name`, `score` como hoy.
- Ajustar `best`/`plays` de `GAMES` en `lib/data.ts` con datos reales de partidas jugadas.

---

## Data model

No introduce estructuras de datos persistentes ni tablas. Solo tipos de props/callbacks del componente:

```ts
type AsteroidsCanvasProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

type AsteroidsCanvasHandle = {
  forceGameOver: () => void;
};
```

---

## Implementation plan

1. Crear `components/games/asteroids-engine.ts`: copiar clases y funciones de `game.js`, quitando el acceso directo a `document`/`canvas` global (se pasa `ctx` a `draw()`), quitando `drawHUD` (el HUD ahora es responsabilidad de React), y devolviendo/aceptando el estado del juego (`score`, `lives`, `level`, `state`) de forma que el wrapper pueda leerlo cada frame.
2. Crear `components/games/AsteroidsCanvas.tsx`: `useRef` al `<canvas>`, `useEffect` para listeners de teclado (`keydown`/`keyup` con `justPressed`, igual que el original) y el loop `requestAnimationFrame`, limpiando listeners y cancelando el frame en el cleanup. Cada frame: si `!paused`, llama `update(dt)`; siempre llama `draw()`; compara `score`/`lives`/`level` contra el frame anterior y dispara los callbacks solo si cambiaron; si el estado interno pasa a `'gameover'`, dispara `onGameOver(score)` una sola vez. `useImperativeHandle(ref, () => ({ forceGameOver }))` donde `forceGameOver` fuerza `lives = 0` y llama el mismo camino que `killShip()`.
3. Editar `app/jugar/[id]/page.tsx`:
   - Agregar `const isRocas = game.id === "rocas"`.
   - Estado React `score`, `lives`, `level` inicializan en `0`/`3`/`1` y, si `isRocas`, se actualizan solo por los callbacks del canvas (se quita el `setInterval` aleatorio y el cálculo `Math.floor(score / 2500) + 1` para este caso).
   - `ref` a `AsteroidsCanvasHandle`; botón FIN llama `ref.current?.forceGameOver()` si `isRocas`, si no mantiene el comportamiento actual (`endGame()`).
   - Dentro de `.game-arena`: si `isRocas`, renderizar `<AsteroidsCanvas ref={...} paused={paused} onScoreChange={setScore} onLivesChange={setLives} onLevelChange={setLevel} onGameOver={(finalScore) => { setScore(finalScore); endGame(); }} />`; si no, mantener el placeholder actual (`.grid-floor`, `.enemy`, `.player-ship`).
4. CSS: agregar en `app/globals.css` la regla para que el `<canvas>` de Asteroids escale dentro de `.crt-screen` manteniendo proporción 4:3 (800×600) sin desbordar, reusando el fondo negro que ya tiene `.crt-screen`.
5. Verificar `npm run build` y `npm run lint`.

---

## Acceptance criteria

- [ ] `/jugar/rocas` muestra la nave, asteroides y disparo real dentro de `.crt-screen`, controlable con flechas y espacio.
- [ ] El HUD superior (Jugador/Puntuación/Vidas/Nivel) refleja el score, vidas y nivel reales del juego en vivo, no valores aleatorios.
- [ ] Botón PAUSA congela el juego (nave, asteroides y balas dejan de moverse) y REANUDAR lo continúa exactamente donde quedó.
- [ ] Botón FIN termina la partida real (vidas a 0) y abre el modal de fin de partida con el score real alcanzado hasta ese momento.
- [ ] Perder las 3 vidas dentro del juego (sin tocar FIN) también abre el modal de fin de partida automáticamente, con el score real.
- [ ] Guardar puntuación desde el modal llama `saveScore({ gameId: "rocas", name, score })` con el score real y aparece reflejado si se revisa `/salon` o el detalle de `rocas`.
- [ ] Los asteroides grandes se parten en medianos y estos en pequeños al ser destruidos, igual que el juego original.
- [ ] Cualquier otro juego (ej. `/jugar/bloque-buster`) sigue mostrando el placeholder mock actual, sin cambios de comportamiento ni errores en consola.
- [ ] `npm run build` y `npm run lint` pasan sin errores.

---

## Decisions

- **Sí:** separar motor (`asteroids-engine.ts`, sin DOM) del wrapper (`AsteroidsCanvas.tsx`, con `useEffect`/canvas). Razón: pedido explícito del usuario de mantener el motor testeable/portable independiente de React.
- **Sí:** comunicación motor→React por callbacks (`onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`) en vez de que el canvas dibuje su propio HUD de texto. Razón: confirmado por el usuario — evita HUD duplicado (uno en canvas, otro en React) y el HUD React ya existe y tiene el estilo del proyecto.
- **Sí:** pausa controlada por prop `paused` desde el contenedor React (el botón PAUSA/REANUDAR de la app), no por una tecla propia del juego. Razón: confirmado por el usuario — "el contenedor... va a controlar la pausa"; el loop sigue vivo (rAF no se cancela) para no perder el `dt` timing al reanudar.
- **Sí:** `forceGameOver()` vía `useImperativeHandle` para que el botón FIN termine una partida real (mata la nave, vidas a 0) en vez de solo navegar. Razón: mantiene consistencia — FIN siempre debe llevar al modal de guardar score con un número real, igual que perder las 3 vidas.
- **No:** mecanismo genérico de "juego real vs mock" para otros ids. Razón: confirmado por el usuario — solo se adapta `rocas` por ahora; generalizar sin tener un segundo juego real de referencia sería adivinar la forma correcta de la abstracción.
- **No:** tocar `best`/`plays` en `lib/data.ts` ni el leaderboard de `/salon` más allá de que ya lee de `getScores()`/`saveScore()` existentes. Razón: fuera del pedido, y esos campos son mock deliberado de specs anteriores.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| El `dt` se congela en un valor grande al reanudar de pausa (loop de rAF no se detiene pero pasa tiempo real) | Al pausar, no se acumula dt; al reanudar, el primer frame post-pausa usa el mismo cap de 50ms (`Math.min(..., 0.05)`) que ya tiene el original para evitar salto. |
| Colisión de nombres de clase CSS del canvas con `.game-arena` existente (pensado para el placeholder con `position: absolute`) | Revisar `app/globals.css` antes de agregar reglas nuevas para el `<canvas>`; el placeholder deja de renderizarse para `rocas`, no coexisten. |
| Listeners de teclado (`keydown`/`keyup`) globales del canvas interfieren con otros inputs de la página (ej. el `<input>` de iniciales en el modal de fin de partida) | El `useEffect` del canvas remueve sus listeners en el cleanup al desmontar; además, mientras `state === 'gameover'` el motor ya no lee `ArrowLeft/Right/Up`, solo se apoya en el callback `onGameOver` disparado una vez. |

---

## What is **not** in this spec

- Adaptar los otros 7 juegos de `references/started-games/`.
- Registro/mecanismo genérico para juegos reales vs mock.
- Sonido, gamepad, controles táctiles.
- Persistir nivel alcanzado o stats extra del run.
- Actualizar `best`/`plays` con datos reales.

Cada uno de estos, si se necesita, va en su propia spec.
