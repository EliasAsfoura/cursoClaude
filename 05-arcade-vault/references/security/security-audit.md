# Auditoría de seguridad — 2026-09-30
Alcance: completo (bd + app)

## Resumen
| Severidad | Nº |
| --- | --- |
| crítica | 1 |
| alta | 0 |
| media | 4 |
| baja | 4 |
| info | 3 |

## Hallazgos
| ID | Área | Severidad | Hallazgo | Evidencia | Remediación | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| BD-01 | BD | crítica | `public.games` sin RLS; `anon` y `authenticated` tienen INSERT/UPDATE/DELETE/TRUNCATE sobre ella. Cualquiera con la anon key puede modificar/borrar el catálogo vía PostgREST. | Advisor `rls_disabled_in_public` (ERROR, `games`); query pg_class: `games relrowsecurity=false`; `role_table_grants`: anon/authenticated `INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER` en `games`; migración `disable_rls_games_scores` | Habilitar RLS en `games` con policy SELECT (anon+authenticated) y revocar INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER a anon/authenticated | persistente (pendiente conocido de SPEC 12) |
| BD-02 | BD | baja | Grants excesivos en `scores` (UPDATE/DELETE/TRUNCATE/TRIGGER para anon/authenticated). Contenido por RLS (solo SELECT e INSERT policies), pero sin defensa en profundidad. | `role_table_grants` scores; `pg_policies` scores | `REVOKE UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES` en scores a anon/authenticated; revocar INSERT a anon | nuevo |
| BD-03 | BD | media | `scores` sin restricciones de datos en BD: `score` y `game_id` sin CHECK/FK verificados. Un usuario autenticado puede insertar directo vía PostgREST (saltando la server action) con score arbitrario y `name` libre (spoofing de nombre). La policy solo valida `user_id`. | `pg_policies`: `scores_insert_own` with_check `auth.uid() = user_id` (nada sobre name/score/game_id) | CHECK de score (rango), longitud de name, FK a games; idealmente insertar vía función/RPC o trigger que fije name desde metadata | nuevo |
| APP-01 | App | media | `saveScoreAction` sin tope superior de score, sin validar `gameId` (existe/regex/longitud), sin rate limit/anti-flood. | `lib/actions.ts:15` (solo `typeof`, `isFinite`, `>=0`) | Validar `gameId` contra `games`/regex, tope por juego, rate limit por usuario | nuevo |
| APP-02 | App | media | `/api/contact`: `request.json()` sin try/catch (400/500 no controlado con JSON inválido), sin validar formato de email ni longitud máxima, sin rate limit/captcha (spam vía Resend), y devuelve `error.message` interno de Resend al cliente. | `app/api/contact/route.ts:6`, `:9`, `:28` | try/catch, validar email/longitud, rate limit/captcha, mensaje genérico | nuevo |
| APP-03 | App | media | Sin headers de seguridad: no hay CSP, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy, Permissions-Policy; `poweredByHeader` no desactivado. | `next.config.ts:3-5` | Añadir `headers()` y `poweredByHeader: false` | nuevo |
| APP-04 | App | baja | `allowedDevOrigins` con IP de LAN en config (solo aplica a dev, pero no debe quedar en producción). | `next.config.ts:4` | Condicionar a `NODE_ENV==='development'` | nuevo |
| APP-05 | App | baja | Enumeración de usuarios: signup devuelve "Ese email ya está registrado". | `lib/auth-utils.ts:46-48,62` | Mensaje neutro / confirmación por email (trade-off UX) | nuevo |
| APP-06 | App | baja | Callback OAuth: `x-forwarded-host` confiado en no-dev para construir redirect (`https://${forwardedHost}`). Mitigado si la plataforma (Vercel) sobrescribe el header; `next` sí pasa por `safeNext`. | `app/auth/callback/route.ts:11-15` | Usar origin fijo desde env (`NEXT_PUBLIC_SITE_URL`) | nuevo |
| APP-07 | App | info | `name` en subject de email sin saneo de saltos de línea. Resend/SDK normalmente rechaza CRLF; validar igualmente al arreglar APP-02. | `app/api/contact/route.ts:23` | Quitar `\r\n` de name | nuevo |
| APP-08 | App | info | Dependencias: versiones modernas, sin paquetes sospechosos. No se pudo ejecutar `npm audit`. | `package.json` | Ejecutar `npm audit` manualmente | nuevo |

## Verificado OK
- Advisors: `rls_auto_enable` ya no reportado (resuelto, SPEC 13). `public.rls_auto_enable()`: `prosecdef=true`, `search_path=pg_catalog`, execute anon=false, authenticated=false.
- Event trigger `ensure_rls` existe, habilitado (`O`).
- `scores`: RLS activa; policies exactas esperadas (`scores_select_all` select anon+authenticated; `scores_insert_own` insert authenticated `auth.uid() = user_id`); sin update/delete. Sin `using(true)` en escritura.
- Migraciones `scores_user_id_rls` y `revoke_execute_rls_auto_enable` presentes; sin migraciones desconocidas.
- Extensiones instaladas: solo `pgcrypto`, `uuid-ossp`, `pg_stat_statements` (schema `extensions`), `supabase_vault`, `plpgsql`. Ninguna en `public`.
- Datos `scores`: 10 filas, 9 con `user_id` null (históricos, esperado), score 20–13845, sin `name` vacío, max len 12. Sin anomalías evidentes.
- Secrets: `.env*` en `.gitignore:34`; grep de `service_role`, `sk_`, `re_`, JWT en app/components/lib/public sin coincidencias; `.env.example` con placeholders; solo `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` públicas.
- `saveScoreAction`: usa `auth.getUser()` (`lib/actions.ts:12`), `name` resuelto en servidor (`:22`).
- `safeNext` bloquea `//`, `/\` y esquemas (`lib/auth-utils.ts:2-8`). Callback maneja `error_code`/`code` ausente.
- `proxy.ts`: `getUser()` refresca sesión, matcher excluye estáticos, preserva cookies en redirect.
- Cliente: sin `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `document.write`; localStorage solo para skin (`lib/storage.ts:11,33`) y limpieza de clave legacy.
- Logs de auth: no consultados (informativo).

## Riesgos aceptados (del checklist, no reabiertos)
| Aviso | Nota |
| --- | --- |
| auth_leaked_password_protection | Aceptado: plan Free; reevaluar si pasa a Pro (sigue activo en advisors) |

## Delta vs auditoría anterior
Primera auditoría (no existía informe previo). Contra checklist: `anon_/authenticated_security_definer_function_executable` siguen resueltos (no reaparecen). Nuevo respecto al checklist: `rls_disabled_in_public` en `games` (advisor ERROR) no figura en la tabla "Estado".

## Siguiente paso
/spec para: BD-01 (RLS + revoke en `games`, crítica), BD-03 y APP-01 (validación/anti-flood de scores), APP-02 (hardening `/api/contact`), APP-03 (headers de seguridad). Manual: `npm audit`.
