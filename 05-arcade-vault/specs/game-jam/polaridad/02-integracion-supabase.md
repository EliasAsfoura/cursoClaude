# SPEC GJ-polaridad-02 — Integración con Supabase (POLARIDAD)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, GJ-polaridad-01
> **Date:** 2026-09-30
> **Objective:** Sembrar POLARIDAD en la tabla `games`, agregar su portada CSS `cover-polaridad` y verificar que el juego aparece en catálogo, detalle, player y salón, guardando scores reales vía `saveScoreAction`.

---

## Scope

**In:**

- Migración Supabase (`mcp__supabase__apply_migration`, nombre `seed_game_polaridad`) con el `insert into games` literal de la sección Data model.
- `app/globals.css`: agregar `.cover-polaridad` y `.cover-polaridad::after` (CSS concreto abajo) después del último bloque `.cover-*` existente (`.cover-duelo::after`, o `.cover-eco::after` si GJ-eco-02 ya se implementó) y antes de `/* ===== detail screen ===== */`. Ningún otro cambio de CSS: `.game-arena canvas` ya fuerza `width:100%; height:100%; aspect-ratio:4/3`.
- Metadatos: `id` `polaridad`, `title` `POLARIDAD`, `cat` `PUZZLE` (junto con SHOOTER, la categoría con menos juegos implementados —1— entre las que tienen juegos; el timing de inversión de gravedad se lee como puzzle de patrones), `color` `yellow` (el menos usado: solo `rocas`), `cover` `cover-polaridad`, `best` `7400`, `plays` `'1.9K'`, con vidas (`hasLives: true`, `initialLives: 3`, ya en registry por GJ-polaridad-01).
- Verificación de rutas: `/` (card en filtro TODOS y PUZZLE), `/inicio`, `/juego/polaridad`, `/jugar/polaridad`, `/salon` (tab propio "POLARIDAD"); `saveScoreAction` inserta en `scores`; `npm run build` y `npm run lint`.

**Out of scope (para otra spec):**

- Motor y canvas (GJ-polaridad-01); niveles y efectos (GJ-polaridad-03).
- Cambios en `lib/data.ts`, `lib/queries.ts`, `lib/actions.ts` o el player; RLS; recalcular `best`/`plays`.

---

## Data model

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays) values
  ('polaridad', 'POLARIDAD', 'Invertí la gravedad y esquivá los picos.',
   'Corré por un pasillo con piso y techo que avanza cada vez más rápido. Con un solo botón invertís la gravedad y caés al lado opuesto: esquivá picos y pilares, juntá núcleos en cadena y aguantá con tus 3 vidas hasta el nivel 10.',
   'PUZZLE', 'cover-polaridad', 'yellow', 7400, '1.9K');
```

CSS a agregar en `app/globals.css`:

```css
.cover-polaridad { background: linear-gradient(180deg,#2a2600,#0a0a18 45%,#0a0a18 55%,#2a2600); }
.cover-polaridad::after {
  content: "";
  position: absolute; inset: 0;
  background:
    linear-gradient(var(--yellow), var(--yellow)) 0 12%/100% 3px no-repeat,
    linear-gradient(var(--yellow), var(--yellow)) 0 88%/100% 3px no-repeat,
    linear-gradient(var(--yellow), var(--yellow)) 50% 50%/22px 22px no-repeat,
    linear-gradient(var(--magenta), var(--magenta)) 25% 88%/28px 22px no-repeat,
    linear-gradient(var(--magenta), var(--magenta)) 75% 12%/28px 22px no-repeat;
  filter: drop-shadow(0 0 8px rgba(245,255,0,0.5));
}
```

`Game`, `CATS`, `GameColor` en `lib/data.ts` no cambian (`PUZZLE` y `yellow` ya existen).

---

## Implementation plan

1. Aplicar la migración `seed_game_polaridad` con `mcp__supabase__apply_migration` y el insert de Data model. Verificar con `select id, title, cat, color from games where id = 'polaridad';` (1 fila).
2. `app/globals.css` — insertar `.cover-polaridad` y `.cover-polaridad::after` en la posición indicada; comprobar que las variables `--yellow` y `--magenta` existen (`grep -n "\-\-yellow\|\-\-magenta" app/globals.css`).
3. Levantar `npm run dev` y recorrer: `/` (portada visible, filtros TODOS y PUZZLE), `/inicio`, `/juego/polaridad` (leaderboard vacío), `/jugar/polaridad` (jugable, HUD en vivo), `/salon` (tab "POLARIDAD").
4. Jugar hasta perder las 3 vidas, guardar el score con un nombre y confirmar en `/salon` tras recargar; repetir con el botón FIN.
5. Regresión: abrir `/jugar/rocas`, `/jugar/tetris`, `/jugar/arkanoid`, `/jugar/snake` y un id sin registry (placeholder mock).
6. `npm run build` y `npm run lint`.

---

## Acceptance criteria

- [ ] `select` sobre `games` devuelve la fila `polaridad` con los valores literales de Data model (una sola fila; la migración no duplica).
- [ ] El juego aparece en `/` (filtros TODOS y PUZZLE), `/inicio` y `/salon` (tab propio "POLARIDAD") con la portada `cover-polaridad` renderizada (piso y techo amarillos, cubo central, bloques magenta).
- [ ] `/juego/polaridad` muestra su leaderboard real (vacío si no hay scores).
- [ ] `/jugar/polaridad` es jugable con `Space`/`ArrowUp`/`ArrowDown` dentro de `.crt-screen`.
- [ ] HUD (Jugador/Puntuación/Vidas/Nivel) refleja valores reales en vivo (vidas 3 al inicio).
- [ ] PAUSA/REANUDAR sin saltos.
- [ ] FIN fuerza el fin real y abre el modal con el score real.
- [ ] Perder las 3 vidas por golpes (sin tocar FIN) también abre el modal con el score real.
- [ ] Guardar puntuación inserta en `scores` vía `saveScoreAction` (solo `gameId`/`name`/`score`) y se ve en `/salon` tras recargar.
- [ ] JUGAR DE NUEVO remonta el canvas (`key={runId}`): score 0, vidas 3, nivel 1.
- [ ] `rocas`, `tetris`, `arkanoid`, `snake` y los ids sin entrada en el registry siguen exactamente igual.
- [ ] `npm run build` y `npm run lint` pasan sin errores.

---

## Decisions

- **Sí:** cat `PUZZLE`, color `yellow`. Razón: categoría y color menos representados según el catálogo inferido (ARCADE 3, PUZZLE 1, SHOOTER 1; VERSUS reservada por `eco`; amarillo solo en `rocas`). — decidido por game-jam — revisar: catálogo inferido sin acceso a DB.
- **Sí:** `cover-polaridad` nueva con CSS concreto (no se reutiliza ninguna clase existente porque ninguna evoca piso/techo). — decidido por game-jam — revisar.
- **Sí:** `best` 7400 y `plays` `'1.9K'` como valores fijos seed. Razón: ~2 min de partida rinden 5 000–9 000 pts (ver GJ-polaridad-03). — decidido por game-jam — revisar.
- **Sí:** migración por `apply_migration` y no INSERT manual desde el dashboard. Razón: mismo criterio que specs 07/08.
- **Heredado (no re-decidir):** sin RLS, `best`/`plays` fijos, `saveScoreAction` solo guarda `gameId`/`name`/`score`, sin sonido, sin mouse/touch/gamepad.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Colisión de nombre/orden de CSS con `cover-eco` (spec paralela de otra jam) | Ambas se insertan antes de `/* ===== detail screen ===== */`; cada una usa su propio selector, sin solaparse. |
| El id `polaridad` ya existe en la DB real (catálogo inferido, no consultado) | Paso 1 verifica con `select` antes de aplicar; si existe, abortar y elegir otro id. |
| Insert duplicado si la migración se corre dos veces | `id` es PK; la segunda ejecución falla sin efectos. |
| La portada (barras planas en lugar de picos) se ve simple | Solo decorativa; piso/techo/cubo bastan para reconocer el juego. |
| Agregar CSS rompe otras portadas | Selectores únicos `.cover-polaridad*`; no se editan reglas existentes. |

---

## What is **not** in this spec

- Motor, canvas y registry (GJ-polaridad-01).
- Tabla de niveles, efectos y balance (GJ-polaridad-03).
- Cambios en `lib/*` o en el player; RLS; `best`/`plays` reales.
- Skins, controles táctiles, sonido.

Cada uno de estos, si se necesita, va en su propia spec.
