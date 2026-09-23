# SPEC 06 — Leaderboard y tabla de juegos en Supabase

> **Status:** Approved
> **Depends on:** SPEC 04
> **Date:** 2026-09-23
> **Objective:** Reemplazar el catálogo de juegos (`GAMES` hardcodeado) y el leaderboard mock (`seededScores` random + `av_scores` en localStorage) por tablas reales `games` y `scores` en Supabase, leídas desde Server Components y escritas vía Server Action.

---

## Scope

**In:**

- Migración SQL (aplicada vía `mcp__supabase__apply_migration`) que crea:
  - Tabla `games`: `id text PRIMARY KEY`, `title text`, `short text`, `long text`, `cat text`, `cover text`, `color text`, `best integer`, `plays text`. **Sin RLS** (queda deshabilitado, comportamiento default de Postgres) — la configuración de RLS/policies se difiere a una spec futura de seguridad.
  - Tabla `scores`: `id uuid PRIMARY KEY default gen_random_uuid()`, `game_id text REFERENCES games(id)`, `name text`, `score integer`, `created_at timestamptz default now()`. **Sin RLS** por el mismo motivo.
  - Seed: insert de **un solo juego**, `rocas` (único juego real implementado hoy, spec 05), con los mismos valores que tiene hoy en `lib/data.ts`. Los otros 7 juegos del array actual (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) **no se insertan** — al borrar el array local, dejan de existir en la app.
- `lib/queries.ts` (nuevo, usa `lib/supabase/server.ts`):
  - `getGames(): Promise<Game[]>`
  - `getGame(id: string): Promise<Game | undefined>`
  - `getTopScores(gameId: string, limit = 12): Promise<ScoreRow[]>` — `order by score desc limit N`, arma `rank` secuencial y `date` formateada `DD/MM/AAAA` desde `created_at`.
  - `getAllTopScores(limit = 12): Promise<Record<string, ScoreRow[]>>` — una consulta por juego (8 juegos, dataset chico), usada para precargar `/salon`.
- `lib/actions.ts` (nuevo, `"use server"`): `saveScoreAction(gameId: string, name: string, score: number)` — hace `insert` en `scores` usando `lib/supabase/server.ts`.
- `lib/data.ts`: se elimina el array `GAMES` y la función `seededScores`. Se conservan los tipos `Game`, `GameColor`, `ScoreRow` y la constante `CATS`. `getGame` se elimina de aquí (pasa a `lib/queries.ts`).
- `lib/storage.ts`: se eliminan `SavedScore`, `getScores`, `saveScore` (localStorage de scores). Se conserva todo lo de `User`/`av_user` (auth sigue fuera de scope).
- `app/page.tsx`: pasa a hacer `await getGames()` (Server Component ya es `async`) en vez de importar `GAMES`.
- `app/inicio/page.tsx`: mismo cambio — `await getGames()` en vez de `GAMES`; el uso puntual de `seededScores` (línea ~5, si construye datos de ejemplo) pasa a `await getAllTopScores(...)` o se adapta al dato real disponible.
- `app/juego/[id]/page.tsx`: `await getGame(id)` en vez de `getGame` síncrono de `lib/data.ts`; `await getTopScores(id, 12)` en vez de `seededScores(...)`.
- `app/salon/page.tsx`: se divide en:
  - `app/salon/page.tsx` (Server Component, `async`): hace `await getGames()` y `await getAllTopScores(12)`, pasa ambos como props a un nuevo Client Component.
  - `components/hall/HallOfFameClient.tsx` (nuevo, `"use client"`): recibe `games: Game[]` y `scoresByGame: Record<string, ScoreRow[]>` como props, mantiene el `useState(tab)` actual y el resto de la UI (podio, tabla, fila "tu mejor marca") sin refetch — solo filtra `scoresByGame[tab]` en memoria.
- `app/jugar/[id]/page.tsx`: se divide en:
  - `app/jugar/[id]/page.tsx` (Server Component, `async`): hace `await getGame(id)`, `notFound()` si no existe, pasa `game` como prop a un nuevo Client Component.
  - `components/player/GamePlayerClient.tsx` (nuevo, `"use client"`): recibe `game: Game` como prop, contiene toda la lógica actual del archivo (`useState`, `useRef`, `AsteroidsCanvas`, modal de fin de partida, etc.). `handleSave` pasa a llamar `await saveScoreAction(game.id, name, score)` en vez de `storage.saveScore(...)`.

**Out of scope (para otra spec):**

- Configurar RLS y policies en `games`/`scores` — se crean las tablas sin RLS por ahora; una spec futura de seguridad se encarga de habilitarlo y definir las policies correctas.
- Migrar los 7 juegos placeholder (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) a la tabla `games`. Desaparecen de `/`, `/inicio`, `/salon`, `/juego/[id]` y `/jugar/[id]` al borrar el array local — si se necesitan de vuelta, se migran (con o sin lógica real) en una spec futura.
- Supabase Auth real — los scores se siguen guardando solo con `name` (string libre de hasta 10 caracteres), sin `user_id`, igual que hoy.
- Recalcular `best`/`plays` en vivo desde `scores` (`MAX(score)`, `COUNT(*)`) — quedan como columnas fijas seedeadas, igual que el array actual.
- Panel de administración para editar `games`.
- Migrar datos existentes de `av_scores` en localStorage hacia Supabase — se descartan; los usuarios empiezan el leaderboard real desde cero.
- Rate limiting o validación anti-cheat sobre `scores.score` — cualquier valor insertado se acepta tal cual (mismo nivel de confianza que el `localStorage` actual, que tampoco lo tenía).

---

## Data model

```sql
create table games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null,
  cover text not null,
  color text not null,
  best integer not null,
  plays text not null
);

create table scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references games(id),
  name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);

-- Sin RLS por ahora (deferido a spec futura de seguridad): ambas tablas
-- quedan con lectura/escritura abierta vía la anon key mientras tanto.

insert into games (id, title, short, long, cat, cover, color, best, plays) values
  ('rocas', 'ROCAS', 'Pulveriza asteroides en gravedad cero.',
   'Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.',
   'SHOOTER', 'cover-rocas', 'yellow', 41200, '15.6K');
```

Tipos TypeScript (`lib/data.ts`, sin cambios respecto a hoy salvo remover `GAMES`/`seededScores`):

```ts
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: string;
  cover: string;
  color: GameColor;
  best: number;
  plays: string;
};

export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string;
};
```

---

## Implementation plan

1. Aplicar la migración (`mcp__supabase__apply_migration`): crear `games`, `scores` (sin RLS), y el `insert` de seed con el único juego real (`rocas`) tomado literalmente de `lib/data.ts`.
2. Crear `lib/queries.ts` con `getGames`, `getGame`, `getTopScores`, `getAllTopScores`, usando `createClient()` de `lib/supabase/server.ts`.
3. Crear `lib/actions.ts` con `"use server"` y `saveScoreAction(gameId, name, score)`.
4. Editar `lib/data.ts`: quitar `GAMES` y `seededScores`, dejar `Game`, `GameColor`, `ScoreRow`, `CATS`.
5. Editar `lib/storage.ts`: quitar `SavedScore`, `getScores`, `saveScore`.
6. Editar `app/page.tsx` y `app/inicio/page.tsx` para usar `getGames()`/`getAllTopScores()` en vez de `GAMES`/`seededScores`.
7. Editar `app/juego/[id]/page.tsx` para usar `getGame(id)` y `getTopScores(id, 12)`.
8. Dividir `/salon`: mover la UI actual a `components/hall/HallOfFameClient.tsx` (recibe `games`/`scoresByGame` por props, conserva `useState(tab)`), dejar `app/salon/page.tsx` como Server Component que hace los `await` y renderiza el client component.
9. Dividir `/jugar/[id]`: mover la UI y lógica actual a `components/player/GamePlayerClient.tsx` (recibe `game` por prop), dejar `app/jugar/[id]/page.tsx` como Server Component que resuelve `game` y llama `notFound()` si no existe; `handleSave` dentro del client component pasa a llamar `saveScoreAction`.
10. Verificar `npm run build` y `npm run lint`.

---

## Acceptance criteria

- [ ] Tablas `games` y `scores` existen en el proyecto Supabase, sin RLS (deshabilitado a propósito, deferido a spec futura).
- [ ] `games` tiene exactamente 1 fila seedeada: `rocas`, con los mismos datos que tenía en el array `GAMES` (`title`, `best`, `plays`, etc.).
- [ ] `/` y `/inicio` listan solo `ROCAS` (los otros 7 juegos ya no aparecen) leyendo de Supabase, no de un array en el bundle — si se cambia un valor de `rocas` en la tabla y se recarga la página, el cambio se refleja.
- [ ] `/juego/bloque-buster` (o cualquier otro de los 7 ids removidos) devuelve 404 (`notFound()`), igual que `/jugar/bloque-buster`.
- [ ] `/juego/rocas` muestra el leaderboard de ese juego leyendo la tabla `scores` real (vacío si no hay scores todavía), no `seededScores` random.
- [ ] `/salon` muestra un solo tab (`ROCAS`) con su leaderboard real de `scores`.
- [ ] Jugar una partida en `/jugar/rocas`, terminarla y guardar la puntuación inserta una fila real en `scores` (verificable en `/juego/rocas` o `/salon` tras recargar).
- [ ] `npm run build` y `npm run lint` pasan sin errores.

---

## Decisions

- **Sí:** una sola spec para `games` + `scores` en vez de dos. Razón: confirmado por el usuario — `scores` depende de `games` (foreign key), separarlas hubiera forzado una migración a medias.
- **Sí:** `id text PRIMARY KEY` en `games` reusando los slugs actuales (`rocas`, `caida`, etc.) en vez de `uuid`. Razón: confirmado por el usuario — no rompe las rutas `/juego/[id]` y `/jugar/[id]` que ya usan estos slugs en la URL.
- **Sí:** lectura desde Server Components (`lib/queries.ts` + `lib/supabase/server.ts`) en vez de fetch desde el cliente. Razón: confirmado por el usuario — patrón Next 16 App Router, no expone lógica de queries al bundle del cliente.
- **Sí:** `/salon` y `/jugar/[id]` se dividen en Server Component (fetch/resolución de datos) + Client Component nuevo (interactividad: tabs, canvas, modal). Razón: son las dos pantallas que hoy son 100% cliente pero necesitan datos async de Supabase; dividirlas es la única forma de mantener la interactividad actual (cambio de tab instantáneo, `useImperativeHandle` del canvas) sin refetch de red en cada click.
- **Sí:** guardar score vía Server Action (`lib/actions.ts`) en vez de insert directo desde el cliente. Razón: confirmado por el usuario.
- **Sí:** `best`/`plays` quedan como columnas fijas seedeadas, no calculadas en vivo. Razón: confirmado por el usuario — no fue pedido y agrega queries agregadas nuevas sin necesidad clara todavía.
- **No (por ahora):** configurar RLS/policies en `games`/`scores`. Razón: confirmado por el usuario — la seguridad de acceso se resuelve en una spec futura dedicada; por ahora ambas tablas quedan con RLS deshabilitado (acceso abierto vía anon key).
- **No:** migrar los 7 juegos placeholder (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) a la tabla `games`. Razón: confirmado por el usuario — solo `rocas` es un juego real; al borrar el array local, los placeholders desaparecen de la UI en vez de migrarse como filas sin lógica real detrás.
- **No:** Supabase Auth real ligando scores a un `user_id`. Razón: confirmado por el usuario — spec 04 ya dejó auth real fuera de scope explícitamente; se mantiene `name` como string libre, igual que hoy.
- **No:** migrar los datos de `av_scores` en localStorage hacia la tabla `scores`. Razón: son datos mock random generados por sesión de browser, no hay valor real en preservarlos.
- **No:** recalcular `best`/`plays` en vivo. Razón: ver decisión de arriba — confirmado explícitamente por el usuario como fuera de scope.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| `games`/`scores` sin RLS: cualquiera con la anon key puede `select`/`insert`/`update`/`delete` sin restricción (incluso borrar el catálogo de juegos o falsificar/alterar scores ajenos) | Aceptado explícitamente por el usuario como decisión temporal — la config de RLS/policies queda para una spec futura de seguridad, referenciada explícitamente en "out of scope". |
| Sin validación de rango ni anti-cheat sobre `scores.score` | Aceptado explícitamente — mismo nivel de confianza que el `localStorage` actual, que tampoco validaba nada. Si se necesita anti-cheat, es una spec futura. |
| Dividir `/salon` y `/jugar/[id]` en Server+Client Component puede introducir un mismatch de props si el Server Component no pasa exactamente la forma de dato que el Client Component espera | El paso 8 y 9 del plan definen explícitamente qué props recibe cada Client Component (`games`, `scoresByGame`, `game`); se verifica en cada acceptance criterion correspondiente antes de dar la spec por cumplida. |
| `getAllTopScores` hace una consulta por juego (8 queries) en cada carga de `/salon` — no es la consulta más eficiente posible | Aceptado para este tamaño de dataset (8 juegos); optimizar a una sola query con `row_number() over (partition by game_id)` queda como mejora futura si el dataset crece. |

---

## What is **not** in this spec

- Configuración de RLS/policies en `games`/`scores`.
- Migración de los 7 juegos placeholder a la tabla `games`.
- Supabase Auth real / `user_id` en scores.
- Cálculo en vivo de `best`/`plays` desde `scores`.
- Panel de administración de `games`.
- Migración de datos de `av_scores` en localStorage.
- Anti-cheat / validación de rango sobre scores insertados.

Cada uno de estos, si se necesita, va en su propia spec.
