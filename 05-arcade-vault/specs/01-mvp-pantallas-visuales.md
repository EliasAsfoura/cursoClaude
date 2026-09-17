# SPEC 01 — MVP visual de Arcade Vault (pantallas sin lógica de juego)

> **Status:** Implemented
> **Depends on:** ninguno
> **Date:** 2026-09-16
> **Objective:** Construir las 5 pantallas de Arcade Vault (Biblioteca, Detalle, Jugar, Auth, Salón de la Fama) como Next.js App Router adaptando el diseño retro-arcade de `references/templates/`, sin implementar lógica de juego real.

---

## Scope

**In:**

- Ruta `/` — Biblioteca: hero, búsqueda por nombre, filtro por categoría (chips), grid de tarjetas de juego.
- Ruta `/juego/[id]` — Detalle: cover, tags, descripción, stats, leaderboard mock, botón "Jugar" hacia `/jugar/[id]`.
- Ruta `/jugar/[id]` — Pantalla de juego decorativa: marco CRT, HUD (vidas/nivel/puntaje), arena animada con CSS, modal de "Game Over" con input de nombre que guarda puntaje en `localStorage`.
- Ruta `/auth` — Login/registro con tabs, formularios fake, login guarda usuario en `localStorage`.
- Ruta `/salon` — Salón de la Fama: tabs por juego, podio top 3, tabla de posiciones, fila "tu mejor marca" si hay sesión.
- `Nav` compartido en el layout: logo, links activos por ruta, contador de créditos fake, botón login/logout, menú hamburguesa mobile.
- Fondo global (`av-bg`, `av-noise`), fuentes pixel/mono vía `next/font/google`, footer fijo.
- Datos mock de 8 juegos (bricks, tetro, snake, glot, invaders, rocas, rana, duelo) con nombre, categoría, descripción corta, mejor puntuación, color de acento.
- Puntuaciones mock generadas con semilla fija para leaderboard y salón de la fama.
- Persistencia en `localStorage`: `av_user` (sesión fake) y `av_scores` (puntajes guardados desde el modal de game over).

**Out of scope (for future specs):**

- Lógica real de cualquier juego (colisiones, reglas, física, input de teclado/gamepad).
- Backend real, base de datos, validación de credenciales.
- Mezclar puntajes guardados en `av_scores` dentro del ranking mostrado en Salón de la Fama o Detalle (quedan mock estático).
- Sistema de créditos funcional (el contador es decorativo).
- Internacionalización / soporte multi-idioma (todo queda en español).
- Tests automatizados.

---

## Data model

```ts
// lib/data.ts
type Game = {
  id: string;            // "bricks" | "tetro" | "snake" | "glot" | "invaders" | "rocas" | "rana" | "duelo"
  title: string;
  cat: string;            // categoría mostrada en chip/label, p. ej. "ARCADE"
  short: string;          // descripción corta para la tarjeta
  description: string;    // descripción larga para Detalle
  best: number;           // mejor puntuación mock
  color: "cyan" | "magenta" | "yellow"; // acento de botón/marca
};

type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/AAAA"
};
```

```ts
// localStorage
// av_user  -> { name: string } | null
// av_scores -> Array<{ gameId: string; name: string; score: number; at: number }>
```

Convenciones:

- `id` de juego es el string usado en la URL (`/juego/[id]`, `/jugar/[id]`) y debe existir en `GAMES`.
- `seededScores(seed, count)` genera filas deterministas (mismo criterio que el template) para leaderboard y podio.
- Todo acceso a `localStorage` va envuelto en `try/catch` (puede fallar en modo privado).

---

## Implementation plan

1. Crear `lib/data.ts` con el array `GAMES` (8 juegos), lista `CATS`, y función `seededScores(seed, count)`.
2. Crear `lib/storage.ts` con helpers `getUser`, `setUser`, `clearUser`, `saveScore`, `getScores` sobre `localStorage`.
3. Adaptar `styles.css` del template a `app/globals.css` (o `app/arcade.css` importado desde `globals.css`): variables de color, `.av-bg`, `.av-noise`, `.btn`, `.chip`, `.card`, `.crt`, `.modal`, `.hall-*`, `.auth-*`, animaciones.
4. Actualizar `app/layout.tsx`: cargar fuentes "Press Start 2P" y "JetBrains Mono" con `next/font/google`, renderizar `av-bg`/`av-noise`, `<Nav>`, `<main>`, footer.
5. Crear `components/Nav.tsx` (`"use client"`): logo, links (Biblioteca/Salón), estado activo por `usePathname()`, botón login/logout leyendo `av_user`, panel mobile con hamburguesa.
6. Crear `components/GameCard.tsx` con efecto tilt al mouse (igual que template) y botón "Jugar".
7. Implementar `app/page.tsx` (Biblioteca): hero, buscador, chips de categoría, grid de `GameCard` filtrado, estado vacío "NO HAY RESULTADOS".
8. Implementar `app/juego/[id]/page.tsx` (Detalle): cover, tags, stats, leaderboard con `seededScores`, botones "Jugar" (→ `/jugar/[id]`) y "Volver". `notFound()` si `id` no existe en `GAMES`.
9. Implementar `app/jugar/[id]/page.tsx` (Reproductor, `"use client"`): HUD fake, marco CRT con arena animada por CSS, botón "Terminar partida" que abre modal de Game Over con input de nombre, guarda en `av_scores` vía `saveScore`, botones "Volver a jugar" / "Volver a la biblioteca".
10. Implementar `app/auth/page.tsx` (`"use client"`): tabs Iniciar sesión / Registrarse, formularios fake, submit llama `setUser` y redirige a `/`.
11. Implementar `app/salon/page.tsx`: tabs por juego, podio top 3 y tabla completa con `seededScores`, fila "tu mejor marca" si `av_user` existe.

---

## Acceptance criteria

- [ ] `/` muestra las 8 tarjetas de juego y filtra correctamente por texto y por categoría.
- [ ] Buscar un texto sin resultados muestra el mensaje "NO HAY RESULTADOS".
- [ ] Click en una tarjeta o su botón "Jugar" navega a `/juego/[id]` con el `id` correcto.
- [ ] `/juego/[id]` con un `id` inexistente muestra 404 (`notFound()`).
- [ ] `/juego/[id]` muestra leaderboard con al menos 10 filas y botón "Jugar" navega a `/jugar/[id]`.
- [ ] `/jugar/[id]` muestra el marco CRT y HUD sin ejecutar ninguna lógica de juego real.
- [ ] En `/jugar/[id]`, terminar la partida abre el modal de Game Over con input de nombre.
- [ ] Guardar el nombre en el modal escribe una entrada nueva en `localStorage["av_scores"]`.
- [ ] `/auth` permite alternar entre tabs de login y registro.
- [ ] Enviar el formulario de login en `/auth` guarda `av_user` en `localStorage` y redirige a `/`.
- [ ] Con `av_user` seteado, el Nav muestra el nombre de usuario en vez del botón "Iniciar Sesión".
- [ ] Cerrar sesión desde el Nav borra `av_user` y vuelve a mostrar "Iniciar Sesión".
- [ ] `/salon` muestra podio top 3 y tabla completa por cada juego, cambiando de datos al cambiar de tab.
- [ ] Con sesión activa, `/salon` muestra la fila "tu mejor marca" para el juego seleccionado.
- [ ] El link activo en el Nav (Biblioteca/Salón) coincide con la ruta actual, incluyendo cuando se está en `/juego/[id]` o `/jugar/[id]` (Biblioteca queda marcada activa).
- [ ] El menú mobile (hamburguesa) abre/cierra el panel lateral en viewport angosto.
- [ ] `npm run build` y `npm run lint` pasan sin errores.

---

## Decisions

- **Sí:** rutas reales de App Router (`/`, `/juego/[id]`, `/jugar/[id]`, `/auth`, `/salon`) en vez del router hash-based del template. Razón: el proyecto ya corre sobre Next 16 App Router; replicar el router del template sería ignorar el stack real.
- **No:** convertir `styles.css` a utilidades Tailwind. Razón: el diseño usa animaciones CSS complejas (scanlines, CRT, flicker, tilt) más fáciles de mantener como CSS plano; se conserva como hoja global.
- **Sí:** reconstruir la pantalla `/jugar/[id]` aunque `reproductor.jsx` no exista en `references/templates/`, basándose en las clases `.crt`/`.game-arena`/`.modal` ya presentes en `styles.css`. Razón: es la única pieza visual faltante del recorrido completo y es puramente decorativa.
- **Sí:** 8 juegos mock (`bricks`, `tetro`, `snake`, `glot`, `invaders`, `rocas`, `rana`, `duelo`), inferidos de las clases `.cover-*` del template. Razón: cubren los 8 covers CSS ya diseñados.
- **Sí:** sesión fake persistida en `av_user` vía `localStorage`, sin validar credenciales. Razón: el MVP es solo visual, no hay backend de auth.
- **Sí:** puntuaciones del leaderboard y salón siguen siendo mock estático (semilla fija); `av_scores` solo guarda lo que el usuario ingresa en el modal de Game Over, sin mezclarse en las tablas mostradas. Razón: evita tener que diseñar lógica de ranking real en un MVP visual.
- **No:** lógica de juego real (colisiones, física, puntaje calculado en vivo). Razón: pedido explícito del usuario — "no hay que implementar ningún juego".

---

## Risks

| Risk                                            | Mitigation                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `localStorage` deshabilitado (modo privado)      | Todo acceso envuelto en `try/catch`; la pantalla sigue funcionando, solo no persiste.    |
| `id` de juego inválido en la URL                 | `app/juego/[id]/page.tsx` y `app/jugar/[id]/page.tsx` llaman `notFound()` si no existe.  |
| Animaciones pesadas (scanlines, grid, noise SVG) | Se mantienen igual que el template; si hay problema de performance, es tema de otra spec. |

---

## What is **not** in this spec

- Lógica real de cualquier juego (reglas, física, input).
- Backend, base de datos, autenticación real.
- Sistema de créditos funcional.
- Mezcla de puntajes guardados con el ranking mostrado.
- Internacionalización.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propia spec.
