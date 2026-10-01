# SPEC 12 — Registro, login y autenticación con Supabase Auth

> **Status:** Approved
> **Depends on:** SPEC 04, SPEC 06
> **Date:** 2026-09-30
> **Objective:** Reemplazar el login falso de `/auth` por Supabase Auth real (email+contraseña, Google y GitHub, recuperar contraseña) y ligar cada score guardado al usuario autenticado.

---

## Why this spec exists

Hoy `/auth` solo escribe `{ name }` en `localStorage` (`av_user`) y cualquiera puede guardar scores con cualquier nombre. `scores` tiene RLS desactivado. Sin identidad real el leaderboard no tiene valor competitivo.

---

## Scope

**In:**

- Supabase Auth con email+contraseña: registro (username + email + contraseña) y login (email + contraseña) en `/auth`, mismas pestañas y estética actual.
- Confirmación de email **desactivada** en el proyecto Supabase: registrarse deja la sesión iniciada.
- Username guardado en `user_metadata.username` (en `signUp` vía `options.data`). Sin unicidad. Validación: solo no vacío (trim); contraseña con el mínimo de Supabase (6).
- OAuth real con Google y GitHub (`signInWithOAuth`), con ruta `app/auth/callback/route.ts` que intercambia el `code` por sesión (`exchangeCodeForSession`). Username OAuth = `user_name` (GitHub) / `name` (Google) del proveedor, recortado a 16 chars en mayúsculas, escrito en `user_metadata.username` en el callback si no existe.
- Recuperar contraseña: enlace "¿Olvidaste tu contraseña?" en login → `/auth/recuperar` (pide email, `resetPasswordForEmail` con `redirectTo` al callback) → `/auth/nueva-contrasena` (form nueva contraseña, `updateUser({ password })`).
- `proxy.ts` (Next 16, ex-middleware) en la raíz: refresca la sesión de Supabase en cada request (patrón `@supabase/ssr`). Si hay sesión y la ruta es `/auth` o `/auth/recuperar` → redirige a `/`.
- Sesión en cliente: hook `useAuthUser()` en `lib/auth.ts` (`onAuthStateChange` + `getUser`) que reemplaza `getUser`/`subscribeUser` de `lib/storage.ts` en `Nav`, `HallOfFameClient` y `GamePlayerClient`. Logout en `Nav` = `supabase.auth.signOut()`.
- `lib/storage.ts`: se eliminan `User`, `getUser`, `setUser`, `clearUser`, `subscribeUser`, `getUserServerSnapshot`. Se borra la clave `av_user` una vez al cargar (limpieza de legado). Skins no cambian.
- Scores ligados a usuario:
  - Migración: `scores.user_id uuid null references auth.users(id) on delete set null`.
  - RLS activado en `scores`: `select` para `anon` y `authenticated`; `insert` solo `authenticated` con `auth.uid() = user_id`. Sin update/delete.
  - `saveScoreAction(gameId, score)`: obtiene el usuario con `supabase.auth.getUser()` en servidor; si no hay sesión devuelve error; `name` = `user_metadata.username` (nunca del cliente).
- Invitados: juegan libre. En el modal de fin de partida sin sesión: botón "INICIA SESIÓN PARA GUARDAR" → `/auth?next=/jugar/<id>`; no se guarda el score.
- `?next=` en `/auth`: tras login/registro/OAuth redirige a `next` (solo rutas internas que empiezan con `/`), si no a `/`.
- Estados de UI: botón submit deshabilitado + "CARGANDO…" mientras espera; errores de Supabase traducidos a español en un bloque bajo el form (credenciales inválidas, email ya registrado, contraseña corta, error de red); mensaje de éxito en `/auth/recuperar` ("Revisa tu correo").

**Out of scope (para otra spec):**

- Unicidad de username / tabla `profiles` / login por username.
- Editar perfil o username.
- "Tu posición" real en `/salon` (sigue el mock actual, solo cambia la fuente del usuario).
- RLS en `games`.
- Borrar o migrar scores históricos (quedan con `user_id = null`).
- Confirmación de email obligatoria, 2FA, otros proveedores OAuth.
- Rutas protegidas además de la redirección de `/auth` con sesión.

---

## Data model

Migración Supabase (`apply_migration`, nombre `scores_user_id_rls`):

```sql
alter table scores add column user_id uuid null references auth.users(id) on delete set null;
alter table scores enable row level security;
create policy "scores_select_all" on scores for select to anon, authenticated using (true);
create policy "scores_insert_own" on scores for insert to authenticated with check (auth.uid() = user_id);
```

TS:

```ts
// lib/auth.ts
export type AuthUser = { id: string; email: string | null; username: string };
export function useAuthUser(): AuthUser | null; // null = sin sesión o cargando

// lib/data.ts
type ScoreRow = { /* ...campos existentes */ user_id: string | null };

// lib/actions.ts
saveScoreAction(gameId: string, score: number): Promise<{ ok: true } | { ok: false; error: "no-session" | "db" }>;
```

Convenciones:

- `username` sale de `user_metadata.username`; fallback `email` antes de `@` en mayúsculas.
- Callback OAuth / reset: `${origin}/auth/callback?next=...`.

---

## Implementation plan

1. Config Supabase (dashboard, manual, documentado en README): desactivar "Confirm email"; agregar `http://localhost:3000/auth/callback` (y URL prod) a Redirect URLs; crear apps OAuth en Google Cloud y GitHub (Settings → Developer settings → OAuth Apps) y cargar client id/secret en Supabase. Sin cambios de código.
2. Migración `scores_user_id_rls` vía Supabase MCP. Actualizar `ScoreRow`. Prueba: leaderboard sigue leyendo; insert anónimo falla.
3. `proxy.ts` con refresco de sesión (leer `node_modules/next/dist/docs/` sobre proxy antes). Quitar comentario obsoleto de `lib/supabase/server.ts`. Prueba: la app navega igual.
4. `lib/auth.ts` (`useAuthUser`). Reemplazar uso de `lib/storage` en `Nav`, `HallOfFameClient`, `GamePlayerClient`; logout con `signOut`. Limpiar `lib/storage.ts` y borrar `av_user`. Prueba: sin sesión Nav muestra "ENTRAR".
5. `/auth` registro + login email reales con estados de carga, errores en español y `?next`. Prueba: registrar, ver username en Nav, logout, login.
6. `app/auth/callback/route.ts` + botones Google/GitHub con `signInWithOAuth`. Escribir username del proveedor si falta. Prueba: login con cada proveedor.
7. `/auth/recuperar` y `/auth/nueva-contrasena`. Prueba: email llega, link lleva a nueva contraseña, login con la nueva.
8. Redirección de `/auth` y `/auth/recuperar` a `/` con sesión en `proxy.ts`.
9. `saveScoreAction` con usuario del servidor + modal de `GamePlayerClient`: con sesión guarda; sin sesión botón "INICIA SESIÓN PARA GUARDAR" con `next`. Prueba: score aparece con `user_id` y username.
10. `.env.example`/README: documentar pasos de config del paso 1. `npm run build` y `npm run lint`.

---

## Acceptance criteria

- [ ] Registro con username+email+contraseña crea usuario en Supabase Auth con `user_metadata.username` y deja la sesión iniciada sin confirmar email.
- [ ] Login con email+contraseña correctos inicia sesión; incorrectos muestran "Email o contraseña incorrectos" sin recargar.
- [ ] Registro con email existente muestra error en español.
- [ ] Botón Google y botón GitHub inician sesión real y vuelven a la app con el username del proveedor en el Nav.
- [ ] "¿Olvidaste tu contraseña?" envía email; el link abre `/auth/nueva-contrasena`; tras cambiarla se puede entrar con la nueva.
- [ ] La sesión sobrevive a recargar la página y a cerrar/reabrir la pestaña.
- [ ] Logout en Nav cierra sesión y el Nav vuelve a "ENTRAR".
- [ ] Con sesión, visitar `/auth` redirige a `/`.
- [ ] `/auth?next=/jugar/snake` redirige a `/jugar/snake` tras login; `next=https://otro.com` se ignora y va a `/`.
- [ ] Sin sesión se puede jugar; al terminar, el modal muestra "INICIA SESIÓN PARA GUARDAR" y no se inserta score.
- [ ] Con sesión, el score se inserta con `user_id` = usuario y `name` = su username.
- [ ] Insert en `scores` con la anon key sin sesión, o con `user_id` ajeno, es rechazado por RLS.
- [ ] Leaderboards de `/juego/[id]` y `/salon` siguen mostrando scores históricos.
- [ ] `av_user` no existe en localStorage tras cargar la app; ningún archivo importa `getUser`/`setUser` de `lib/storage`.
- [ ] Botones de submit se deshabilitan mientras la petición está en curso.
- [ ] `npm run build` y `npm run lint` pasan sin errores.

---

## Decisions

- **Sí:** Supabase Auth email+contraseña. Razón: Supabase y `@supabase/ssr` ya están; sesión real por cookies.
- **Sí:** username en `user_metadata`. Razón: elegido por el usuario; simple. **No:** tabla `profiles` (unicidad/búsqueda), aceptando nombres duplicados.
- **Sí:** login por email. Razón: con metadata no se puede buscar por username.
- **No:** confirmación de email. Razón: SMTP de Supabase limitado (~2 emails/h); registro instantáneo.
- **Sí:** OAuth Google+GitHub en esta misma spec. Razón: el usuario pidió incorporarlos y no dividir, pese a la recomendación de spec aparte.
- **Sí:** GitHub en lugar de Discord (cambio posterior pedido por el usuario durante la implementación). **No:** Discord.
- **Sí:** username OAuth tomado del proveedor. **No:** pantalla "elige tu username" (spec futura de perfil).
- **Sí:** invitados juegan, guardar exige sesión. **No:** login obligatorio para jugar.
- **Sí:** `scores.user_id` nullable + RLS insert propio. Razón: conserva histórico y evita suplantar nombres. `name` se resuelve en servidor.
- **Sí:** `proxy.ts` para refrescar sesión. Razón: patrón oficial `@supabase/ssr`; Server Components no pueden escribir cookies.
- **Sí:** validación mínima de Supabase (pass ≥ 6, username no vacío). Razón: elegido por el usuario.
- **No:** "tu posición" real en `/salon`. Razón: no elegido; spec aparte.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| SMTP por defecto de Supabase limita emails de recuperación (~2/h) | Aceptado en dev; documentar SMTP propio (Resend ya existe) como mejora futura. |
| Apps OAuth mal configuradas (redirect URI) bloquean el merge | Paso 1 documenta URIs exactas; probar cada proveedor en el paso 6. |
| `proxy.ts` en Next 16 difiere del middleware clásico | Leer `node_modules/next/dist/docs/` antes, según `AGENTS.md`. |
| Activar RLS rompe lecturas existentes de `scores` | Policy `select` pública creada en la misma migración; verificar leaderboards tras paso 2. |
| Usernames duplicados en leaderboard | Aceptado (decisión metadata); `user_id` distingue internamente. |
| Open redirect vía `?next=` | Solo se aceptan valores que empiezan con `/` y no con `//`. |
| Flash de "ENTRAR" en el Nav mientras carga la sesión | `useAuthUser` devuelve null mientras carga; aceptado. |

---

## What is **not** in this spec

- Tabla `profiles`, unicidad o edición de username.
- "Tu posición" real en `/salon`.
- RLS en `games`.
- Confirmación de email, 2FA, más proveedores OAuth.
- Rutas protegidas más allá de redirigir `/auth` con sesión.

Cada uno de estos, si se necesita, va en su propia spec.
