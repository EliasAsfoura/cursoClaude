# SPEC GJ-eco-02 — Integración Supabase y catálogo (ECO)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, GJ-eco-01
> **Date:** 2026-09-30
> **Objective:** Sembrar ECO en la tabla `games`, agregar su portada CSS `cover-eco` y verificar que el juego aparece en catálogo, detalle, player y salón, guardando scores reales vía `saveScoreAction`.

---

## Scope

**In:**

- Migración Supabase (`mcp__supabase__apply_migration`, nombre `seed_game_eco`) con el `insert into games` literal de la sección Data model.
- `app/globals.css`: agregar `.cover-eco` y `.cover-eco::after` (CSS concreto abajo) inmediatamente después del bloque `.cover-duelo::after` y antes de `/* ===== detail screen ===== */`. Ningún otro cambio de CSS: `.game-arena canvas` ya fuerza `width:100%; height:100%; aspect-ratio:4/3`.
- Metadatos: `id` `eco`, `title` `ECO`, `cat` `VERSUS` (categoría con 0 juegos; ya está en `CATS`), `color` `magenta` (ya en `GameColor`), `cover` `cover-eco`, `best` `9800`, `plays` `'3.1K'`, con vidas (`hasLives: true`, `initialLives: 3`, ya en registry por GJ-eco-01).
- Verificación de rutas: `/` (card en filtro TODOS y VERSUS), `/inicio`, `/juego/eco`, `/jugar/eco`, `/salon` (tab propio "ECO"); `saveScoreAction` inserta en `scores`; `npm run build` y `npm run lint`.

**Out of scope (para otra spec):**

- Motor y canvas (GJ-eco-01); niveles y efectos (GJ-eco-03).
- Cambios en `lib/data.ts`, `lib/queries.ts`, `lib/actions.ts` o el player; RLS; recalcular `best`/`plays`.

---

## Data model

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays) values
  ('eco', 'ECO', 'Sobreviví a tus propios fantasmas.',
   'Recogé núcleos durante 12 segundos: tu recorrido queda grabado y en la ronda siguiente vuelve como un eco que te persigue. Cada ronda suma un fantasma más. Esquivá tu pasado durante 12 rondas sin perder tus 3 vidas.',
   'VERSUS', 'cover-eco', 'magenta', 9800, '3.1K');
```

CSS a agregar en `app/globals.css`:

```css
.cover-eco { background: radial-gradient(circle at 50% 50%, #2a0030, #0a0a18); }
.cover-eco::after {
  content: "";
  position: absolute; inset: 0;
  background:
    radial-gradient(circle at 50% 50%, var(--cyan) 0 8px, transparent 9px),
    repeating-radial-gradient(circle at 50% 50%, transparent 0 22px, rgba(255,0,110,0.35) 22px 24px);
  filter: drop-shadow(0 0 8px rgba(255,0,110,0.5));
}
```

`Game`, `CATS`, `GameColor` en `lib/data.ts` no cambian.

---

## Implementation plan

1. Aplicar la migración `seed_game_eco` con `mcp__supabase__apply_migration` (SQL del Data model). Verificación: `select id, title, cat, color from games where id = 'eco';` devuelve 1 fila.
2. Editar `app/globals.css`: pegar el CSS `.cover-eco` tras `.cover-duelo::after`. Verificación: la card de ECO en `/` muestra círculo cian con anillos magenta.
3. Verificar rutas con el servidor dev: `/` (aparece en TODOS y VERSUS), `/inicio`, `/juego/eco` (leaderboard vacío o real), `/jugar/eco` (canvas jugable), `/salon` (tab ECO).
4. Jugar una partida completa, perder las 3 vidas, guardar el score con nombre y confirmar en `/salon` tras recargar.
5. Probar PAUSA/REANUDAR, FIN y JUGAR DE NUEVO.
6. `npm run build` y `npm run lint`.

---

## Acceptance criteria

- [ ] Existe la fila `eco` en `games` con los valores del Data model (una sola, sin duplicados).
- [ ] ECO aparece en `/`, `/inicio` y `/salon` (tab propio "ECO") y en el filtro VERSUS de `/`.
- [ ] `/juego/eco` muestra su leaderboard real (vacío si no hay scores).
- [ ] `/jugar/eco` es jugable con controles reales dentro de `.crt-screen`.
- [ ] La portada `cover-eco` se ve en la card y en el detalle sin desbordes.
- [ ] HUD (Jugador/Puntuación/Vidas/Nivel) en vivo; vidas muestran 3 al inicio y nivel = ronda.
- [ ] PAUSA/REANUDAR sin saltos; FIN fuerza fin real y abre el modal con el score real.
- [ ] Game over por vidas agotadas y `win` en la ronda 12 abren el modal con el score real.
- [ ] Guardar puntuación vía `saveScoreAction` inserta en `scores` (`gameId`/`name`/`score`) y se refleja en `/salon` tras recargar.
- [ ] JUGAR DE NUEVO remonta el canvas (`key={runId}`) con HUD en valores iniciales.
- [ ] `rocas`, `tetris`, `arkanoid`, `snake` y los ids sin registry siguen igual.
- [ ] `npm run build` y `npm run lint` pasan sin errores.

---

## Decisions

- **Sí:** id `eco`, title `ECO`, cat `VERSUS`, color `magenta`, cover `cover-eco` (CSS nuevo), `best` 9800, `plays` `'3.1K'`. Razón: VERSUS no tiene juegos implementados (versus-tu-pasado encaja) y magenta comparte solo con tetris (green tiene 2). — decidido por game-jam — revisar.
- **Sí:** catálogo inferido sin acceso a DB: ids/cat/color derivados de `lib/data.ts`, `components/games/registry.ts` (rocas, tetris, arkanoid, snake, frogger), `references/implemented-games.md`, `references/game-suggestions-to-do.md`, `specs/*.md` y `specs/game-jam/*` (rana). No se ejecutó `select ... from games`. — decidido por game-jam — revisar: catálogo inferido sin acceso a DB. Antes de aplicar la migración, correr `select id from games where id = 'eco'` para confirmar que no existe.
- **Sí:** `cover-eco` propio en vez de reusar una clase. Razón: ninguna portada existente representa círculos/ecos.
- **No:** RLS, `best`/`plays` dinámicos. Razón: heredado, sigue diferido.
- **Heredado:** `saveScoreAction` solo guarda `gameId`/`name`/`score`; sin pausa propia; sin sonido; sin mouse/touch/gamepad.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| El id `eco` ya existe en la DB real (catálogo inferido) | Paso 1: `select` previo; si existe, cambiar id a `eco2` antes de continuar y anotarlo. |
| Migración aplicada antes de que el registry tenga `eco` → muestra placeholder mock | Implementar GJ-eco-01 primero (dependencia declarada). |
| CSS `--cyan`/`--magenta` no definidos en `:root` | Ya usados por `.cover-duelo`/`.cover-snake`; verificar visualmente la portada. |
| Cat `VERSUS` filtra vacío si `CATS` cambia | `VERSUS` ya está en `CATS`; no se modifica. |

---

## What is **not** in this spec

- Motor/canvas y registry (GJ-eco-01).
- Niveles, efectos y balance (GJ-eco-03).
- Cambios en queries/acciones/player, RLS, `best`/`plays` reales.
- Skins y controles táctiles.
