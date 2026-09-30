# SPEC GJ-eco-03 — Niveles y pulido (ECO)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, GJ-eco-01, GJ-eco-02
> **Date:** 2026-09-30
> **Objective:** Reemplazar los parámetros fijos de `levelParams` por una tabla de progresión de 12 rondas, dibujar el feedback visual (partículas, flashes, shake, estelas) dentro del motor y cerrar el balance de puntaje.

---

## Scope

**In:**

- `components/games/eco-engine.ts`: `levelParams(level)` pasa a leer la constante `LEVELS` (índice `level - 1`):

  | Ronda | Ecos activos | `echoSpeed` | `orbLife` (s) | `PHASE_GRACE` (s) |
  | --- | --- | --- | --- | --- |
  | 1 | 0 | 1.00 | 6.0 | 1.0 |
  | 2 | 1 | 1.00 | 6.0 | 1.0 |
  | 3 | 2 | 1.00 | 5.5 | 1.0 |
  | 4 | 3 | 1.00 | 5.5 | 1.0 |
  | 5 | 4 | 1.05 | 5.0 | 0.9 |
  | 6 | 5 | 1.05 | 5.0 | 0.9 |
  | 7 | 5 | 1.10 | 4.5 | 0.8 |
  | 8 | 5 | 1.10 | 4.5 | 0.8 |
  | 9 | 5 | 1.15 | 4.0 | 0.7 |
  | 10 | 5 | 1.15 | 4.0 | 0.7 |
  | 11 | 5 | 1.20 | 3.5 | 0.6 |
  | 12 | 5 | 1.20 | 3.5 | 0.6 |

  `levelParams` devuelve `{ echoSpeed, orbLife, grace }`; `update` usa `grace` en lugar de la constante `PHASE_GRACE` (que queda como valor de la ronda 1). Los ecos activos resultan de `min(level - 1, MAX_ECHOES)` (ya garantizado por `endRound`).
- **Partículas** (`Particle[]` de `GameState`, todas generadas con `rand(gs)`, sin `Math.random`): `spawnBurst(gs, x, y, color, n)` con velocidad 60–180 px/s, vida 0.4–0.8 s. Se llama en: recoger orbe (`n = 12`, `#f5ff00`), golpe de eco (`n = 24`, `#ff006e`), fin de ronda (`n = 30` en el jugador, `#00f5ff`). `updateParticles(gs, dt)` mueve, resta vida y filtra `life <= 0` (tope 200 partículas). `draw` las pinta como cuadrados de 3 px con alpha `life/maxLife`.
- **Flash y shake:** `flash` (0–1) se pone en `0.6` al ser golpeado y en `0.3` al cerrar ronda, decae `× (1 - 4*dt)`; `draw` pinta un rect `rgba(255,0,110, flash*0.5)` sobre toda la arena. `shake` se pone en `8` px al ser golpeado, decae a `shake -= 30*dt`; `draw` aplica `ctx.translate` con offset aleatorio (vía `gs.rng`) ±`shake` dentro de `ctx.save()/restore()`.
- **Estela del jugador:** buffer de las últimas 10 posiciones (derivadas de `rec`, sin estado nuevo) dibujadas como círculos con alpha decreciente `#00f5ff`.
- **Anuncios en canvas:** en `intermission` texto `RONDA n` y, si la ronda previa no tuvo golpes, `¡RONDA PERFECTA +200!` en `#f5ff00`; al pasar la ronda 12 texto `¡SOBREVIVISTE A TU ECO!` (estado `win`).
- **Balance de puntaje** (confirmado, sin cambios de fórmula respecto a 01): orbe `100 + bonus rapidez (0–50)` × racha `1 + 0.25·min(streak,8)`; fin de ronda `50·nivel` (+200 perfecta). Rango esperado por partida completa: 8 000–14 000; `best` seed 9800 queda dentro del rango.
- Sin assets en `public/games/eco/`: todo se dibuja con primitivas canvas.

**Out of scope (para otra spec):**

- Skins, controles táctiles, sonido, mouse, gamepad.
- Modos alternativos (ecos que también recogen orbes, modo infinito).
- Persistir ronda alcanzada; `best`/`plays` reales; RLS.

---

## Data model

```ts
type LevelParams = { echoSpeed: number; orbLife: number; grace: number };
const LEVELS: LevelParams[] = [
  { echoSpeed: 1.0, orbLife: 6.0, grace: 1.0 },
  { echoSpeed: 1.0, orbLife: 6.0, grace: 1.0 },
  { echoSpeed: 1.0, orbLife: 5.5, grace: 1.0 },
  { echoSpeed: 1.0, orbLife: 5.5, grace: 1.0 },
  { echoSpeed: 1.05, orbLife: 5.0, grace: 0.9 },
  { echoSpeed: 1.05, orbLife: 5.0, grace: 0.9 },
  { echoSpeed: 1.1, orbLife: 4.5, grace: 0.8 },
  { echoSpeed: 1.1, orbLife: 4.5, grace: 0.8 },
  { echoSpeed: 1.15, orbLife: 4.0, grace: 0.7 },
  { echoSpeed: 1.15, orbLife: 4.0, grace: 0.7 },
  { echoSpeed: 1.2, orbLife: 3.5, grace: 0.6 },
  { echoSpeed: 1.2, orbLife: 3.5, grace: 0.6 },
];
```

`Particle`, `shake` y `flash` ya existen en `GameState` (GJ-eco-01); aquí solo se pueblan. Sin cambios de DB.

---

## Implementation plan

1. `eco-engine.ts`: agregar `LEVELS` y reescribir `levelParams(level)` para devolver `LEVELS[min(level, 12) - 1]`; cambiar `update` para usar `grace` y `echoSpeed` de `levelParams(gs.level)`. Verificación: en ronda 5 los ecos avanzan 5 % más rápido que su grabación.
2. Agregar `spawnBurst`, `updateParticles` y sus llamadas en `collectOrb`, `hitPlayer` y `endRound`.
3. Agregar `flash`/`shake` en `hitPlayer`/`endRound`, decaimiento en `update` y render en `draw` (`save/translate/restore`).
4. Agregar estela del jugador y textos de intermission/win en `draw`.
5. Playtest de 3 partidas: verificar que la ronda 6+ es exigente pero posible, y que ninguna ronda deja el orbe inalcanzable.
6. `npm run build` y `npm run lint`.

---

## Acceptance criteria

- [ ] HUD (Jugador/Puntuación/Vidas/Nivel) sigue reflejando valores reales en vivo tras los cambios.
- [ ] PAUSA/REANUDAR sin saltos: partículas, shake y flash también se congelan (se actualizan solo dentro de `update`).
- [ ] FIN y game over por reglas propias abren el modal con el score real; JUGAR DE NUEVO remonta canvas (`key={runId}`).
- [ ] Los parámetros por ronda coinciden con la tabla (`echoSpeed`, `orbLife`, gracia) y no cambian dentro de una misma ronda.
- [ ] Recoger orbe, ser golpeado y cerrar ronda generan partículas visibles; el golpe produce flash magenta y shake ≤ 8 px que se apaga en < 0.5 s.
- [ ] No hay más de 200 partículas simultáneas y no hay fugas de memoria (arrays acotados).
- [ ] Ronda perfecta (sin golpes) suma +200 y muestra el anuncio; ronda con golpe no.
- [ ] Una partida completa (12 rondas) suma entre 8 000 y 14 000 puntos con juego competente.
- [ ] `rocas`, `tetris`, `arkanoid`, `snake` y ids sin registry siguen igual.
- [ ] `npm run build` y `npm run lint` pasan sin errores.

---

## Decisions

- **Sí:** dificultad por velocidad de reproducción de los ecos (hasta ×1.2), vida de orbe decreciente y gracia decreciente; 5 ecos como techo desde la ronda 6. Razón: la dificultad crece sin agregar entidades nuevas y sin arena imposible. — decidido por game-jam — revisar.
- **Sí:** todos los efectos viven en el motor y usan `gs.rng`. Razón: motor puro y determinista, sin `Math.random`/DOM. — decidido por game-jam — revisar.
- **Sí:** sin assets en `public/games/eco/`. Razón: primitivas canvas suficientes.
- **No:** ecos que recogen orbes ni modo infinito. Razón: fuera del alcance de una jam corta; podría ser otra spec.
- **No:** sonido, skins, táctil. Razón: heredado / posterior.
- **Heredado:** sin pausa propia (`P`/`Esc`; la controla `paused`), `best`/`plays` fijos, `saveScoreAction` solo `gameId`/`name`/`score`, HUD React de 4 campos, sin `document`/`window`/`localStorage` en el motor.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Rondas 9–12 demasiado difíciles (5 ecos ×1.15–1.2) | Playtest del paso 5; si es imposible, bajar `echoSpeed` máx. a 1.1 (solo cambia `LEVELS`). |
| Shake/flash molestos o inaccesibles | Duración < 0.5 s, amplitud ≤ 8 px, alpha ≤ 0.3 del flash. |
| Muchas partículas degradan rendimiento | Tope de 200 y `fillRect` de 3 px. |
| Ecos acelerados terminan antes y se quedan quietos como obstáculos | Aceptado: comportamiento documentado (`echoPos` devuelve la última muestra). |
| Rango de score fuera de 8 000–14 000 | Ajustar solo constantes de puntaje en el motor tras playtest. |

---

## What is **not** in this spec

- Skins, controles táctiles, sonido, mouse, gamepad.
- Modos alternativos o infinito.
- Assets bitmap.
- Persistir ronda alcanzada; `best`/`plays` reales; RLS.
