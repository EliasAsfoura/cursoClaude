# SPEC 02 — Home / Landing (`/inicio`)

> **Status:** Implemented
> **Depends on:** SPEC 01
> **Date:** 2026-09-16
> **Objective:** Crear la ruta `/inicio` con la landing page de marketing adaptada de `references/templates/home-about/home.jsx`, reutilizando datos y componentes de spec 01, sin tocar la Biblioteca en `/`.

---

## Scope

**In:**

- Ruta `/inicio` (`app/inicio/page.tsx`, `"use client"`): landing con hero, sección "Por qué Arcade Vault", preview de 6 juegos, stats, actividad en vivo + top jugadores, precios/FAQ, CTA final.
- Componente `FloatingSilhouettes`: 8 SVGs decorativos pixel-art flotantes en el hero (idéntico a `home.jsx`).
- Hook `useReveal()`: IntersectionObserver que agrega clase `in` a elementos `.reveal` al entrar en viewport.
- Componente `MiniCard`: tarjeta pequeña de juego (cover + título + categoría) para el rail de preview, navega a `/juego/[id]`.
- Componente `FeatureIcon`: 4 iconos SVG pixel (GAMEPAD, FREE, TROPHY, ROCKET) para la sección de features.
- Sección "Actividad en Vivo": ticker de últimas puntuaciones y tabla de top 5 jugadores, generados con `seededScores()` (no hardcodeados como en el template).
- Botones de la landing navegan a rutas reales: Biblioteca → `/`, Auth → `/auth`, detalle de juego → `/juego/[id]`, Salón → `/salon`.
- Link "Inicio" nuevo en `components/Nav.tsx` (desktop y panel mobile), activo cuando `pathname === "/inicio"`.
- CSS: portar las reglas de `home.jsx`/`styles.css` relacionadas (`.home-hero`, `.home-silos`, `.home-section`, `.feature-grid`, `.mini-rail`, `.mini-card`, `.home-stats`, `.activity-grid`, `.pricing-grid`, `.home-final`, etc.) a `app/globals.css`, ya que no existen todavía.

**Out of scope (for future specs):**

- Página `/about` (`references/templates/home-about/about.jsx`) — no fue pedida, queda para otra spec.
- Cambiar `/` (Biblioteca) o mover cualquier ruta existente de spec 01.
- Puntajes reales del jugador logueado mezclados en el ticker o top jugadores de esta landing (sigue siendo mock, igual que en spec 01).
- Internacionalización, tests automatizados.

---

## Data model

No introduce estructuras nuevas. Reutiliza de `lib/data.ts` (spec 01):

- `GAMES` (para preview de 6 juegos vía `GAMES.slice(0, 6)` y sus `cover`/`title`/`cat`).
- `seededScores(seed, count)` para:
  - Ticker "Últimas puntuaciones": 7 filas, una por juego, usando `seededScores(seed_del_juego, 1)[0]` de 7 juegos distintos de `GAMES`, mostrando `game.title`, `row.name`, `row.score`, `row.date` (reemplaza el "hace X min" del template, que no existe en `ScoreRow`).
  - Top jugadores "Hoy": `seededScores(999, 5)` como tabla única global (no por juego), mostrando `rank`, `name`, `score`.

---

## Implementation plan

1. Agregar en `app/globals.css` las reglas CSS de `references/templates/home-about/styles.css` usadas por `home.jsx` (clases listadas en Scope) que todavía no existen en el proyecto.
2. Crear `app/inicio/page.tsx` (`"use client"`) portando la estructura de `home.jsx`:
   - `FloatingSilhouettes`, `useReveal`, `MiniCard`, `FeatureIcon` como funciones/componentes internos del archivo (igual que en el template).
   - Reemplazar `navigate({ name: ... })` por `useRouter().push(...)` de `next/navigation`, mapeando `biblioteca` → `/`, `auth` → `/auth`, `detalle` con `id` → `/juego/${id}`, `salon` → `/salon`.
   - Reemplazar el array hardcodeado del ticker por 7 filas derivadas de `seededScores` sobre `GAMES` (ver Data model).
   - Reemplazar el array hardcodeado de top jugadores por `seededScores(999, 5)`.
   - Sección de precios y FAQ se copia igual (contenido estático, sin dependencias de datos).
3. Editar `components/Nav.tsx`: agregar `Link href="/inicio"` en `.links` (desktop) y en el panel mobile, con `isActive` incluyendo `"inicio"` como nueva opción de `name` (`pathname === "/inicio"`).
4. Verificar `npm run build` y `npm run lint`.

---

## Acceptance criteria

- [ ] `/inicio` carga y muestra las 7 secciones: hero, features, preview de juegos, stats, actividad en vivo, precios, CTA final.
- [ ] El hero muestra los 8 SVGs de `FloatingSilhouettes` flotando con animación.
- [ ] Las secciones con clase `.reveal` reciben la clase `in` al hacer scroll hasta ellas (IntersectionObserver funcionando).
- [ ] El rail de preview muestra 6 `MiniCard` de `GAMES` y cada click navega a `/juego/[id]` con el `id` correcto.
- [ ] Botón "EXPLORAR JUEGOS" navega a `/`.
- [ ] Botón "CREAR CUENTA" y "EMPEZAR GRATIS" navegan a `/auth`.
- [ ] Botón "VER TODOS LOS JUEGOS" y "INSERTAR MONEDA" (CTA final) navegan a `/`.
- [ ] Botón "VER SALÓN" navega a `/salon`.
- [ ] El ticker de actividad muestra 7 filas con nombre de juego real de `GAMES`, jugador y puntaje generados por `seededScores`.
- [ ] La tabla de top jugadores muestra 5 filas ordenadas por puntaje descendente desde `seededScores(999, 5)`.
- [ ] El Nav muestra un link "Inicio" que navega a `/inicio` y queda marcado activo solo en esa ruta, en desktop y en el panel mobile.
- [ ] `/` (Biblioteca) sigue funcionando exactamente igual que en spec 01, sin cambios de comportamiento.
- [ ] `npm run build` y `npm run lint` pasan sin errores.

---

## Decisions

- **Sí:** nueva ruta `/inicio` en vez de reemplazar `/`. Razón: `/` ya es Biblioteca funcional con criterios de aceptación cumplidos en spec 01; reemplazarla rompería esa spec sin necesidad.
- **Sí:** ticker y top jugadores generados con `seededScores()` en vez de copiar el hardcode del template. Razón: mantiene consistencia con el resto del proyecto (mismo mecanismo determinista que Detalle y Salón), evita nombres/puntajes que no corresponden a los 8 juegos reales de `lib/data.ts`.
- **No:** relative time ("hace 2 min") en el ticker. Razón: `ScoreRow` no tiene ese campo; se muestra `date` (`DD/MM/AAAA`) como en el resto del proyecto en vez de inventar un campo nuevo.
- **Sí:** agregar link "Inicio" al Nav. Razón: sin link, la ruta queda inalcanzable desde la UI.
- **No:** portar `about.jsx`. Razón: no fue pedido; el pedido fue explícitamente sobre `home.jsx`.
- **Sí:** Client Component (`"use client"`). Razón: usa `useEffect` (IntersectionObserver) y handlers de navegación por click.

---

## Risks

| Risk                                                        | Mitigation                                                                 |
| ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Clases CSS del template pisan estilos ya usados en `/`, `/juego`, etc. | Revisar que los nombres portados (`.home-*`, `.mini-*`, `.feature-*`) no colisionen con clases ya definidas en `app/globals.css` antes de pegarlas. |
| IntersectionObserver no soportado / SSR mismatch             | Hook corre solo en `useEffect` del lado cliente, igual que el template original. |

---

## What is **not** in this spec

- Página `/about`.
- Cambios a `/` (Biblioteca) o cualquier ruta de spec 01.
- Mezcla de puntajes reales del usuario en ticker/top jugadores.
- Internacionalización, tests automatizados.

Cada uno de estos, si se necesita, va en su propia spec.
