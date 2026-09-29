# SPEC GJ-rana-03 — Niveles, bonus y pulido visual (Rana)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, GJ-rana-01, GJ-rana-02
> **Date:** 2026-09-28
> **Objective:** Reemplazar las fórmulas lineales de dificultad de GJ-rana-01 por una tabla de 8 niveles concreta (velocidad, tiempo por rana, tortugas buceadoras, tráfico extra), agregar los bonus clásicos de Frogger (mosca en charca, vida extra) y el feedback visual (partículas, shake, flashes, banner de nivel, popups de puntaje, squash de salto, timer en alerta), todo dibujado dentro de `rana-engine.ts`, sin assets y sin tocar el HUD React.

---

## Scope

**In:**

- `components/games/rana-engine.ts` (solo este archivo cambia; `RanaCanvas.tsx` y `registry.ts` no se tocan):
  - **Tabla `LEVELS`** (índice `level - 1`; para `level > 8` se usa la fila 8):

    | Nivel | `speedMult` | `timePerFrog` (s) | Buceadores fila 3 | Buceadores fila 5 | Autos extra fila 10 | Autos extra fila 12 |
    | --- | --- | --- | --- | --- | --- | --- |
    | 1 | 1.00 | 30 | 1 | 0 | 0 | 0 |
    | 2 | 1.12 | 28 | 1 | 1 | 0 | 0 |
    | 3 | 1.24 | 26 | 2 | 1 | 1 | 0 |
    | 4 | 1.36 | 24 | 2 | 2 | 1 | 0 |
    | 5 | 1.48 | 22 | 3 | 2 | 1 | 1 |
    | 6 | 1.60 | 20 | 3 | 3 | 2 | 1 |
    | 7 | 1.80 | 18 | 3 | 3 | 2 | 1 |
    | 8+ | 2.00 | 18 | 3 | 4 | 2 | 1 |

    ```ts
    interface LevelDef { speedMult: number; timePerFrog: number; divers3: number; divers5: number; extra10: number; extra12: number }
    export const LEVELS: LevelDef[] = [ /* 8 filas de la tabla */ ];
    export function levelDef(level: number): LevelDef { return LEVELS[Math.min(level, LEVELS.length) - 1]; }
    ```
    `timeForLevel(level)` pasa a devolver `levelDef(level).timePerFrog` y `speedForLevel(level)` pasa a devolver `levelDef(level).speedMult` (misma firma que en GJ-rana-01; las constantes `BASE_TIME_PER_FROG`, `MIN_TIME_PER_FROG`, `TIME_STEP_PER_LEVEL`, `SPEED_STEP`, `MAX_SPEED_MULT` se eliminan).
  - **`buildLanes(level): Lane[]`** (nueva, exportada): construye los carriles desde `LANE_DEFS` aplicando `count + extra10` en la fila 10 y `count + extra12` en la fila 12, y marcando `diver: true` en los primeros `divers3` objetos de la fila 3 y en los primeros `divers5` de la fila 5. Reparto de posiciones igual que en 01 (`i * SPAN / count`). `initGame` la usa con `level = 1`; al completar una ronda (`resolveHome` con 5 charcas llenas) se reconstruyen los carriles con `buildLanes(gs.level)` después de subir el nivel. Es seguro porque la rana respawnea en la vereda (fila 13), que no tiene carriles.
  - **Desfase de buceo:** `LaneObj` suma `diveOffset: number` (`= i * 1.3` s para el buceador de índice `i`). La fase de cada buceador es `(gs.diveClock + o.diveOffset) % DIVE_CYCLE` (reemplaza el reloj global único de 01), así no se hunden todos a la vez.
  - **Mosca bonus:** constantes `FLY_INTERVAL = 8` (s), `FLY_DURATION = 4` (s), `SCORE_FLY = 200`. `GameState` suma `fly: { home: number; t: number } | null` y `flyTimer: number`. En `update` (solo en `playing`/`dying`), `flyTimer += dt`; al llegar a `FLY_INTERVAL` → `flyTimer = 0` y, si hay charcas vacías, `fly = { home: <índice aleatorio de charca vacía>, t: FLY_DURATION }`. `fly.t -= dt`; en 0 → `fly = null`. En `resolveHome`, si la charca llenada es `fly.home` → `score += SCORE_FLY`, popup `+200`, `fly = null`. La mosca desaparece si su charca se llena o si se completa la ronda.
  - **Vida extra:** constantes `EXTRA_LIFE_EVERY = 10000`, `MAX_LIVES = 5`. `GameState` suma `nextExtraLife: number` (inicial `10000`). Cada vez que se suma puntaje (función interna `addScore(gs, pts, x, y)` que reemplaza los `score +=` directos de 01): `while (score >= nextExtraLife) { if (lives < MAX_LIVES) lives += 1; nextExtraLife += EXTRA_LIFE_EVERY; popup "+1 VIDA" }`. El HUD Vidas se actualiza solo vía el `onLivesChange` existente del canvas.
  - **Feedback visual** (estado en `GameState`, avanzado en `update(gs, dt)` también durante `dying`, congelado en pausa porque `update` no corre):
    - `particles: Particle[]` con `interface Particle { x; y; vx; vy; life; maxLife; color; size; gravity }`, tope `MAX_PARTICLES = 80` (si se excede se descartan las más viejas). Integración: `vy += gravity * dt; x += vx * dt; y += vy * dt; life -= dt`; alpha = `life / maxLife`.
      - Ahogo (`water`): 12 partículas `#00f5ff`, ángulo aleatorio en semicírculo superior, velocidad 60–160 px/s, `life 0.5`, `size 3`, `gravity 300`.
      - Atropello (`road`): 10 partículas del color del vehículo + 4 `#00ff88`, velocidad 80–220 px/s en cualquier dirección, `life 0.6`, `size 4`, `gravity 500`.
      - Tiempo/seto (`time`/`hedge`): 8 partículas `#ff2b4a`, velocidad 40–120 px/s, `life 0.5`, `size 3`, `gravity 0`.
      - Charca llenada: 16 partículas `#00ff88` radiales desde el centro de la charca, velocidad 50–150 px/s, `life 0.6`, `size 3`, `gravity 0`.
    - `shake: number` (s restantes). `SHAKE_TIME = 0.25`, `SHAKE_MAG = 6` px. Se activa en `killFrog`. En `draw`: `ctx.save(); ctx.translate(rx, ry)` con `rx, ry ∈ [-m, m]`, `m = SHAKE_MAG * shake / SHAKE_TIME`; `ctx.restore()` antes del overlay de game over. Las filas 0 y 14 (barras) también tiemblan (se dibuja todo dentro del mismo `save/restore`).
    - `flash: { color: string; t: number; dur: number } | null`: charca llenada → `rgba(0,255,136,0.25)`, `dur 0.2`; ronda completa → `rgba(255,255,255,0.35)`, `dur 0.3`; muerte → `rgba(255,43,74,0.2)`, `dur 0.15`. Se dibuja como `fillRect(0,0,W,H)` con alpha escalada por `t / dur`.
    - `banner: { text: string; t: number } | null`: al completar una ronda → `NIVEL NN` durante `1.5` s, centrado en la fila 7 (mediana), bold 40px monospace `#ffe600` con sombra `#ff2bd6` de 12px; fade de alpha en los últimos 0.5 s. El juego no se detiene durante el banner.
    - `popups: { x; y; text; t }[]` (máx. 8, vida `0.8` s, suben 30 px, fade lineal): `+50`/`+(50+bonus tiempo)` al llenar charca, `+200` mosca, `+1000` ronda, `+1 VIDA`. Los `+10` de avance **no** generan popup (ruido visual).
    - **Squash de salto:** durante `hopT > 0`, la rana se dibuja escalada `sx = 1 + 0.15 * sin(π·p)`, `sy = 1 - 0.15 * sin(π·p)` con `p = 1 - hopT / HOP_TIME`.
    - **Timer en alerta:** si `timeLeft < 5`, la barra de tiempo es `#ff2b4a` y parpadea (`Math.floor(timeLeft * 4) % 2 === 0` → alpha 1, si no 0.4); si no, `#00ff88`.
    - **Mosca:** dentro de la charca, cuerpo `#ffe600` de radio 5 y dos alas `rgba(255,255,255,0.7)` elipses 6×3, oscilando `±2px` en y con `sin(fly.t * 10)`.
    - **Buceadores:** fase arriba → dibujo normal; hundiéndose → alpha `0.5` y radio `-3px`; sumergido → solo anillo `rgba(0,245,255,0.3)`. Así se anticipa visualmente la inmersión 0.6 s antes.
- **Balance de puntaje** (sin constantes nuevas más allá de `SCORE_FLY`): ronda perfecta estimada con ~10 s por cruce = `5 × (120 avance + 50 charca + 10 × (timePerFrog − 10)) + 1000`, es decir ≈2.850 en nivel 1 y ≈2.250 en nivel 7+, más ~400 por ronda si se toman 2 moscas. Acumulado estimado: 5 rondas ≈ 15.000, 8 rondas ≈ 23.000–25.000. El `best` seed 24600 (GJ-rana-02) queda como un objetivo alto pero alcanzable (llegar al nivel 9).
- **Assets:** ninguno. No se crea `public/games/rana/`.

**Out of scope (para otra spec):**

- Sonido (saltos, splash, bocinas) — decisión heredada.
- Cocodrilos, nutrias, serpiente en la mediana, lady frog.
- Niveles con layouts distintos (el mapa de filas de GJ-rana-01 es fijo; solo cambian valores).
- Guardar el nivel alcanzado en `scores`.
- Mostrar vidas extra ganadas, mosca o tiempo en el HUD React compartido.
- Cambios en `RanaCanvas.tsx`, `registry.ts`, `GamePlayerClient.tsx` o `globals.css`.

---

## Data model

Sin cambios en DB ni en tipos compartidos. Cambios de tipos solo dentro de `rana-engine.ts`:

```ts
export interface LaneObj { x: number; w: number; kind: ObjKind; diver: boolean; diveOffset: number; color: string }
export interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; gravity: number }
export interface Popup { x: number; y: number; text: string; t: number }

export interface GameState {
  // ... campos de GJ-rana-01 ...
  fly: { home: number; t: number } | null;
  flyTimer: number;
  nextExtraLife: number;
  particles: Particle[];
  popups: Popup[];
  shake: number;
  flash: { color: string; t: number; dur: number } | null;
  banner: { text: string; t: number } | null;
}
```

---

## Implementation plan

1. `components/games/rana-engine.ts` — agregar `LevelDef`, `LEVELS` (tabla de 8 filas) y `levelDef`; redefinir `timeForLevel`/`speedForLevel` sobre la tabla y borrar las constantes lineales de 01.
2. Mismo archivo — `buildLanes(level)` con tráfico extra y buceadores por nivel + `diveOffset`; usarla en `initGame` y en la subida de nivel de `resolveHome`; cambiar el cálculo de fase de buceo a `(diveClock + diveOffset) % DIVE_CYCLE`.
3. Mismo archivo — `addScore(gs, pts, x, y)` con popups y vida extra (`EXTRA_LIFE_EVERY`, `MAX_LIVES`, `nextExtraLife`); reemplazar todos los `score +=` de 01 por `addScore` (el `+10` de avance llama con popup desactivado).
4. Mismo archivo — mosca: `flyTimer`, `fly`, spawn en charca vacía aleatoria, expiración, `SCORE_FLY` en `resolveHome`, dibujo.
5. Mismo archivo — FX: `particles` (emisores por causa de muerte y por charca), `shake`, `flash`, `banner`, `popups`; su avance en `update` y su dibujo en `draw` (orden: fondo → carriles → charcas/mosca → rana → partículas → popups → barras → banner → flash → `restore` del shake → overlay GAME OVER).
6. Mismo archivo — squash del salto y barra de tiempo en alerta.
7. `npm run build` y `npm run lint`.
8. Probar en `/jugar/rana`: completar al menos 2 rondas, provocar cada tipo de muerte, tomar una mosca y verificar la vida extra (se puede probar temporalmente con `EXTRA_LIFE_EVERY` bajo en local, revirtiéndolo antes de commitear).

---

## Acceptance criteria

- [ ] Al completar la ronda N, velocidad de carriles y tiempo por rana pasan a los valores de la fila N+1 de `LEVELS`; desde el nivel 8 se mantienen los valores de la fila 8.
- [ ] Las filas 3 y 5 tienen la cantidad de grupos buceadores de la tabla para el nivel actual, y cada uno se hunde desfasado de los demás (`diveOffset`).
- [ ] Las filas 10 y 12 suman los autos extra de la tabla al subir de nivel, sin que aparezcan autos superpuestos.
- [ ] La mosca aparece cada 8 s en una charca vacía, dura 4 s; llenar esa charca mientras está suma 200 extra con popup `+200`.
- [ ] Cada 10.000 puntos se gana una vida (HUD Vidas se actualiza en vivo), con tope de 5 vidas; se muestra popup `+1 VIDA`.
- [ ] Ahogarse, ser atropellada, quedarse sin tiempo y chocar el seto emiten sus partículas propias (colores/cantidades de la spec) y provocan shake de 0.25 s y flash rojo.
- [ ] Llenar una charca emite partículas verdes y flash verde; completar la ronda muestra flash blanco, popup `+1000` y el banner `NIVEL NN` durante 1.5 s sin detener el juego.
- [ ] La rana hace squash durante el salto y la barra de tiempo se vuelve roja y parpadea con menos de 5 s.
- [ ] Las tortugas buceadoras se ven semitransparentes 0.6 s antes de sumergirse y como anillo mientras están sumergidas.
- [ ] Nunca hay más de 80 partículas ni más de 8 popups vivos.
- [ ] PAUSA congela también partículas, shake, flash, banner, popups, mosca y buceo; REANUDAR continúa sin saltos.
- [ ] HUD superior (Jugador/Puntuación/Vidas/Nivel) sigue reflejando score, vidas y nivel reales en vivo.
- [ ] FIN y la muerte por reglas propias siguen abriendo el modal con el score real (incluidos los bonus); JUGAR DE NUEVO resetea nivel, carriles, mosca, vida extra y FX.
- [ ] Guardar puntuación sigue funcionando vía `saveScoreAction` y se refleja en `/salon`.
- [ ] `rocas`, `tetris`, `arkanoid` y `snake` siguen igual; no se modificó ningún archivo fuera de `rana-engine.ts`.
- [ ] No existe `public/games/rana/`.
- [ ] `npm run build` y `npm run lint` pasan sin errores.

---

## Decisions

- **Sí:** tabla de 8 niveles en vez de fórmulas lineales. Razón: permite ajustar cada eje (velocidad, tiempo, buceadores, tráfico) por separado y deja el balance legible en un solo lugar. **Decidido por game-jam — revisar.**
- **Sí:** tope en el nivel 8 (2.0× velocidad, 18 s). Razón: con más de 2.0× los troncos de la fila 4 (90 px/s base) arrastran la rana fuera de pantalla en menos de 2 s, y ya no se puede jugar. **Decidido por game-jam — revisar.**
- **Sí:** mosca bonus de +200 cada 8 s, 4 s de duración. Razón: bonus clásico de Frogger; premia el riesgo de desviarse de la charca más cercana. **Decidido por game-jam — revisar.**
- **Sí:** vida extra cada 10.000 puntos con tope de 5. Razón: el original la da con un umbral fijo; con el balance estimado cae más o menos cada 3-4 rondas. **Decidido por game-jam — revisar.**
- **Sí:** todo el feedback visual se dibuja en el motor. Razón: el HUD React es genérico de 4 campos (decisión heredada de SPEC 07) y el motor ya es dueño del canvas.
- **Sí:** reconstruir los carriles al subir de nivel en vez de insertar autos en caliente. Razón: la rana siempre respawnea en la vereda (fila 13), así que no puede aparecer un auto encima de ella, y el código queda más simple. **Decidido por game-jam — revisar.**
- **No:** popup para los +10 de avance. Razón: saldría en casi cada salto y taparía el juego. **Decidido por game-jam — revisar.**
- **No:** sonido. Razón: decisión heredada de SPEC 05/07/08.
- **No:** assets en `public/games/rana/`. Razón: formas planas, igual que arkanoid (SPEC 08). **Decidido por game-jam — revisar.**
- **No:** pausa propia, mouse, touch ni gamepad. Razón: decisiones heredadas.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Con 3-4 buceadores en las filas 3 y 5 puede quedar un momento sin ninguna plataforma segura en la fila | El `diveOffset` de 1.3 s separa las fases y la fila 3 tiene 3 grupos, así que como máximo hay 1 sumergido a la vez (sumergido dura 0.6 s de un ciclo de 4 s). La fila 5 tiene 4 grupos y se verifica jugando el nivel 8. |
| Los autos extra de las filas 10/12 dejan huecos imposibles de cruzar | Con el reparto uniforme `SPAN / count` y count ≤ 5, el hueco mínimo es 1040/5 − 40 = 168 px (≥ 4 celdas); se verifica jugando el nivel 6+. |
| Muchas partículas bajan el framerate en equipos lentos | Tope `MAX_PARTICLES = 80` y `MAX_POPUPS = 8`; las partículas son `fillRect` sin sombras. |
| El shake deja el `ctx` trasladado si hay un `return` temprano en `draw` | Un solo `save()` al inicio y un solo `restore()` antes del overlay, sin `return` intermedios. |
| La vida extra dispara `onLivesChange` mientras la rana está en `dying` con 0 vidas y "revive" una partida que debía terminar | `addScore` solo se llama en `playing` (charcas/avance); en `dying` no se suma puntaje, así que no puede otorgar vida. |
| El balance estimado difiere del real y `best 24600` queda inalcanzable o trivial | `best` es un valor fijo seedeado solo para mostrar (SPEC 06), no afecta el juego; ajustar `LEVELS`/`SCORE_*` en una spec posterior si hace falta. |

---

## What is **not** in this spec

- Sonido.
- Cocodrilos, nutrias, serpiente, lady frog.
- Layouts de mapa distintos por nivel.
- Nuevos campos en el HUD React.
- Guardar nivel alcanzado en `scores`.
- Assets en `public/games/rana/`.
- Actualizar `best`/`plays` con datos reales.
- Configuración de RLS/policies.

Cada uno de estos, si se necesita, va en su propia spec.
