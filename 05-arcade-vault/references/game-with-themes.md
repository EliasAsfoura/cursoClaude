# Juegos con skins

Skins actuales por juego implementado. Meta: mínimo 3 por juego (`clasico` default, `neon`, `retro`). Auditar con el agente `skin-designer`.

Leyenda: ✅ existe · ❌ falta

| ID         | Título   | clasico (default) | neon | retro | Estado |
| ---------- | -------- | ----------------- | ---- | ----- | ------ |
| `arkanoid` | ARKANOID | ✅                | ✅   | ✅    | 3/3    |
| `frogger`  | FROGGER  | ✅                | ✅   | ✅    | 3/3    |
| `rocas`    | ROCAS    | ✅                | ✅   | ✅    | 3/3    |
| `snake`    | SNAKE    | ✅                | ✅   | ✅    | 3/3    |
| `tetris`   | TETRIS   | ✅                | ❌   | ❌    | 1/3    |

## Notas

- Sistema compartido: `lib/skins.ts` (`Skin`, `SKINS`), prop `skin?` en `GameCanvasProps`, `skins: true` en `GAME_REGISTRY`. Cada motor exporta `PALETTES: Record<Skin, Palette>` y `draw` recibe la paleta.
- `rocas`: verificado solo por `skins: true` en el registry y presencia de `PALETTES`/skin en su motor y Canvas (grep); no se revisó en detalle.
- `tetris`: sin `skins: true` en el registry.
- `frogger`: `PALETTES` en `frogger-engine.ts` (neon con `shadowBlur` 12; retro con formas cuadradas, sin glow ni alpha).
- Actualizar este archivo al agregar un juego (`references/implemented-games.md`) o una skin.
