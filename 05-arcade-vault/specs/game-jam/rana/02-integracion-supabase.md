# SPEC GJ-rana-02 — Integración Supabase y catálogo (Rana)

> **Status:** Draft
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, GJ-rana-01
> **Date:** 2026-09-28
> **Objective:** Dar de alta `rana` en la tabla `games` de Supabase para que aparezca en el catálogo (`/`, `/inicio`), tenga detalle con leaderboard real (`/juego/rana`), sea jugable en `/jugar/rana` con el canvas de GJ-rana-01, y sus puntuaciones se guarden vía `saveScoreAction` y se vean en `/salon`.

---

## Scope

**In:**

- Migración Supabase (`mcp__supabase__apply_migration`, nombre `seed_game_rana`): `insert into games` con la fila literal de la sección Data model.
- `app/globals.css`: **no se agrega CSS**. `.cover-rana` ya existe (línea ~509: gradiente `#001f2a → #0a0a18` + franjas cyan horizontales de 20px + círculo verde `var(--green)` con `drop-shadow`), y encaja con el juego (carriles + rana). `.game-arena canvas` (línea ~695) ya fuerza `width:100%; height:100%; aspect-ratio:4/3`. El paso de implementación solo **verifica** que ambas reglas sigan tal cual.
- Verificación end-to-end de rutas existentes (sin tocar su código):
  - `/` (`HomeClient`): la card RANA aparece en `TODOS` y en el filtro `ARCADE`, con cover `cover-rana` y acento `green`.
  - `/inicio` (`InicioClient`): RANA aparece en el listado/grilla de juegos que consume `getGames`.
  - `/juego/rana`: título, `long`, `best` 24.600, `plays` 7.3K y leaderboard real vía `getTopScores("rana")` (vacío al principio).
  - `/jugar/rana`: `GamePlayerClient` resuelve `GAME_REGISTRY["rana"]` (agregado en GJ-rana-01) y monta `RanaCanvas`, no el placeholder mock.
  - `/salon` (`HallOfFameClient`): tab propio "RANA" vía `getAllTopScores`.
  - `saveScoreAction("rana", name, score)` inserta en `scores` y la fila se ve en `/juego/rana` y `/salon` tras recargar.
- `npm run build` y `npm run lint`.

**Out of scope (para otra spec):**

- Cambios de código en `lib/queries.ts`, `lib/actions.ts`, `lib/data.ts`, `HomeClient`, `InicioClient`, `HallOfFameClient` o `GamePlayerClient` (no hacen falta: todo es data-driven desde `games` + `GAME_REGISTRY`).
- Actualizar `references/implemented-games.md` / `references/game-suggestions-to-do.md` (lo hace el flujo `game-planner`/implementación, no esta spec).
- Recalcular `best`/`plays` con datos reales.
- RLS/policies.
- Niveles y pulido (GJ-rana-03).

---

## Data model

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays) values
  ('rana', 'RANA', 'Cruzá calles y ríos, llegá a las cinco charcas.',
   'Saltá carril por carril esquivando autos, topadoras y camiones, y después cruzá el río sobre troncos y tortugas que se hunden sin avisar. Llená las cinco charcas de la orilla antes de que se agote el tiempo. Cada ronda completa acelera el tráfico y la corriente. Tenés 3 vidas.',
   'ARCADE', 'cover-rana', 'green', 24600, '7.3K');
```

Tipos TS de `lib/data.ts` no cambian (`ARCADE` ya está en `CATS`, `green` ya está en `GameColor`). La tabla `scores` no cambia (`game_id`, `name`, `score`, `created_at`); `saveScoreAction` sigue guardando solo `gameId`/`name`/`score`.

---

## Implementation plan

1. Verificar con `select id from games where id = 'rana';` (vía `mcp__supabase__execute_sql`) que la fila no existe.
2. Aplicar la migración `seed_game_rana` (`mcp__supabase__apply_migration`) con el `insert` de Data model.
3. Verificar con `select id, title, cat, color, cover, best, plays from games where id = 'rana';` que la fila quedó con los valores exactos.
4. Verificar en `app/globals.css` que `.cover-rana` y `.game-arena canvas` existen y no cambiaron; no escribir CSS.
5. Confirmar que `components/games/registry.ts` contiene la entrada `rana` de GJ-rana-01.
6. `npm run dev` y recorrer `/`, `/inicio`, `/juego/rana`, `/jugar/rana`, `/salon` (Playwright MCP, capturas en `.playwright-screenshots/`).
7. Jugar una partida en `/jugar/rana`, terminarla (por muerte y otra con FIN), guardar la puntuación y verificar que aparece en `/juego/rana` y en `/salon` tras recargar.
8. `npm run build` y `npm run lint`.

---

## Acceptance criteria

- [ ] La fila `rana` existe en `games` con `title 'RANA'`, `cat 'ARCADE'`, `cover 'cover-rana'`, `color 'green'`, `best 24600`, `plays '7.3K'`.
- [ ] El juego aparece en `/` (en `TODOS` y en el filtro `ARCADE`) con el cover `cover-rana`.
- [ ] El juego aparece en `/inicio`.
- [ ] `/juego/rana` muestra título, descripción larga, best/plays seed y su leaderboard real (vacío si no hay scores).
- [ ] `/salon` tiene un tab propio "RANA".
- [ ] `/jugar/rana` monta `RanaCanvas` (no el placeholder mock) y es jugable con flechas/WASD dentro de `.crt-screen`.
- [ ] HUD superior (Jugador/Puntuación/Vidas/Nivel) refleja score, vidas y nivel reales en vivo.
- [ ] PAUSA congela el juego exactamente donde quedó; REANUDAR continúa sin saltos.
- [ ] FIN fuerza el fin real de la partida y abre el modal con el score real.
- [ ] Perder las 3 vidas por las reglas propias del juego también abre el modal con el score real.
- [ ] Guardar puntuación inserta en `scores` vía `saveScoreAction` (`game_id = 'rana'`) y se refleja en `/juego/rana` y `/salon` tras recargar.
- [ ] JUGAR DE NUEVO reinicia una partida real (canvas remontado vía `key={runId}`, HUD en valores iniciales: 0 / 3 vidas / nivel 01).
- [ ] `rocas`, `tetris`, `arkanoid` y `snake` siguen apareciendo y funcionando igual en todas las rutas; ids sin registry siguen mostrando el placeholder.
- [ ] No se agregó CSS a `app/globals.css`.
- [ ] `npm run build` y `npm run lint` pasan sin errores.

---

## Decisions

- **Sí:** reusar `.cover-rana` existente sin CSS nuevo. Razón: ya fue diseñada para este juego (franjas de carriles + rana verde) y coincide con el color `green`. **Decidido por game-jam — revisar.**
- **Sí:** copy `short`/`long` en español rioplatense, mismo tono que `arkanoid` ("Destruí...") y `tetris`. **Decidido por game-jam — revisar.**
- **Sí:** `best 24600`, `plays '7.3K'`. Razón: son valores fijos seedeados (decisión heredada de SPEC 06). Según el balance de GJ-rana-03, 24.600 equivale a completar unas 8 rondas (llegar al nivel 9) tomando moscas: una meta alta pero alcanzable. `plays` es menor que el de los juegos existentes porque es un juego nuevo. **Decidido por game-jam — revisar.**
- **Sí:** migración separada `seed_game_rana`, mismo naming que `seed_game_tetris`/`seed_game_arkanoid`/`seed_game_snake`.
- **No:** RLS/policies. Razón: sigue diferido desde SPEC 06.
- **No:** guardar nivel alcanzado u otros metadatos con el score. Razón: `saveScoreAction` solo guarda `gameId`/`name`/`score` (decisión heredada).
- **No:** recalcular `best`/`plays` en vivo. Razón: decisión heredada de SPEC 06.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Aplicar la migración antes de mergear GJ-rana-01 hace que `/jugar/rana` muestre el placeholder mock en producción | Aplicar `seed_game_rana` solo después de que `RanaCanvas` y la entrada `rana` del registry estén en la rama; el paso 5 lo verifica. |
| La migración se aplica dos veces (duplicate key en `games.id`) | Paso 1 verifica que la fila no existe antes de aplicar. |
| `.cover-rana` fue modificada o eliminada desde el diseño original | Paso 4 verifica que existe; si faltara, se restaura el bloque de las líneas ~509-517 tal cual (gradiente `#001f2a→#0a0a18`, `repeating-linear-gradient` cyan 20px, `radial-gradient` verde 14px). |
| Caracteres acentuados en `short`/`long` (`Cruzá`, `Saltá`, `Tenés`) se corrompen en la migración | Se aplica vía MCP con el texto UTF-8 literal; paso 3 verifica leyendo la fila. |

---

## What is **not** in this spec

- Código de motor/canvas (GJ-rana-01).
- Niveles, bonus y efectos visuales (GJ-rana-03).
- Cambios a queries, actions o componentes de catálogo/salón.
- Actualizar archivos de `references/`.
- Actualizar `best`/`plays` con datos reales.
- Configuración de RLS/policies.

Cada uno de estos, si se necesita, va en su propia spec.
