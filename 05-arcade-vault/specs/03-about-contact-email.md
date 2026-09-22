# SPEC 03 — About + Envío de Correo (`/about`)

> **Status:** Approve
> **Depends on:** SPEC 01
> **Date:** 2026-09-17
> **Objective:** Crear la ruta `/about` adaptando `references/templates/home-about/about.jsx` tal cual (sección About + formulario de contacto), conectando el formulario a un endpoint que envía el correo real con Resend.

---

## Scope

**In:**

- Ruta `/about` (`app/about/page.tsx`, `"use client"`): portar `about.jsx` exactamente igual — hero About (kicker, título, misión, 3 highlights con iconos SVG), divider animado, sección de contacto (intro + tips + form).
- Componente `HighlightIcon` (HEART, BROWSER, PLANT) igual que en el template.
- Hook de reveal (`useReveal`/IntersectionObserver), reutilizando el mismo patrón de spec 02 en vez de duplicar código si aplica.
- Formulario de contacto: mismos 3 campos (nombre, correo, mensaje), misma validación cliente (shake si falta algún campo), mismo estado de éxito "terminal" tras enviar.
- Nuevo estado de error en el form (no existe en el template): si el POST al endpoint falla, mostrar mensaje de error bajo el form + botón "Reintentar", sin perder los datos escritos.
- Endpoint `app/api/contact/route.ts` (Route Handler, `POST`): recibe `{ name, email, msg }`, envía correo real vía Resend usando el SDK `resend`.
- Dependencia nueva: paquete `resend` (npm).
- Variables de entorno nuevas en `.env.example`: `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` (placeholder `contacto@arcadevault.com`), `CONTACT_EMAIL` (placeholder, destino de los mensajes).
- Link "Acerca de" nuevo en `components/Nav.tsx` (desktop y panel mobile), activo cuando `pathname === "/about"`.
- CSS: portar de `styles.css` las reglas usadas por `about.jsx` (`.about-hero`, `.highlight-row`, `.about-divider`, `.about-contact`, `.contact-grid`, `.contact-form`, `.terminal-success`, etc.) a `app/globals.css`, si no existen ya.

**Out of scope (para otra spec):**

- Verificación real del dominio en Resend (`arcadevault.com` queda como placeholder en `.env.example`; el usuario lo reemplaza por su dominio verificado cuando lo tenga).
- Guardar los mensajes de contacto en base de datos o CMS — solo se envían por correo, no se persisten.
- Rate limiting / anti-spam (captcha, honeypot) en el endpoint.
- Notificación de confirmación al remitente (correo de "recibimos tu mensaje" al usuario que llenó el form) — solo se envía el correo al equipo (`CONTACT_EMAIL`).
- Internacionalización, tests automatizados.

---

## Data model

No introduce estructuras de datos persistentes ni cambios en `lib/data.ts`.

Payload del endpoint (no persistido, solo pasa por memoria):

```ts
type ContactPayload = { name: string; email: string; msg: string };
```

Variables de entorno (`.env.example`):

```
RESEND_API_KEY=re_placeholder
CONTACT_FROM_EMAIL=contacto@arcadevault.com
CONTACT_EMAIL=equipo@arcadevault.com
```

---

## Implementation plan

1. `npm install resend`.
2. Agregar `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_EMAIL` a `.env.example` (crear el archivo si no existe) con valores placeholder.
3. Agregar en `app/globals.css` las reglas CSS de `references/templates/home-about/styles.css` usadas por `about.jsx` que todavía no existan en el proyecto.
4. Crear `app/api/contact/route.ts`:
   - `POST` recibe JSON `{ name, email, msg }`.
   - Valida que los 3 campos vengan no vacíos (400 si falta alguno).
   - Instancia `new Resend(process.env.RESEND_API_KEY)` y llama `resend.emails.send({ from: process.env.CONTACT_FROM_EMAIL, to: process.env.CONTACT_EMAIL, subject: ..., reply_to: email, text/html: ... })` incluyendo `name`, `email`, `msg` en el cuerpo.
   - Devuelve `200` con `{ ok: true }` en éxito, `500` con `{ ok: false, error }` si Resend falla.
5. Crear `app/about/page.tsx` (`"use client"`) portando `about.jsx`:
   - Mismo JSX/estructura (hero, highlights, divider, contacto).
   - `onSubmit` pasa de simular (`setSent` directo) a: validar campos → `fetch("/api/contact", { method: "POST", body: JSON.stringify(form) })` → si `ok`, `setSent(form.name.trim())`; si falla (status no-2xx o network error), `setError(true)` sin borrar `form`.
   - Nuevo bloque de UI: si `error` es true y no `sent`, mostrar mensaje rojo bajo el form ("No se pudo enviar. Intenta de nuevo.") + botón "Reintentar" que limpia el error y deja el form editable (no reintenta automáticamente, el usuario vuelve a dar submit).
   - `HighlightIcon` como función interna del archivo, igual que el template.
6. Editar `components/Nav.tsx`: agregar `Link href="/about"` con texto "Acerca de" en `.links` (desktop) y en el panel mobile, `isActive` incluyendo `"about"` como nueva opción (`pathname === "/about"`).
7. Verificar `npm run build` y `npm run lint`.

---

## Acceptance criteria

- [ ] `/about` carga y muestra hero, 3 highlights (HEART/BROWSER/PLANT), divider animado y sección de contacto.
- [ ] Las secciones `.reveal` reciben la clase `in` al hacer scroll (IntersectionObserver funcionando).
- [ ] Enviar el form con algún campo vacío dispara el shake y no llama al endpoint.
- [ ] Enviar el form completo hace `POST /api/contact` y, si Resend responde OK, muestra el estado "terminal" de éxito con el nombre en mayúsculas.
- [ ] Si `POST /api/contact` falla (simulando `RESEND_API_KEY` inválida o red caída), el form muestra el mensaje de error + botón "Reintentar", y los datos escritos no se pierden.
- [ ] `/api/contact` responde `400` si falta algún campo del payload.
- [ ] `/api/contact` usa `resend.emails.send` con `from` = `CONTACT_FROM_EMAIL`, `to` = `CONTACT_EMAIL`, `reply_to` = correo del usuario del form.
- [ ] `.env.example` incluye `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_EMAIL` con placeholders.
- [ ] El Nav muestra un link "Acerca de" que navega a `/about` y queda activo solo en esa ruta, en desktop y en el panel mobile.
- [ ] `/`, `/inicio` y demás rutas existentes siguen funcionando igual, sin cambios de comportamiento.
- [ ] `npm run build` y `npm run lint` pasan sin errores.

---

## Decisions

- **Sí:** portar `about.jsx` tal cual pidió el usuario, sin rediseñar la sección About/highlights/divider. Razón: pedido explícito de seguir el template exactamente igual.
- **Sí:** usar `resend` (SDK oficial) en un Route Handler propio en vez de un servicio de formularios de terceros. Razón: pedido explícito del usuario ("vamos a utilizar resend").
- **Sí:** agregar estado de error en el form, ausente en el template original. Razón: el template solo simula el envío (`setSent` directo, sin red); con red real un fallo silencioso dejaría al usuario sin saber si su mensaje llegó.
- **Sí:** `CONTACT_FROM_EMAIL` y `CONTACT_EMAIL` como placeholders en `.env.example`, no valores reales. Razón: el usuario no tiene todavía un dominio verificado en Resend ni confirmó el correo destino real.
- **No:** correo de confirmación al remitente. Razón: no fue pedido, agrega otra plantilla de correo y otro camino de fallo; queda para otra spec si se necesita.
- **No:** persistir los mensajes de contacto en base de datos. Razón: no fue pedido; el flujo pedido es solo "envío de correo electrónico".
- **No:** rate limiting/captcha. Razón: fuera de alcance del pedido original, es un endpoint público nuevo y merece su propia spec de seguridad si se decide agregar.
- **Sí:** Client Component (`"use client"`) para `/about`. Razón: usa `useState`/`useEffect` (form, IntersectionObserver) igual que `/inicio` en spec 02.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| `RESEND_API_KEY` placeholder en `.env.example` hace que el envío real falle hasta que el usuario ponga su key real | El estado de error del form cubre este caso; se documenta en la confirmación de la spec que hay que llenar las env vars reales. |
| Dominio `arcadevault.com` no verificado en Resend rechaza el envío en producción | Placeholder explícito en `.env.example`; el usuario debe reemplazarlo por su dominio verificado antes de ir a producción. |
| Clases CSS portadas de `about.jsx` (`.about-*`, `.contact-*`, `.terminal-success`) colisionan con clases ya definidas en `app/globals.css` | Revisar nombres antes de pegar, igual que se hizo en spec 02. |

---

## What is **not** in this spec

- Verificación de dominio real en Resend.
- Persistencia de mensajes de contacto en base de datos.
- Rate limiting / anti-spam en el endpoint.
- Correo de confirmación automático al remitente.
- Internacionalización, tests automatizados.

Cada uno de estos, si se necesita, va en su propia spec.
