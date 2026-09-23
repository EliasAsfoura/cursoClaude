# SPEC 04 — Setup base de Supabase

> **Status:** Approved
> **Depends on:** ninguno
> **Date:** 2026-09-23
> **Objective:** Instalar y configurar los clientes de Supabase (browser y server) para Next.js App Router, sin cambiar el comportamiento de ninguna pantalla existente.

---

## Scope

**In:**

- Dependencias nuevas: `@supabase/supabase-js`, `@supabase/ssr`.
- `lib/supabase/client.ts`: cliente browser (`createBrowserClient`), para Client Components.
- `lib/supabase/server.ts`: cliente server (`createServerClient` con manejo de cookies vía `next/headers`), para Server Components y Route Handlers.
- Variables de entorno nuevas en `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (placeholders).
- `.env.local` con los valores reales del proyecto Supabase ya provisionado (URL y anon key obtenidos vía MCP), archivo ya cubierto por `.gitignore` (`.env*`).

**Out of scope (para otra spec):**

- Supabase Auth real (reemplazar `av_user`/`localStorage` en `/auth`).
- Tablas de juegos/scores en Postgres (reemplazar `lib/data.ts`, `seededScores`, `av_scores`).
- Row Level Security, políticas, migraciones de schema.
- Cualquier endpoint o pantalla que consuma datos de Supabase (health check incluido).
- Middleware de refresco de sesión.

---

## Data model

No introduce tablas ni estructuras de datos. Solo configuración de clientes.

Variables de entorno (`.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

---

## Implementation plan

1. `npm install @supabase/supabase-js @supabase/ssr`.
2. Agregar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` a `.env.example` con placeholders.
3. Crear/actualizar `.env.local` (gitignored) con la URL y anon key reales del proyecto Supabase ya provisionado.
4. Crear `lib/supabase/client.ts`: exporta `createClient()` que llama `createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)`.
5. Crear `lib/supabase/server.ts`: exporta `createClient()` async que llama `createServerClient(...)` leyendo/escribiendo cookies vía `cookies()` de `next/headers`, siguiendo el patrón oficial de `@supabase/ssr` para App Router.
6. Verificar `npm run build` y `npm run lint`.

---

## Acceptance criteria

- [ ] `@supabase/supabase-js` y `@supabase/ssr` aparecen en `package.json` (`dependencies`).
- [ ] `lib/supabase/client.ts` exporta un cliente Supabase instanciable desde un Client Component sin lanzar error.
- [ ] `lib/supabase/server.ts` exporta un cliente Supabase instanciable desde un Server Component o Route Handler sin lanzar error.
- [ ] `.env.example` incluye `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con placeholders.
- [ ] `.env.local` existe con los valores reales y no se sube a git (`.env*` ya está en `.gitignore`).
- [ ] Ninguna pantalla existente (`/`, `/inicio`, `/about`, `/auth`, `/salon`, `/juego/[id]`, `/jugar/[id]`) cambia de comportamiento.
- [ ] `npm run build` y `npm run lint` pasan sin errores.

---

## Decisions

- **Sí:** `@supabase/ssr` además de `@supabase/supabase-js`. Razón: Next 16 App Router necesita manejo de cookies para sesión server-side; sin esto, specs futuras de auth tendrían que migrar el cliente de nuevo.
- **Sí:** dos archivos de cliente separados (`client.ts`, `server.ts`) en vez de uno solo. Razón: patrón oficial de Supabase para App Router; un cliente browser no puede leer/escribir cookies HTTP-only del request.
- **Sí:** llenar `.env.local` con valores reales ahora (vía MCP), no solo placeholders. Razón: el proyecto Supabase ya existe y está vacío; no hay motivo para bloquear specs futuras por falta de credenciales.
- **No:** auth real, tablas de scores, RLS, middleware de sesión. Razón: pedido explícito del usuario de mantener esta spec en "solo setup base"; cada uno amerita su propia spec por el tamaño de decisiones que implica (método de login, schema de datos, políticas de seguridad).
- **No:** endpoint de health check. Razón: sin tablas aún no hay nada real que consultar; el criterio de verificación es que los clientes se instancien sin error y el build pase.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Proyecto Supabase vacío hoy; specs futuras (auth, scores) requieren decisiones de schema no tomadas aquí | Documentado explícitamente en "out of scope"; cada feature futura es su propia spec. |
| `.env.local` con credenciales reales podría subirse a git por error | `.env*` ya está en `.gitignore` desde antes de esta spec; se verifica que no aparezca en `git status` tras crearlo. |

---

## What is **not** in this spec

- Supabase Auth real.
- Tablas de juegos/scores, RLS, migraciones.
- Health check / endpoint de prueba de conexión.
- Middleware de refresco de sesión.

Cada uno de estos, si se necesita, va en su propia spec.
