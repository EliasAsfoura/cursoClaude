# SPEC 01 — MVP jugable de Arkanoid

> **Status:** Draft
> **Depends on:** ninguno
> **Date:** 2026-09-15
> **Objective:** Construir un MVP jugable de Arkanoid con paddle, bola, bloques, 3 niveles, un power-up básico, puntaje, sonido y high score persistente.

---

## Scope

**In:**

- Canvas HTML5 de 800x600px, centrado en pantalla.
- Paddle controlado por teclado (flechas izquierda/derecha y A/D).
- Bola con rebote en paredes y paddle, velocidad constante dentro de un nivel.
- 3 niveles con grid de bloques fijo y distinto cada uno (usando `drawSprite` con `block_<color>`).
- Al romper un bloque: animación de explosión (`EXPLOSION_FRAMES`, 4 frames, 150ms c/u) y +10 puntos.
- Al pasar de nivel, velocidad de la bola aumenta 15% respecto al nivel anterior.
- Sistema de 3 vidas. Bola cae por debajo del paddle → pierde 1 vida, reset de posición de bola/paddle. 0 vidas → pantalla "Game Over".
- Al limpiar el nivel 3 → pantalla "Ganaste".
- Power-up "paddle ancho": 20% de probabilidad de caer al romper un bloque. Si el paddle lo agarra, se ensancha 50% por 10 segundos y luego vuelve a su tamaño normal.
- Sonido: `assets/sounds/ball-bounce.mp3` en rebote de bola (pared/paddle), `assets/sounds/break-sound.mp3` al romper bloque.
- Puntaje visible en pantalla durante la partida.
- High score guardado en `localStorage`, mostrado en pantalla junto al puntaje actual.
- Pantallas de Game Over y Victoria muestran puntaje final y mensaje "Presiona espacio para reiniciar". Al presionar espacio, reinicia desde nivel 1 con puntaje y vidas en cero/inicial.

**Out of scope (for future specs):**

- Power-ups adicionales (bola extra, vida extra, multi-ball, etc.).
- Niveles generados dinámicamente o editor de niveles.
- Control por mouse.
- Pausa del juego.
- Animaciones o efectos visuales más allá de la explosión de bloques.
- Modo multijugador.
- Ranking de high scores con múltiples entradas (solo se guarda el mejor puntaje).

---

## Data model

```js
// Estado del juego, vive en memoria durante la partida
const state = {
  level: 1, // 1, 2 o 3
  score: 0,
  lives: 3,
  highScore: 0, // cargado de localStorage al iniciar
  screen: "playing", // "playing" | "gameover" | "victory"
  ball: { x, y, dx, dy, speed }, // speed base = 4px/frame, x1.15 por nivel
  paddle: { x, y, width, height, widened: false, widenedUntil: 0 },
  blocks: [/* { x, y, color, alive } por celda del grid del nivel actual */],
  powerUps: [/* { x, y, dy } power-ups cayendo actualmente */],
};

// Definición de niveles: grid fijo de colores por nivel
// LEVELS[n] = matriz de filas x columnas, cada celda color o null (sin bloque)
const LEVELS = [
  /* nivel 1 */ [["gray","gray","red", /* ... */]],
  /* nivel 2 */ [[/* ... */]],
  /* nivel 3 */ [[/* ... */]],
];
```

Convenciones:

- Coordenadas: origen arriba-izquierda, igual que canvas.
- Velocidades en píxeles/frame.
- `localStorage` key: `arkanoid:highscore` (número plano, sin versión — dato trivial de un solo campo).
- Puntos por bloque: fijo 10, sin importar color.

---

## Implementation plan

1. Crear `index.html` con `<canvas id="game" width="800" height="600">`, carga `assets/spritesheet.js` y `game.js`. `style.css` centra el canvas en la página con fondo oscuro.
2. En `game.js`: setup de contexto 2D, game loop con `requestAnimationFrame`, dibuja paddle y bola estáticos con `drawSprite` (llamar `loadSpritesheet` antes). Sistema corre y muestra imagen fija.
3. Movimiento de paddle con flechas/A-D, clamp a los bordes del canvas.
4. Movimiento de bola con rebote en paredes (izquierda/derecha/arriba) y en el paddle (ángulo según punto de impacto). Bola arranca desde el centro del paddle al iniciar partida.
5. Definir grid de bloques del nivel 1 en `LEVELS[0]`, dibujar bloques vivos con `drawSprite('block_<color>', ...)`.
6. Colisión bola-bloque: al impactar, marca bloque como no-vivo, reproduce animación de explosión con `drawFrame`/`EXPLOSION_FRAMES`, suma 10 puntos, rebota la bola.
7. Sistema de vidas: bola por debajo del paddle → resta vida, resetea posición de bola/paddle. 0 vidas → `state.screen = "gameover"`.
8. Progresión de nivel: al no quedar bloques vivos, carga `LEVELS[1]` (o `[2]`), incrementa `ball.speed` en 15%, resetea posición de bola/paddle. Al limpiar nivel 3 → `state.screen = "victory"`.
9. Power-up: al romper un bloque, 20% probabilidad de crear entrada en `state.powerUps` que cae verticalmente. Si el paddle lo toca: `paddle.width *= 1.5`, `paddle.widenedUntil = now + 10000`. Revertir ancho cuando `now > widenedUntil`.
10. Sonido: reproducir `ball-bounce.mp3` en cada rebote de bola (pared/paddle), `break-sound.mp3` al romper bloque.
11. Puntaje y high score: mostrar `score` y `highScore` en pantalla (texto sobre canvas o HTML superpuesto). Cargar `highScore` de `localStorage` al iniciar; al llegar a `gameover` o `victory`, si `score > highScore`, actualizar y guardar en `localStorage`.
12. Pantallas de Game Over/Victoria: overlay con puntaje final y texto "Presiona espacio para reiniciar". Tecla espacio en esos estados reinicia `state` completo a nivel 1.

---

## Acceptance criteria

- [ ] El juego carga en el navegador sin errores en consola al abrir `index.html`.
- [ ] Las flechas izquierda/derecha (y A/D) mueven el paddle sin salirse del canvas.
- [ ] La bola rebota correctamente en paredes y paddle, nunca atraviesa bordes.
- [ ] Romper un bloque suma exactamente 10 puntos y reproduce la animación de explosión.
- [ ] Perder las 3 vidas muestra la pantalla "Game Over" con el puntaje final.
- [ ] Limpiar los 3 niveles en orden muestra la pantalla "Ganaste".
- [ ] La velocidad de la bola aumenta al pasar de nivel 1→2 y 2→3.
- [ ] Al menos un power-up de "paddle ancho" cae en cada partida jugada hasta el final (probabilidad no bloqueante en runs largos).
- [ ] Agarrar el power-up ensancha el paddle 50% y el efecto desaparece a los 10 segundos.
- [ ] Se escucha `ball-bounce.mp3` en cada rebote y `break-sound.mp3` en cada bloque roto.
- [ ] El high score persiste tras recargar la página (`localStorage`).
- [ ] Presionar espacio en pantalla de Game Over o Victoria reinicia el juego desde nivel 1.

---

## Decisions

- **Yes:** canvas 800x600px, sin responsive. Simplicidad para MVP, tamaño típico de Arkanoid clásico.
- **Yes:** 3 niveles fijos hardcodeados en `LEVELS`. Cubre "progresión" sin necesitar generador.
- **Yes:** un solo tipo de power-up (paddle ancho), 20% drop, 10s duración. Acota alcance, evita overengineering en primer MVP.
- **Yes:** puntos fijos (10) por bloque sin importar color. Evita tabla de valores innecesaria en MVP.
- **Yes:** `localStorage` con key plana `arkanoid:highscore`, sin versión de schema. Dato de un solo número, no justifica migración.
- **Yes:** velocidad de bola sube solo al cambiar de nivel (no por rebote), 15% por nivel. Más simple de razonar y testear que un incremento continuo.
- **No:** control por mouse. Se descarta para mantener input simple en MVP.
- **No:** pausa. No se pidió y agrega estado extra sin valor claro en MVP.
- **No:** power-ups adicionales o multi-ball. Cada uno amerita su propio spec si se decide agregar.

---

## What is **not** in this spec

- Power-ups adicionales más allá de "paddle ancho".
- Niveles dinámicos, aleatorios o editor de niveles.
- Control por mouse.
- Pausa del juego.
- Ranking de múltiples high scores.
- Modo multijugador o versión mobile.

Cada uno de estos, si se decide implementar, va en su propio spec.
