# Auditoría de skins — 2026-09-29

| Juego   | clasico | neon | retro | Estado |
| ------- | ------- | ---- | ----- | ------ |
| frogger | ⚠️      | ❌   | ❌    | 1/3. Registry sin `skins: true`; motor con `COLOR` hardcodeado; Canvas sin prop `skin`. |

Existe en `games` y en `GAME_REGISTRY`.

## Faltantes por juego

### frogger
Archivos: `components/games/frogger-engine.ts`, `components/games/FroggerCanvas.tsx`, `components/games/registry.ts` (solo `skins: true`, sin tocar `touch`).

Cambios:
- Motor: reemplazar `COLOR` por `type FroggerPalette` + `PALETTES: Record<Skin, FroggerPalette>` (`clasico` = `COLOR` actual sin cambios). `draw(ctx, gs, W, H, palette)`; pasar palette a `drawBackground/drawEntity/drawGoals/drawFrogShape/drawHud`.
- Hardcodeados fuera de `COLOR` a mover a la paleta: `#000` (ruedas), `rgba(46,158,74,0.35)` (tortuga sumergida), barra de tiempo `#39ff14/#fdd835/#e53935`.
- Canvas: `skin = "clasico"` en props, `skinRef` + effect (igual que SnakeCanvas), `draw(..., PALETTES[skinRef.current])`.
- Registry: `skins: true` en la entrada `frogger`.
- Flags de estilo en la paleta: `glow: boolean` (neon: `shadowBlur` 10-14 con `shadowColor` del color de cada entidad, reset a 0 tras dibujar); `flat: true` en retro (sin glow, sin alpha, trazos gruesos, rana y entidades como rectángulos).

Paleta `neon` (fondo oscuro, alto contraste, glow):
- goalsBg `#05010f`, goalMouth `#00ffd0`, goalBorder `#ff2bd6`
- river `#020818`, safe `#0a0620`, road `#05050a`, roadLine `#00e5ff`
- log `#ff9100`, logLine `#ffd180`, turtle `#00ff9c`, turtleScale `#00b36e`, submerged `rgba(0,255,156,0.3)`
- truck `#b388ff`, truckCab `#7c4dff`, cars `["#ff1744","#ffea00","#00e5ff"]`, wheels `#000000`
- frog `#39ff14`, eye `#ffffff`, pupil `#000000`, hudText `#e0f7ff`, overlay `rgba(2,0,12,0.88)`, gameOver `#ff1744`
- timeBar `["#39ff14","#ffea00","#ff1744"]`

Paleta `retro` (16 colores tipo 8-bit/CRT, sin glow ni gradientes, píxeles gruesos):
- goalsBg `#003300`, goalMouth `#00aa00`, goalBorder `#ffff55`
- river `#0000aa`, safe `#005500`, road `#000000`, roadLine `#555555`
- log `#aa5500`, logLine `#552a00`, turtle `#00aa00`, turtleScale `#005500`, submerged `#000088` (sin alpha; contorno sólido)
- truck `#aaaaaa`, truckCab `#555555`, cars `["#ff5555","#ffff55","#5555ff"]`, wheels `#000000`
- frog `#55ff55`, eye `#ffffff`, pupil `#000000`, hudText `#ffffff`, overlay `#000000` (opaco), gameOver `#ff5555`
- timeBar `["#55ff55","#ffff55","#ff5555"]`
- Dibujo: `lineWidth` 4, rana/ruedas cuadradas, fuente `bold 12px 'Courier New'` sin suavizado.

Legibilidad: en las 3 skins mantener luminancia carretera/río claramente distinta de vehículos/troncos, y rana (verde brillante) distinta de tortuga y de zona segura. En retro, tortuga `#00aa00` vs rana `#55ff55` sobre río `#0000aa`: suficiente.

## Infraestructura
- Sistema compartido: **existe** (`lib/skins.ts` con `Skin`; prop `skin?: Skin` en `GameCanvasProps`; `skins?: boolean` en `GameRegistryEntry`; consumo en `GamePlayerClient.tsx`; usado por rocas, arkanoid y snake). Frogger solo necesita adoptarlo.
- Discrepancia: `references/game-with-themes.md` dice que no hay sistema de skins y lista rocas/tetris como 1/3, pero el código ya tiene `skins: true` en `rocas`, `arkanoid` y `snake`, y no en `tetris`. El archivo está desactualizado y no incluye `frogger`.

## Siguiente paso
Implementar con `/spec` y luego `/spec-impl` (o `/spec-impl-game`). Coordinar el edit de `registry.ts` con `mobile-porter` (clave `touch` de `frogger`).
