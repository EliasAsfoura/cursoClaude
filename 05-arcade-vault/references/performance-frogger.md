# Performance de carga — /jugar/frogger

Informe de la SPEC 11 (`specs/11-performance-carga-frogger.md`).

## Perfil de medición

- Herramienta: Playwright MCP + Performance trace.
- Viewport: 390×844 (móvil).
- CPU throttling: ×4.
- Red: Fast 4G.
- Caché: deshabilitado.
- Flujo: cargar `/`, navegar a `/jugar/frogger`.
- Corridas: N=5 por escenario, se descarta la primera carga en frío en dev y se reporta la **mediana**.
- Entornos: `npm run dev` y `npm run build && npm start`.
- "Primer frame canvas": tiempo desde el inicio de la navegación hasta el primer `draw` de Frogger.

## Resultados

| Métrica                  | Baseline dev | Final dev | Baseline prod | Final prod |
| ------------------------ | ------------ | --------- | ------------- | ---------- |
| TTFB (ms)                | 272          |           | 204           |            |
| LCP (ms)                 | 660          |           | 536           |            |
| Primer frame canvas (ms) | 2049         |           | 873           |            |
| JS cargado en la ruta KB | 793 (15 archivos) |      | 155 (10 archivos) |        |
| Long tasks (n / ms)      | 3 / 560      |           | 2 / 270       |            |

Columnas "Final": **sin cambios de código** respecto al baseline (el único cambio probado, el code-splitting, se revirtió). Final = baseline en dev (2049 ms) y prod (873 ms). Mejora primer frame: 0 % en ambos.

## Conclusión

- **La lentitud reportada es de `npm run dev`**: 2049 ms de primer frame vs 873 ms en producción (−57 %), con el mismo perfil. El costo dominante en dev es tooling de Next (`next-devtools` ~375 ms de evaluación con CPU ×4 y ~1 MB de JS de framework dev), no código del proyecto.
- **Producción ya carga en < 1 s** (CPU ×4, Fast 4G); TTFB ~200 ms; 155 KB de JS.
- **El criterio ≥ 30 % en dev no es alcanzable dentro del alcance de la spec** (ni el split, ni el servidor, ni el motor, ni los renders, ni el CSS aportan). Decisión del usuario: cerrar con estos hallazgos.
- **Idea para otra spec**: probar desactivar el overlay/devtools de Next en dev (`next.config.ts`) y medir.

## Renders de `GamePlayerClient`

| Escenario                     | Baseline | Final |
| ----------------------------- | -------- | ----- |
| Carga inicial                 |          |       |
| 30 s jugando (Frogger)        |          |       |

## Principales contribuciones al tiempo (baseline)

### Dev (`npm run dev`, servidor ya caliente, Chrome estable vía Playwright)

Corridas de primer frame (ms): 2018, 2150, 2121, 2049, 2022 (dispersión baja). Sin errores de consola.

1. **JS/hidratación (dominante).** Hay ~1.4 s entre LCP (660 ms) y primer frame (2049 ms); 3 long tasks suman ~560 ms con CPU ×4. El primer frame espera a hidratar `GamePlayerClient` y montar `FroggerCanvas`.
2. **Bundle de la ruta.** 793 KB transferidos, casi todo framework de dev (`next-devtools` 250 KB, `next/dist/client` 195 KB, `react-dom` 185 KB). Eso es propio de dev y no se puede optimizar desde el código del proyecto.
3. **Código de los 5 juegos en un solo chunk.** El chunk `_0wp3ms1._.js` (172 KB sin comprimir) contiene los motores de rocas, tetris, arkanoid, snake y frogger: confirma la hipótesis 1 de la spec (import estático en `registry.ts`). El servidor no es el cuello: TTFB 272 ms con el servidor ya compilado.

Observación de método: el flujo mide carga directa (`goto`) de `/jugar/frogger`, no navegación desde `/`; y el primer frame se detecta con el primer `fillRect`/`clearRect` en un canvas de 640 px de ancho. Playwright MCP no estaba disponible: se usó Playwright (`channel: chrome`) desde el scratchpad, sin tocar `package.json`. Se descarta una corrida de calentamiento antes de las 5 medidas.

### Prod

`npm run build` + `npm start -p 3100`, mismo perfil. Corridas de primer frame (ms): 908, 873, 893, 856, 853. Sin errores de consola.

- **La lentitud es sobre todo de dev.** Primer frame 873 ms en prod vs 2049 ms en dev (−57 %); JS 155 KB vs 793 KB; long tasks 270 ms vs 560 ms.
- **La hipótesis 1 también aplica en prod.** El chunk `2vdpyhzm8_4w8.js` (43 KB sin comprimir, ~14 KB transferidos) contiene los motores de los 5 juegos. El costo es pequeño, pero sigue siendo código que `/jugar/frogger` no usa.
- **Servidor:** TTFB 204 ms; no es el cuello de botella en ninguno de los dos entornos.
- **Conclusión para el alcance:** prod ya carga el primer frame en menos de 1 s con CPU ×4 + Fast 4G. Según el paso 3 de la spec, el objetivo de ≥30 % se mide sobre dev y en prod se declara el estado real; las mejoras que se apliquen deben ser baratas y no cambiar la jugabilidad.

## Pasos condicionales

| Paso | Aplicado | Motivo |
| ---- | -------- | ------ |
| 4 — code-splitting del registry | Probado y **revertido** | Ver detalle abajo: empeora el primer frame en prod y no mejora dev. |
| 5 — shell antes de `getGame` | Omitido | TTFB 204–272 ms; el servidor no es el cuello de botella. |
| 6 — motor/canvas de Frogger | Omitido | El trace no muestra costo de `initGame` ni del primer `draw`; las tareas largas son de `next-devtools` y React. |
| 6b — auditoría de renders | Sin cambios de código | Ver conteo abajo: ya cumple el criterio. |
| 7 — CSS del CRT | Omitido | Layout + estilos + paint suman ~380 ms de ~4.7 s de tareas (CPU ×4); tocar el CSS global arriesga el aspecto visual sin ganancia medible en el primer frame. |

### Paso 4 — code-splitting (`next/dynamic` por juego, SSR por defecto)

Efecto real: `/jugar/frogger` deja de descargar los motores de rocas, tetris, arkanoid y snake, pero:

| Métrica (mediana de 5) | Dev antes | Dev con split | Prod antes | Prod con split |
| ---------------------- | --------- | ------------- | ---------- | -------------- |
| Primer frame (ms)      | 2049      | 2111          | 873        | 1123           |
| JS (KB)                | 793       | 787           | 155        | 150            |
| Long tasks (n / ms)    | 3 / 560   | 4 / 703       | 2 / 270    | 3 / 471        |

El chunk extra agrega un salto de red y una espera de `Suspense` durante la hidratación que cuestan más que los ~14 KB que se evitan. Decisión: revertido (`registry.ts` vuelve a import estático). No se probó `ssr: false` porque agrega otro salto (hidratar, luego pedir el chunk) y es peor en teoría para el primer frame.

### Paso 6b — renders (dev, StrictMode duplica cada render)

| Escenario | `GamePlayerClient` | `FroggerCanvas` |
| --------- | ------------------ | --------------- |
| Carga inicial | 2 (= 1 real) | 2 (= 1 real) |
| 30 s jugando (hasta game over, 40 pts, 3 vidas perdidas) | 14 adicionales, ~1 por cambio real de score/vidas/game over | igual (se re-renderiza con el padre, sin estado ni trabajo) |

Todos los `useState` de `GamePlayerClient` alimentan el JSX (score, vidas, nivel, pausa, fin, nombre, guardado, `runId` como `key`), así que ninguno se puede pasar a `useRef`. El loop de `requestAnimationFrame` no genera renders. Sin cambios de código.

### Observación fuera de alcance

En rocas y arkanoid, el botón FIN no abre el modal de fin (con o sin los cambios de esta spec). Es un comportamiento previo; queda para otra spec.
