# SPEC 02 — Mejora de animación de destrucción de bloques

> **Status:** Approved
> **Depends on:** SPEC 01
> **Date:** 2026-09-15
> **Objective:** Reforzar el feedback visual al romper un bloque con explosión más rápida, screen shake y partículas dispersas, reusando los sprites de `EXPLOSION_FRAMES` ya existentes.

---

## Scope

**In:**

- Reducir `EXPLOSION_DURATION` de 150ms a 100ms por frame (4 frames, sprite animation existente `EXPLOSION_FRAMES`, sin cambios de assets).
- Screen shake al romper cada bloque: desplaza todo el canvas (incluye HUD dibujado con `ctx.fillText`), magnitud 8px, duración 250ms, decae linealmente a 0.
- Partículas circulares al romper cada bloque: 6 partículas por bloque, color del bloque roto, se dispersan en direcciones aleatorias sin gravedad, duran 300ms, fade out (alpha decrece a 0).
- Shake y partículas se disparan en el mismo evento que ya crea la entrada en `state.explosions` (colisión bola-bloque).

**Out of scope (for future specs):**

- Cambiar los sprites de `EXPLOSION_FRAMES` o el spritesheet.
- Shake o partículas en otros eventos (game over, victoria, pérdida de vida, power-up).
- Configuración de intensidad de shake/partículas por usuario (opciones de accesibilidad).
- Sonido nuevo asociado a esta mejora (se mantiene `break-sound.mp3` existente sin cambios).

---

## Data model

```js
// Nuevo: partículas de destrucción de bloque, vida en memoria durante la partida
state.particles = [
  /* { x, y, dx, dy, color, start } por partícula activa */
];

// Nuevo: estado de screen shake
state.shake = {
  start: 0,        // performance.now() al disparar, 0 = inactivo
  magnitude: 8,     // px, decae linealmente a 0 sobre SHAKE_DURATION
};
```

Convenciones:

- `SHAKE_DURATION = 250` (ms), `SHAKE_MAGNITUDE = 8` (px).
- `PARTICLE_DURATION = 300` (ms), `PARTICLE_COUNT = 6` por bloque roto.
- `EXPLOSION_DURATION` cambia de `150` a `100` (constante ya existente en `game.js`).
- Partículas y shake se limpian del estado (`splice`/reset) cuando su duración expira, igual que ya se hace con `state.explosions`.

---

## Implementation plan

1. Cambiar `EXPLOSION_DURATION` de 150 a 100 en `game.js`. Sistema sigue funcional, explosión ya se ve más rápida.
2. Agregar constantes `SHAKE_DURATION`, `SHAKE_MAGNITUDE`, `PARTICLE_DURATION`, `PARTICLE_COUNT` y arrays `state.particles` + `state.shake` al estado inicial.
3. En el punto donde se marca `block.alive = false` y se hace `push` a `state.explosions` (game.js:275-278), disparar shake (`state.shake.start = performance.now()`) y generar 6 partículas con dirección aleatoria y color del bloque.
4. En el loop de render, antes de dibujar el juego, calcular offset de shake activo (según tiempo transcurrido desde `state.shake.start`, decae linealmente) y aplicar `ctx.translate(offsetX, offsetY)`; revertir con `ctx.translate` inverso o `ctx.save()/ctx.restore()` al final del frame.
5. En el loop de render, dibujar y actualizar partículas activas (posición += velocidad, alpha según tiempo transcurrido / `PARTICLE_DURATION`), remover las que superaron su duración.

---

## Acceptance criteria

- [ ] Romper un bloque muestra la animación de explosión existente completada en 400ms (4 frames x 100ms).
- [ ] Romper un bloque sacude el canvas completo (incluye texto de puntaje) por 250ms con magnitud visible que decae hasta detenerse.
- [ ] Romper un bloque genera 6 partículas circulares del color del bloque que se dispersan y desaparecen (fade out) en 300ms.
- [ ] El resto de la jugabilidad (colisiones, puntaje, power-ups, niveles) sigue funcionando igual que en SPEC 01, sin errores en consola.
- [ ] Romper varios bloques en simultáneo (mismo frame) no rompe el shake ni las partículas (cada bloque agrega su propio shake/partículas independientemente).

---

## Decisions

- **Yes:** reusar `EXPLOSION_FRAMES` del spritesheet existente, solo ajustar timing. No se piden ni generan nuevos assets.
- **Yes:** shake afecta todo el canvas (`ctx.translate`), incluido el HUD, porque el HUD se dibuja con `ctx.fillText` sobre el mismo canvas, no hay overlay HTML separado.
- **Yes:** partículas sin gravedad, solo dispersión radial simple. Evita simular física adicional para un efecto puramente cosmético.
- **Yes:** shake se dispara en cada bloque roto (mismo trigger que la explosión), consistencia con el resto del feedback visual.
- **No:** sonido nuevo. `break-sound.mp3` ya cubre el feedback auditivo, no se pidió cambiarlo.
- **No:** accesibilidad/configuración de intensidad. Fuera de alcance del ajuste visual pedido.

---

## What is **not** in this spec

- Cambios a los sprites o al spritesheet.
- Shake o partículas en eventos distintos a romper bloque.
- Opciones de accesibilidad para reducir motion/shake.
- Sonido nuevo.

Cada uno de estos, si se decide implementar, va en su propio spec.
