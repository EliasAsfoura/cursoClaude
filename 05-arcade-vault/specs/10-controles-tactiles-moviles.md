# SPEC 10 — Controles táctiles y layout móvil para los juegos

> **Status:** Implemented
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC 08, SPEC 09
> **Date:** 2026-09-28
> **Objective:** Hacer que rocas, tetris, arkanoid y snake sean jugables en un celular (portrait y landscape) mediante botones táctiles en pantalla que emulan las teclas actuales, sin tocar los motores.

---

## Why this spec exists

Hoy los 4 juegos solo escuchan `keydown`/`keyup` en `window`. En un celular no hay teclado, así que `/jugar/[id]` carga pero no se puede jugar. La solución elegida es un overlay de botones que **despacha eventos de teclado sintéticos** sobre `window`: los motores y wrappers `*Canvas.tsx` no cambian, y desktop queda idéntico.

---

## Scope

**In:**

- `components/player/TouchControls.tsx` (`"use client"`): componente que recibe un layout de botones y, por cada botón, mapea eventos `pointerdown`/`pointerup`/`pointercancel`/`pointerleave` a `window.dispatchEvent(new KeyboardEvent("keydown" | "keyup", { code, bubbles: true, cancelable: true }))`. Usa `setPointerCapture` y `preventDefault` para evitar scroll, zoom, menú contextual y pérdida de foco. Soporta multitáctil (cada botón es independiente: p. ej. mantener ◀ y tocar DISPARO a la vez en rocas).
- Modos de botón: `hold` (keydown al presionar, keyup al soltar — rocas ◀▶▲, arkanoid ◀▶) y `tap` (keydown+keyup inmediatos — disparo rocas, rotar/caída tetris, dirección snake). Modo `repeat` (keydown repetido: 180 ms de delay inicial, luego cada 60 ms; keyup al soltar) para ◀ ▶ ▼ de tetris, imitando el auto-repeat del teclado.
- Mapeo por juego (constante `TOUCH_LAYOUTS` en `components/games/registry.ts` como campo opcional `touch` de `GameRegistryEntry`):
  - `rocas`: ◀ `ArrowLeft` (hold), ▶ `ArrowRight` (hold), ▲ EMPUJE `ArrowUp` (hold), DISPARO `Space` (tap). `Space` también reinicia rocas en su propio game over interno, pero el modal React ya cubre el reinicio; no se agrega botón extra.
  - `tetris`: ◀ `ArrowLeft` (repeat), ▶ `ArrowRight` (repeat), ▼ `ArrowDown` (repeat), ROTAR `ArrowUp` (tap), CAÍDA `Space` (tap).
  - `arkanoid`: ◀ `ArrowLeft` (hold), ▶ `ArrowRight` (hold). Botones anchos (mitad izquierda/derecha del área de controles).
  - `snake`: D-pad ▲▼◀▶ → `ArrowUp/Down/Left/Right` (tap).
- `components/player/GamePlayerClient.tsx`: renderiza `<TouchControls>` debajo del `.crt` (portrait) cuando `entry?.touch` existe. El componente se oculta y no se monta el listener en dispositivos sin puntero táctil: visibilidad por CSS con `@media (pointer: coarse)`; en desktop `display: none`.
- Los botones no despachan nada mientras `paused` o `over` sean `true` (se pasa `disabled`) y al pausar se emite `keyup` de todo lo que estuviera presionado (evita teclas "pegadas" tras PAUSA/FIN/desmontaje).
- `app/globals.css`: estilos `.touch-controls`, `.touch-btn` (estética CRT/neón existente, mín. 64×64 px de zona táctil, `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none`) y reglas responsive del player.
- Layout responsive de `/jugar/[id]` en celular:
  - Portrait (`max-width: 720px`): `.av-player` con padding 12px, `.player-hud` en 2 columnas compactas, `.hud-actions` con botones que hacen wrap, `.crt` con padding 10px y radio menor, canvas a ancho completo manteniendo 4:3, controles táctiles debajo del CRT, `.crt-bottom` oculto.
  - Landscape (`(pointer: coarse) and (orientation: landscape) and (max-height: 520px)`): HUD en una sola fila compacta; `.crt` ocupa el alto disponible (`max-height: calc(100dvh - 90px)`); controles táctiles flotan sobre los lados izquierdo/derecho del canvas (izquierda: movimiento; derecha: acciones) con opacidad reducida (~0.55).
  - Modal de fin (`.modal`): ancho `min(92vw, 420px)`, `<input>` de iniciales con `font-size: 16px` (evita el zoom automático de iOS al enfocar).
- Evitar gestos del navegador durante el juego: `touch-action: none` en `.game-arena` y en `.touch-controls`; `overscroll-behavior: contain` en la página del player.
- Verificar (sin cambiar) que `app/layout.tsx` entrega el viewport `width=device-width, initial-scale=1` (default de Next). Si falta, se agrega `export const viewport`.

**Out of scope (para otra spec):**

- Gestos sobre el canvas (swipe en snake, drag del paddle en arkanoid).
- Vibración háptica, sonido, giroscopio, gamepad Bluetooth.
- Controles configurables o reposicionables por el usuario.
- Toggle manual para mostrar/ocultar controles (se decide solo por `pointer: coarse`).
- Modo pantalla completa / bloqueo de orientación (Fullscreen API, `screen.orientation.lock`).
- PWA / instalación en pantalla de inicio.
- Adaptar el resto del sitio (`/`, `/inicio`, `/salon`, `/about`) al móvil más allá de lo que ya exista.
- Tablets con teclado y mouse (`pointer: fine`): no muestran controles táctiles.
- Cambios en motores (`*-engine.ts`) o en los `*Canvas.tsx`.

---

## Data model

Sin tablas ni cambios en Supabase. Solo tipos nuevos en TS:

```ts
// components/player/TouchControls.tsx
export type TouchButtonMode = "hold" | "tap" | "repeat";

export type TouchButton = {
  code: string; // KeyboardEvent.code, ej. "ArrowLeft", "Space"
  label: string; // "◀", "▶", "▲", "DISPARO"…
  mode: TouchButtonMode;
  area: "left" | "right"; // lado en landscape; orden en portrait
  wide?: boolean; // arkanoid: botón ancho
};

// components/games/registry.ts
type GameRegistryEntry = {
  // ...campos existentes
  touch?: TouchButton[];
};
```

Convenciones:

- Los eventos sintéticos usan los mismos `code` que ya leen los wrappers (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Space`).
- `repeat`: delay 180 ms, intervalo 60 ms (constantes en `TouchControls.tsx`).

---

## Implementation plan

1. `components/player/TouchControls.tsx` — tipos + componente con `hold`/`tap`/`repeat`, `setPointerCapture`, cleanup de timers, `keyup` de teclas activas al desmontar o al pasar `disabled=true`. Renderiza `null` si `buttons` está vacío. Sin montarlo aún: el sitio sigue igual.
2. `app/globals.css` — estilos `.touch-controls` / `.touch-btn` (oculto por defecto, visible con `@media (pointer: coarse)`), tamaños táctiles y `touch-action: none`.
3. `components/games/registry.ts` — agregar campo opcional `touch` y definir el layout de `snake` (el más simple). Montar `<TouchControls>` en `GamePlayerClient.tsx` con `disabled={paused || over}`. Prueba: emulación táctil en `/jugar/snake`, el D-pad mueve la serpiente; desktop sin cambios.
4. `registry.ts` — layouts de `arkanoid` (◀▶ hold), `tetris` (repeat + tap) y `rocas` (hold + tap). Prueba manual de cada uno con emulación táctil.
5. `app/globals.css` — layout responsive portrait del player (HUD, `.crt`, `.crt-bottom`, `.modal`, input a 16px).
6. `app/globals.css` — layout landscape con controles flotando a los lados, `100dvh`, `overscroll-behavior`.
7. Verificar `app/layout.tsx` (viewport) y ajustar solo si falta.
8. Verificación completa con Playwright MCP (contexto móvil con `hasTouch: true`, viewports 390×844 y 844×390, screenshots en `.playwright-screenshots/`), prueba en celular real vía `192.168.100.6`, `npm run build` y `npm run lint`.

---

## Acceptance criteria

- [ ] En un dispositivo con `pointer: coarse`, `/jugar/rocas`, `/jugar/tetris`, `/jugar/arkanoid` y `/jugar/snake` muestran botones táctiles y el juego responde a ellos.
- [ ] En desktop (`pointer: fine`) no se ve ningún botón táctil y el teclado funciona igual que antes.
- [ ] Rocas: ◀/▶ rotan la nave mientras se mantienen, ▲ empuja mientras se mantiene, DISPARO dispara un tiro por toque; se puede mantener ◀ y tocar DISPARO simultáneamente.
- [ ] Tetris: ◀/▶/▼ mueven la pieza, mantener presionado repite el movimiento tras ~180 ms; ROTAR rota una vez por toque; CAÍDA hace hard drop.
- [ ] Arkanoid: mantener ◀/▶ mueve la pala de forma continua; al soltar se detiene.
- [ ] Snake: los 4 botones cambian la dirección; una reversa de 180° se ignora como con teclado.
- [ ] Al presionar PAUSA los botones dejan de actuar y ninguna tecla queda "pegada" al reanudar (p. ej. la pala no sigue moviéndose sola).
- [ ] Al abrirse el modal de fin de partida los botones táctiles dejan de actuar.
- [ ] Tocar los botones no hace scroll, zoom ni selección de texto, y no aparece menú contextual por mantener presionado.
- [ ] En 390×844 (portrait) no hay scroll horizontal; HUD, canvas 4:3 completo, controles y botones PAUSA/FIN/SALIR/SKIN son visibles y tocables sin superponerse.
- [ ] En 844×390 (landscape) el canvas completo y los controles caben sin scroll vertical para jugar; los controles quedan a los lados del canvas.
- [ ] El input de iniciales del modal tiene `font-size ≥ 16px` en móvil y el modal cabe en 390px de ancho.
- [ ] Cada botón táctil mide al menos 64×64 px (60×60 mínimo en landscape).
- [ ] Los archivos `*-engine.ts` y `*Canvas.tsx` de los 4 juegos no tienen cambios en el diff.
- [ ] `/jugar/<id>` de un juego sin entrada en `GAME_REGISTRY` (placeholder) no muestra controles ni rompe.
- [ ] `npm run build` y `npm run lint` pasan sin errores.

---

## Decisions

- **Sí:** overlay de botones que despacha `KeyboardEvent` sintéticos en `window`. Razón: cero cambios en motores/wrappers, un solo componente reutilizable y desktop intacto.
- **No:** gestos (swipe/drag) como esquema principal. Razón: imprecisos para rocas (empuje + rotación + disparo simultáneos) y tetris; elegido overlay por juego junto al usuario.
- **Sí:** mostrar controles solo con `@media (pointer: coarse)`. Razón: se decide en CSS, sin JS de detección ni hidratación distinta; no ensucia desktop.
- **No:** toggle manual ni "siempre visible". Razón: elegido por el usuario; un celular siempre es `coarse`, desktop nunca lo necesita.
- **Sí:** modo `repeat` propio para tetris. Razón: el teclado real repite `keydown` al mantener; sin repetición habría que tocar 10 veces para cruzar el tablero.
- **Sí:** al pausar/terminar se emite `keyup` de las teclas activas. Razón: sin eso, un `hold` en curso deja la tecla marcada en `keys{}` de arkanoid/rocas.
- **Sí:** cubrir portrait y landscape. Razón: pedido por el usuario; portrait es la postura natural en celular, landscape da más tamaño al canvas.
- **Sí:** los 4 juegos en una sola spec. Razón: comparten 100 % del mecanismo; solo cambia la tabla de layouts.
- **No:** Fullscreen API / bloqueo de orientación. Razón: soporte irregular (iOS Safari), otra spec si hace falta.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| iOS Safari ignora `touch-action: none` en algunos casos y hace scroll/zoom al tocar botones | `preventDefault()` en `pointerdown`, `touch-action: none` en botones y arena, `overscroll-behavior: contain`, y prueba en dispositivo real. |
| Los wrappers ignoran eventos con `pausedRef` durante pausa pero los `keys{}` de rocas/arkanoid siguen marcados | `TouchControls` emite `keyup` de teclas activas al recibir `disabled=true` y al desmontar. |
| Los `KeyboardEvent` sintéticos no llevan `repeat`, y rocas usa `!keys[e.code]` para `justPressed` | El modo `tap` emite `keydown` + `keyup` seguidos, por lo que cada toque cuenta como "recién presionado". |
| El botón roba foco y el `<input>` del modal o los selects se comportan raro | `preventDefault` en `pointerdown`, botones con `tabIndex={-1}` y `type="button"`. |
| Barra de direcciones móvil cambia `100vh` y el layout landscape se corta | Uso de `100dvh` con fallback `100vh`. |
| Canvas 4:3 en portrait queda pequeño (~360×270 px) | Se acepta; el canvas ya escala por CSS y se maximiza el ancho reduciendo padding del `.crt`. Rotar a landscape da el tamaño mayor. |
| El servidor dev bloquea HMR desde la IP LAN | `allowedDevOrigins` ya agregado en `next.config.ts` (IP `192.168.100.6`); si la IP cambia, actualizar. |

---

## What is **not** in this spec

- Gestos swipe/drag sobre el canvas.
- Vibración, sonido, giroscopio, gamepad.
- Controles configurables o toggle manual.
- Fullscreen API / bloqueo de orientación / PWA.
- Rediseño móvil de `/`, `/inicio`, `/salon`, `/about`.
- Cambios en motores o wrappers de canvas.

Cada uno de estos, si se necesita, va en su propia spec.
