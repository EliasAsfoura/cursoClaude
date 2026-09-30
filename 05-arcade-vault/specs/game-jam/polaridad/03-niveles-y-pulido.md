# SPEC GJ-polaridad-03 — Niveles y pulido (POLARIDAD)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, GJ-polaridad-01, GJ-polaridad-02
> **Date:** 2026-09-30
> **Objective:** Reemplazar la progresión lineal de `levelParams` por una tabla de 10 niveles con patrones nuevos, dibujar el feedback visual (partículas, flashes, shake, estela, banners) dentro del motor y cerrar el balance de puntaje.

---

## Scope

**In:**

- `components/games/polaridad-engine.ts`: `levelParams(level)` pasa a leer la constante `LEVELS` (índice `level - 1`) y devuelve `{ speed, gapJitter, weights }`:

  | Nivel | `speed` (px/s) | `gapJitter` (px) | Pesos `[picos-piso, picos-techo, pilar, zigzag, escalera, tunel]` | Prob. núcleo por chunk |
  | --- | --- | --- | --- | --- |
  | 1 | 300 | 245 | [3, 3, 2, 0, 0, 0] | 0.50 |
  | 2 | 325 | 230 | [3, 3, 2, 1, 0, 0] | 0.50 |
  | 3 | 350 | 215 | [2, 2, 2, 2, 0, 0] | 0.50 |
  | 4 | 375 | 200 | [2, 2, 2, 2, 1, 0] | 0.45 |
  | 5 | 400 | 185 | [2, 2, 1, 3, 2, 0] | 0.45 |
  | 6 | 425 | 170 | [1, 1, 1, 3, 2, 1] | 0.40 |
  | 7 | 450 | 155 | [1, 1, 1, 3, 3, 1] | 0.40 |
  | 8 | 475 | 140 | [1, 1, 1, 3, 3, 2] | 0.35 |
  | 9 | 500 | 125 | [0, 0, 1, 3, 3, 3] | 0.35 |
  | 10 | 525 | 110 | [0, 0, 1, 3, 3, 4] | 0.30 |

  `speed` coincide con la fórmula de 01 (`300 + 25·(nivel-1)`); `gapJitter` reemplaza a `260 - 15·nivel` (mismos valores redondeados: nivel 1 → 245 … nivel 10 → 110). El hueco tras cada chunk sigue siendo `used + speed·0.7 + 120 + rand·gapJitter`. La elección de patrón es una ruleta ponderada con `rand(gs)`.
- **Patrones nuevos** en `spawnChunk` (los 4 de 01 se conservan):
  - `escalera`: 3 pilares de altura 60/90/120 (`PILLAR_W = 40`, separados 60 px) en el mismo lado; se esquiva cambiando de lado antes del primero.
  - `tunel`: un pilar de 120 px en el piso y otro en el techo con desfase en X de `speed·FLIP_TIME + 80` px (hay que cruzar entre ambos); garantiza que existe una ventana de cruce completa. Solo con nivel ≥ 6 (pesos 0 antes).
  - Con probabilidad `coreProb` el chunk agrega 1–3 núcleos: en el centro del pasillo (`y = 300`) sobre el chunk, o pegados a la superficie opuesta del obstáculo (`y = FLOOR_Y - 20` o `CEIL_Y + 20`) como recompensa por el lado seguro.
- **Partículas** (`Particle[]` de `GameState`, todas generadas con `rand(gs)`, sin `Math.random`): `spawnBurst(gs, x, y, color, n)` con velocidad 60–200 px/s, vida 0.3–0.7 s. Se llama en: cada inversión de gravedad (`n = 6`, `#f5ff00`, en la cara del cubo hacia la que cae), aterrizaje (`n = 8` al llegar a `restY`), recoger núcleo (`n = 12`, `#00f5ff`), golpe (`n = 24`, `#ff006e`), subir de nivel (`n = 30`, `#f5ff00`). `updateParticles(gs, dt)` mueve, resta vida y filtra `life <= 0` (tope 200 partículas). `draw` las pinta como cuadrados de 3 px con alpha `life/maxLife`.
- **Flash y shake:** `flash` (0–1) se pone en `0.6` al ser golpeado y en `0.3` al subir de nivel, decae `× (1 - 4*dt)`; `draw` pinta un rect `rgba(255,0,110, flash*0.5)` sobre toda la pantalla. `shake` se pone en `8` px al ser golpeado y en `3` al aterrizar tras una caída completa, decae `shake -= 30*dt`; `draw` aplica `ctx.translate` con offset aleatorio (vía `gs.rng`) ±`shake` dentro de `ctx.save()/restore()`.
- **Estela del cubo:** buffer de las últimas 8 posiciones `y` (uno por frame, tope fijo en el estado) dibujadas como cuadrados desplazados hacia la derecha a `x = PLAYER_X + i*10` con alpha decreciente `#f5ff00`; solo se muestra en tránsito (`vy !== 0`).
- **Fondo con parallax:** 40 estrellas (posiciones fijas generadas con `rand(gs)` en `initGame`) a velocidad `speed * 0.15`; líneas de velocidad horizontales `rgba(245,255,0,0.15)` cuya longitud crece con `speed`.
- **Anuncios en canvas:** al subir de nivel, banner `NIVEL n` centrado durante 1.2 s (alpha decreciente) en `#f5ff00`; con combo 5 texto `¡COMBO x5!` sobre el cubo durante 0.5 s.
- **Balance de puntaje** (sin cambios de fórmula respecto a 01): distancia 1 pt cada 10 px + núcleos `50 × combo` (combo 1–5). A ~410 px/s medios → ~41 pts/s por distancia; ~60 % de los chunks con núcleo → ~10–15 pts/s extra. Una partida de 2 min con 1–2 golpes rinde ≈ 5 000–9 000 pts; `best` seed 7400 queda dentro del rango.
- Sin assets en `public/games/polaridad/`: todo se dibuja con primitivas canvas.

**Out of scope (para otra spec):**

- Skins (`clasico`/`neon`/`retro`), controles táctiles, sonido, mouse, gamepad.
- Modo infinito con dificultad más allá del nivel 10 (se mantiene nivel 10).
- Persistir nivel alcanzado en el score guardado; recalcular `best`/`plays`.

---

## Data model

Sin tablas nuevas. Cambios de tipos en el motor (no se exportan al resto de la app):

```ts
type LevelParams = {
  speed: number;
  gapJitter: number;
  weights: [number, number, number, number, number, number]; // picos-piso, picos-techo, pilar, zigzag, escalera, tunel
  coreProb: number;
};
export const LEVELS: LevelParams[]; // 10 entradas, tabla de Scope
// GameState suma: trail: number[]; stars: { x: number; y: number }[]; banner: number; comboText: number;
```

`GameCanvasProps`/`GameCanvasHandle` y `registry.ts` no cambian.

---

## Implementation plan

1. `components/games/polaridad-engine.ts` — agregar `LEVELS`, reescribir `levelParams`, ampliar `spawnChunk` con `escalera`/`tunel` y núcleos por `coreProb`, y usar `gapJitter` en el cálculo de `nextSpawn`. Verificación: `npx tsc --noEmit`; con `initGame(1234)` y 10 000 chunks simulados, ningún hueco entre chunks es menor que `speed * FLIP_TIME` (revisión rápida con un script local no commiteado).
2. Mismo archivo: `spawnBurst`, `updateParticles`, `flash`, `shake`, estela, parallax, banners y sus llamadas en `flip`, aterrizaje, `collectCore`, `hitPlayer` y subida de nivel; `draw` con `save/translate/restore`.
3. Prueba manual: jugar hasta el nivel 6 (o forzar `dist = 15000` en una sesión de desarrollo) y comprobar `tunel`, `escalera`, banners y flashes.
4. Ajustar pesos/`gapJitter` solo si los niveles 1–3 no se pueden superar con 3 vidas en 3 intentos razonables (no se cambia el resto de la tabla).
5. `npm run build` y `npm run lint`.

---

## Acceptance criteria

- [ ] Los niveles 1–10 aplican `speed`, `gapJitter`, pesos y `coreProb` de la tabla (verificable leyendo `LEVELS` y viendo la velocidad subir cada 3000 px).
- [ ] `escalera` aparece desde el nivel 4 y `tunel` desde el nivel 6; nunca antes.
- [ ] Todo chunk deja una ventana de cruce completa (sin secuencias imposibles) en los 10 niveles.
- [ ] Invertir gravedad, aterrizar, recoger núcleo, recibir golpe y subir de nivel emiten partículas del color indicado; nunca hay más de 200 partículas vivas.
- [ ] El golpe produce flash magenta y shake de hasta 8 px que decaen solos en < 0,5 s; el shake no descentra el canvas de forma permanente.
- [ ] La estela solo se ve durante la caída; el parallax de estrellas y las líneas de velocidad acompañan la velocidad.
- [ ] Banner `NIVEL n` al subir de nivel y `¡COMBO x5!` al llegar a combo 5.
- [ ] El score de una partida de ~2 min con 1–2 golpes cae en 5 000–9 000 pts.
- [ ] PAUSA congela partículas, flash, shake, banners y parallax (no dependen de `Date.now()`; usan `dt` de `update`).
- [ ] Los comportamientos de 01 y 02 (HUD, FIN, game over por vidas, guardado de score, JUGAR DE NUEVO, no-regresión de otros juegos) siguen intactos.
- [ ] `npm run build` y `npm run lint` pasan sin errores.

---

## Decisions

- **Sí:** 10 niveles con pesos por patrón (ruleta ponderada) en lugar de una secuencia fija. Razón: partidas distintas cada vez con PRNG determinista y dificultad controlada por tabla. — decidido por game-jam — revisar.
- **Sí:** `tunel` solo desde nivel 6 y siempre con ventana de cruce garantizada `speed·FLIP_TIME + 80` px. Razón: es el patrón más exigente; se introduce tarde y nunca es injusto. — decidido por game-jam — revisar.
- **Sí:** nivel máximo 10 sin escalada posterior. Razón: se estabiliza la velocidad (525 px/s) y la partida termina por vidas. — decidido por game-jam — revisar.
- **Sí:** toda la animación (partículas, banners, parallax) avanza con `dt` de `update`, no con reloj. Razón: la pausa debe congelarlo todo sin lógica extra.
- **Sí:** partículas y aleatoriedad visual vía `rand(gs)`. Razón: sin `Math.random` el motor sigue determinista con `seed`.
- **No:** assets en `public/games/polaridad/`. Razón: primitivas canvas bastan.
- **No:** sonido, skins, táctil. Razón: heredado; se agregan luego con sus agentes.
- **Heredado (no re-decidir):** sin pausa propia (`P`/`Esc`; la controla `paused`), sin sonido, sin mouse/touch/gamepad, sin RLS, `best`/`plays` fijos, `saveScoreAction` solo guarda `gameId`/`name`/`score`, HUD React genérico de 4 campos, sin `document`/`window`/`localStorage` en el motor.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Niveles altos imposibles por combinación de velocidad y huecos | El hueco mínimo `used + speed·0.7 + 120` supera siempre `speed·FLIP_TIME`; `tunel` garantiza ventana explícita; verificación por simulación de 10 000 chunks. |
| Shake/flash agotan la vista | Amplitudes máximas 8 px / alpha 0.3 y decaimiento rápido. |
| Coste de dibujar 200 partículas + estrellas en equipos lentos | Cuadrados de 3 px sin `shadowBlur`; tope de 200; halos solo en piso/techo/núcleos. |
| `weights` con suma 0 por error de edición | La ruleta cae al primer patrón (`picos-piso`) si `total === 0`; la tabla actual suma ≥ 8 en todos los niveles. |
| Regresión de 01/02 al tocar `update`/`draw` | Criterio de no-regresión y repetición del recorrido manual de 02. |

---

## What is **not** in this spec

- Skins, controles táctiles, sonido, mouse, gamepad.
- Niveles por encima del 10 o modo infinito.
- Assets de imagen.
- Persistir nivel alcanzado en el score guardado; `best`/`plays` reales; RLS.

Cada uno de estos, si se necesita, va en su propia spec.
