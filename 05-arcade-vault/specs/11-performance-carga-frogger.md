# SPEC 11 — Performance de carga de /jugar/frogger

> **Status:** Implemented (cerrada con hallazgos: criterio ≥ 30 % en dev no alcanzable; ver `references/performance-frogger.md`)
> **Depends on:** SPEC 06, SPEC 10 (y el juego Frogger ya mergeado en `main`)
> **Date:** 2026-09-29
> **Objective:** Medir por qué `/jugar/frogger` tarda en cargar en `npm run dev` y reducir ese tiempo al menos 30 % respecto al baseline, sin cambiar la jugabilidad.

---

## Why this spec exists

Síntoma reportado: navegar a `/jugar/frogger` se siente lento, en desktop y celular, en `npm run dev`. Hipótesis a **confirmar con medición** (no asumir):

1. `components/games/registry.ts` importa estáticamente los 5 `*Canvas.tsx` (y sus motores) → la ruta del player carga el código de todos los juegos.
2. `app/jugar/[id]/page.tsx` hace `await getGame(id)` (round-trip a Supabase) antes de enviar HTML; nada se muestra hasta que responde.
3. En dev, Next compila la ruta on-demand la primera vez; parte de la lentitud puede ser solo de dev y no existir en producción.

Frogger no carga assets de imagen (`public/games/` solo tiene `snake/fruits.png`), así que el costo está en JS, servidor o CSS, no en imágenes.

---

## Scope

**In:**

- Paso de medición (baseline) de `/jugar/frogger` con Playwright MCP + Performance trace: TTFB, LCP, tiempo hasta el primer frame del canvas, tamaño de JS cargado en la ruta, long tasks. Perfil: viewport 390×844, CPU throttling ×4, red Fast 4G, caché deshabilitado. Se repite en `npm run dev` y en `npm run build && npm start` para separar costo de dev vs. costo real.
- Registro de baseline y resultado final en `references/performance-frogger.md` (nuevo, en español).
- Optimizaciones aplicadas **solo si el baseline las justifica**, en este orden:
  - Code-splitting de los juegos en `components/games/registry.ts`: `Canvas` pasa a cargarse con `next/dynamic` / `React.lazy` por id, de modo que `/jugar/frogger` solo baje el código de Frogger. Es mecánica compartida por los 5 juegos, pero **no se modifica ningún motor ni `*Canvas.tsx`**.
  - Reducir el bloqueo del servidor en `app/jugar/[id]/page.tsx`: p. ej. `loading.tsx` / Suspense para mostrar el shell del player mientras llega `getGame`, o cachear `getGame` si el dato es estático.
  - Ajustes propios de Frogger (`frogger-engine.ts`, `FroggerCanvas.tsx`) si el trace muestra trabajo costoso en el primer frame o en `initGame`.
  - CSS del player/CRT en `app/globals.css` solo si el trace muestra recálculo de estilos o paint costosos atribuibles a esta ruta.
- Regla de código para todo lo que esta spec toque (`FroggerCanvas.tsx`, `GamePlayerClient.tsx`, `registry.ts`): mantener `useState` al mínimo; el estado que no afecta lo que se pinta va en `useRef`, y se evitan re-renders innecesarios (p. ej. no llamar `setState` con el mismo valor, no crear callbacks/objetos nuevos en cada render, `useCallback`/`memo` solo donde el trace lo justifique). El estado de juego ya vive en refs (`gsRef`, `pausedRef`, `skinRef`); se conserva ese patrón.
- Auditoría de re-renders de `GamePlayerClient.tsx` durante `/jugar/frogger` (HUD score/lives/level, pausa, modal): contar renders con React Profiler / `console.count` temporal y reducirlos si superan lo necesario (un render por cambio real de score/vidas/nivel).
- Verificación de que la jugabilidad de Frogger y los 4 juegos restantes no cambia (smoke test).

**Out of scope (para otra spec):**

- Optimizar el rendimiento en juego (FPS, lag de input, degradación con el tiempo): el síntoma reportado es solo de carga.
- Optimizar los motores de rocas, tetris, arkanoid y snake, o sus `*Canvas.tsx`.
- Performance de `/`, `/inicio`, `/juego/[id]`, `/salon`, `/about`.
- Cambios de infraestructura (CDN, región de Supabase, plan de hosting).
- Nuevas librerías de medición o CI de performance.

---

## Data model

Esta spec no introduce estructuras de datos ni cambios en Supabase. Solo cambia la forma en que `GAME_REGISTRY` obtiene `Canvas`; el tipo `GameRegistryEntry` mantiene sus campos (`hasLives`, `initialLives`, `skins`, `touch`) y `Canvas` sigue siendo un componente compatible con `GameCanvasProps` + `GameCanvasHandle` (ref).

Formato del informe `references/performance-frogger.md`:

```md
| Métrica                  | Baseline dev | Final dev | Baseline prod | Final prod |
| ------------------------ | ------------ | --------- | ------------- | ---------- |
| TTFB (ms)                |              |           |               |            |
| LCP (ms)                 |              |           |               |            |
| Primer frame canvas (ms) |              |           |               |            |
| JS cargado en la ruta KB |              |           |               |            |
| Long tasks (n / ms)      |              |           |               |            |
```

---

## Implementation plan

1. Crear `references/performance-frogger.md` con la plantilla de tabla y el perfil de medición (viewport, throttling, caché off, N=5 corridas, se reporta la mediana).
2. Medir baseline en `npm run dev` con Playwright MCP + trace navegando a `/jugar/frogger` desde `/`. Anotar los resultados y las 3 mayores contribuciones al tiempo (servidor, JS, render). Sin cambios de código.
3. Medir baseline en `npm run build && npm start` con el mismo perfil. Anotar si la lentitud existe en producción. Si prod ya está bajo el umbral razonable, dejarlo escrito en el informe y limitar la spec a lo que mejore dev.
4. Si el paso 2/3 muestra JS de otros juegos en la ruta: convertir `Canvas` en `registry.ts` a carga diferida por juego (`next/dynamic`, `ssr: false`), con fallback ligero (el `.game-arena` vacío o texto "Cargando…") en `GamePlayerClient.tsx`. Prueba: abrir `/jugar/frogger` y confirmar en Network que no se descargan chunks de rocas/tetris/arkanoid/snake; los 5 juegos siguen arrancando.
5. Si el trace muestra bloqueo en servidor por `getGame`: mostrar el shell del player antes de los datos (`app/jugar/[id]/loading.tsx` o Suspense) o cachear la lectura. Prueba: el HTML inicial llega sin esperar a Supabase.
6. Si el trace muestra costo en `initGame`/primer `draw` de Frogger: corregirlo en `frogger-engine.ts` / `FroggerCanvas.tsx` (p. ej. precomputar carriles o paletas fuera del loop). Prueba: primer frame más rápido en el trace.
6b. Auditar `GamePlayerClient.tsx` y `FroggerCanvas.tsx`: contar renders al cargar y al jugar 30 s (baseline y final, anotados en el informe). Convertir a `useRef` cualquier `useState` que no alimente el JSX y evitar `setState` redundantes. Sin cambios de comportamiento visible. Prueba: HUD sigue actualizando; conteo de renders baja o queda igual.
7. Si el trace muestra costo de estilos/paint en la ruta: simplificar el CSS afectado en `app/globals.css` sin alterar el aspecto visual (comparar screenshots antes/después en `.playwright-screenshots/`).
8. Repetir la medición del paso 2 y 3, completar columnas "Final" en `references/performance-frogger.md` y calcular la mejora. Ejecutar `npm run build` y `npm run lint`.

Los pasos 4–7 son condicionales: se omiten (y se anota en el informe por qué) los que el baseline no justifique.

---

## Acceptance criteria

- [ ] Existe `references/performance-frogger.md` con baseline y resultado final en dev y prod.
- [ ] El tiempo hasta el primer frame del canvas en `/jugar/frogger` (mediana de 5 corridas, mismo perfil) mejora ≥ 30 % en `npm run dev` respecto al baseline.
- [ ] Si el baseline en producción mostraba lentitud, la métrica de primer frame en prod también mejora ≥ 30 %; si no la mostraba, el informe lo declara explícitamente.
- [ ] Si se aplicó code-splitting: en Network de `/jugar/frogger` no se descarga código de rocas, tetris, arkanoid ni snake.
- [ ] En `/jugar/frogger`, un cambio de score, vidas o nivel produce como máximo 1 render de `GamePlayerClient`; el loop de `requestAnimationFrame` no provoca renders de React por frame.
- [ ] Ningún `useState` nuevo en los archivos tocados; los `useState` que no alimentan el JSX quedaron como `useRef`.
- [ ] Frogger es jugable igual que antes: teclado, controles táctiles (spec 10), pausa, game over, guardado de score y cambio de skin funcionan.
- [ ] `/jugar/rocas`, `/jugar/tetris`, `/jugar/arkanoid` y `/jugar/snake` cargan y se juegan igual que antes.
- [ ] `/jugar/<id>` de un juego sin entrada en `GAME_REGISTRY` sigue mostrando el placeholder sin errores.
- [ ] Los archivos `*-engine.ts` y `*Canvas.tsx` de rocas, tetris, arkanoid y snake no aparecen en el diff.
- [ ] Sin errores nuevos en la consola del navegador al abrir `/jugar/frogger`.
- [ ] `npm run build` y `npm run lint` pasan sin errores.

---

## Decisions

- **Sí:** medir antes de optimizar, en dev y en prod. Razón: la lentitud se ve en `npm run dev`, donde la compilación on-demand infla los tiempos; sin baseline en prod podríamos "arreglar" algo que no existe.
- **Sí:** criterio de éxito relativo (≥ 30 % vs. baseline). Razón: elegido por el usuario; no hay un umbral absoluto previo y el baseline depende de la máquina.
- **Sí:** alcance funcional solo Frogger, pero permitir el code-splitting del registry. Razón: es un cambio único y mecánico que beneficia a los 5 juegos sin tocar sus motores; el usuario aceptó aplicarlo si el baseline lo justifica.
- **No:** optimizar motores de los otros 4 juegos. Razón: el usuario pidió alcance solo Frogger; el síntoma es de carga, no de FPS.
- **No:** trabajo sobre FPS/lag de input. Razón: el síntoma elegido fue "lento al cargar" únicamente; si aparecen otros síntomas, spec aparte.
- **Sí:** pasos condicionales según el trace. Razón: las causas son hipótesis; evita cambios especulativos.
- **Sí:** medición con Playwright MCP + Performance trace. Razón: ya es la herramienta de verificación del repo y da números repetibles.
- **Sí:** `useRef` sobre `useState` para estado que no se pinta, y evitar renders. Razón: pedido del usuario; el loop del juego ya usa refs y cada render extra del player cuesta tiempo en carga y en HUD.
- **No:** memoizar todo por defecto (`memo`/`useCallback` masivo). Razón: solo donde el conteo de renders lo justifique.
- **No:** agregar librerías de medición (Lighthouse CI, web-vitals). Razón: overengineering para una spec puntual.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| La lentitud es solo de dev y en prod ya es rápida | Paso 3 lo detecta; el informe lo declara y se limita el alcance a mejoras baratas para dev. |
| Medición ruidosa (primera compilación de Next en dev) | Descartar la primera carga en frío; N=5 corridas y mediana; mismo perfil antes y después. |
| Carga diferida del `Canvas` rompe el `ref` (`forceGameOver`) o causa parpadeo | Fallback con las mismas dimensiones que el canvas; verificar FIN/pausa/skin en los 5 juegos. |
| `ssr: false` con `next/dynamic` en Next 16 cambia de reglas | Leer `node_modules/next/dist/docs/` (lazy loading) antes de implementar, según `AGENTS.md`. |
| Mostrar el shell antes de `getGame` altera el flujo de `notFound()` | Mantener `notFound()` para ids inexistentes y probarlo con un id inválido. |

---

## What is **not** in this spec

- FPS, lag de input o degradación durante la partida.
- Optimización de rocas, tetris, arkanoid y snake más allá del split compartido del registry.
- Performance de las demás páginas del sitio.
- Infra, CDN, hosting o nuevas librerías de medición.

Cada uno de estos, si se necesita, va en su propia spec.
