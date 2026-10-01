# SPEC 13 — Seguridad Supabase: resolver advisors del checklist

> **Status:** Approved
> **Depends on:** SPEC 04, SPEC 12
> **Date:** 2026-09-30
> **Objective:** Resolver los 3 avisos de seguridad de `references/security/security-checklist.md` (2 de `rls_auto_enable()` SECURITY DEFINER expuesta, 1 de leaked password protection) o dejarlos documentados como riesgo aceptado cuando el plan Free lo impide.

---

## Why this spec exists

El linter de Supabase (`get_advisors`) reporta 3 WARN de categoría SECURITY:

1. `anon_security_definer_function_executable`: `anon` puede ejecutar `public.rls_auto_enable()` vía `/rest/v1/rpc/rls_auto_enable`.
2. `authenticated_security_definer_function_executable`: lo mismo para `authenticated`.
3. `auth_leaked_password_protection`: Auth no verifica contraseñas contra HaveIBeenPwned.

`rls_auto_enable()` no es un RPC de la app: es la función del event trigger `ensure_rls` (verificado en BD), que activa RLS en cada tabla nueva de `public`. Es `SECURITY DEFINER` con `search_path = pg_catalog`. Los event triggers corren con los privilegios del dueño, así que no necesitan `EXECUTE` para `anon`/`authenticated`/`public`. Revocarlo cierra la exposición sin romper el auto-enable de RLS.

El proyecto está en plan **Free**: "Prevent use of leaked passwords" es feature de plan Pro y no se puede activar.

---

## Scope

**In:**

- Migración `revoke_execute_rls_auto_enable`: `revoke execute on function public.rls_auto_enable() from public, anon, authenticated`.
- Verificación de que el event trigger `ensure_rls` sigue activando RLS al crear una tabla de prueba en `public` (tabla temporal, borrada al terminar).
- Verificación de que `/rest/v1/rpc/rls_auto_enable` con la anon key ya no ejecuta la función (permiso denegado / 404).
- Re-ejecutar `get_advisors` (type `security`): los 2 WARN de la función desaparecen.
- Dejar el tercer aviso como **riesgo aceptado** (plan Free): registrar en `references/security/security-checklist.md` el estado de cada item (resuelto / aceptado) con fecha, y una nota en `README.md` (sección seguridad) con el paso manual a hacer si el proyecto pasa a Pro.
- Que la migración quede versionada en Supabase (`list_migrations`) y el SQL guardado en `supabase/migrations/` solo si el repo ya usa esa carpeta; si no, queda solo en el historial de Supabase.

**Out of scope (para otra spec):**

- Activar leaked password protection (requiere plan Pro).
- Subir el mínimo de contraseña de 6 a 8 u otras reglas de contraseña (decisión del usuario: solo checklist).
- Mover la función a otro schema o convertirla a `SECURITY INVOKER`.
- Auditoría completa de RLS de `games` u otras tablas (SPEC 12 ya dejó `games` fuera).
- Advisors de performance.
- Cambios de código de la app (Next.js).

---

## Data model

Esta spec no introduce estructuras de datos ni cambios de código de la app. Solo cambia privilegios sobre una función existente.

Migración (`apply_migration`, nombre `revoke_execute_rls_auto_enable`):

```sql
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
```

Formato del registro en `references/security/security-checklist.md` (sección añadida al final):

```md
## Estado (2026-09-30)

| Aviso | Estado | Nota |
| --- | --- | --- |
| anon_security_definer_function_executable | Resuelto | SPEC 13, revoke execute |
| authenticated_security_definer_function_executable | Resuelto | SPEC 13, revoke execute |
| auth_leaked_password_protection | Riesgo aceptado | Plan Free; reevaluar si pasa a Pro |
```

---

## Implementation plan

1. Baseline: `get_advisors` (security) y consulta de `has_function_privilege('anon'|'authenticated', 'public.rls_auto_enable()', 'execute')` para confirmar `true` hoy. Sin cambios.
2. Aplicar la migración `revoke_execute_rls_auto_enable` con Supabase MCP. Prueba: las dos consultas `has_function_privilege` devuelven `false`.
3. Probar el event trigger: `create table public._rls_probe (id int)`; comprobar `relrowsecurity = true` en `pg_class`; `drop table public._rls_probe`.
4. Probar el endpoint: `POST /rest/v1/rpc/rls_auto_enable` con la anon key devuelve error de permiso/404, no 200.
5. Re-ejecutar `get_advisors` (security): quedan solo `auth_leaked_password_protection` (aceptado) y ningún aviso de `rls_auto_enable`.
6. Documentar: sección "Estado" en `references/security/security-checklist.md` y nota en `README.md` (leaked password protection pendiente por plan Free + dónde activarla: Auth → Providers → Email → "Prevent use of leaked passwords").
7. Smoke test de la app: `/salon` y `/juego/[id]` cargan scores; login y guardado de score (SPEC 12) siguen funcionando.

---

## Acceptance criteria

- [ ] `has_function_privilege('anon', 'public.rls_auto_enable()', 'execute')` es `false`.
- [ ] `has_function_privilege('authenticated', 'public.rls_auto_enable()', 'execute')` es `false`.
- [ ] Llamar `/rest/v1/rpc/rls_auto_enable` con la anon key no ejecuta la función.
- [ ] Crear una tabla nueva en `public` sigue dejándola con RLS activado (event trigger `ensure_rls` intacto).
- [ ] `get_advisors` (security) ya no lista `anon_security_definer_function_executable` ni `authenticated_security_definer_function_executable`.
- [ ] `get_advisors` (security) lista como único aviso restante `auth_leaked_password_protection`.
- [ ] `references/security/security-checklist.md` tiene la tabla "Estado" con los 3 avisos y su resolución.
- [ ] `README.md` documenta que leaked password protection está pendiente por plan Free y cómo activarla.
- [ ] La migración aparece en `list_migrations`.
- [ ] Leaderboards de `/salon` y `/juego/[id]` cargan; login y guardado de score siguen funcionando.
- [ ] El diff del repo solo toca `references/security/security-checklist.md`, `README.md` (y la migración si el repo versiona `supabase/migrations/`); ningún archivo de `app/`, `components/` ni `lib/`.

---

## Decisions

- **Sí:** `REVOKE EXECUTE` de `public, anon, authenticated`. Razón: elegido por el usuario; cambio mínimo y reversible; el event trigger corre como dueño y no necesita esos grants. Incluir `public` porque `anon`/`authenticated` heredan de ese pseudo-rol y revocar solo a ellos no basta.
- **No:** mover la función a otro schema. Razón: obliga a recrear el event trigger; más invasivo para el mismo resultado.
- **No:** `SECURITY INVOKER`. Razón: el trigger necesita ejecutar `alter table ... enable row level security` con privilegios del dueño; con INVOKER puede fallar en silencio (el `EXCEPTION WHEN OTHERS` lo ocultaría).
- **Sí:** aceptar el riesgo de leaked password protection. Razón: el plan Free no permite activarla; el usuario eligió no compensar con reglas de contraseña extra.
- **No:** subir el mínimo de contraseña a 8. Razón: decisión del usuario, fuera del checklist.
- **Sí:** registrar el estado de cada aviso en el propio checklist. Razón: dejar traza de qué se resolvió y qué se aceptó, para no reabrirlo.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Revocar `EXECUTE` rompe el event trigger `ensure_rls` | Paso 3 crea una tabla de prueba y comprueba RLS activado; si falla, `grant execute ... to postgres` / revertir con `grant` explícito. |
| Contraseñas filtradas aceptadas en registro (Free) | Riesgo aceptado y documentado; reevaluar al pasar a Pro. Mínimo de 6 chars de SPEC 12 sigue vigente. |
| Tabla de prueba queda en `public` si el paso 3 se interrumpe | `drop table if exists public._rls_probe` al final y verificación con `list_tables`. |
| El linter cachea resultados (`cache_key`) y sigue mostrando avisos | Re-ejecutar `get_advisors` tras unos minutos; confirmar con `has_function_privilege` como fuente de verdad. |

---

## What is **not** in this spec

- Activar leaked password protection (requiere Pro).
- Nuevas reglas de contraseña.
- Mover o reescribir `rls_auto_enable()`.
- Auditoría de RLS de otras tablas o advisors de performance.
- Cambios en el código de la app.

Cada uno de estos, si se necesita, va en su propia spec.
