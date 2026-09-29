# Juegos con skins

Skins actuales por juego implementado. Meta: mínimo 3 por juego (`clasico` default, `neon`, `retro`). Auditar con el agente `skin-designer`.

Leyenda: ✅ existe · ❌ falta

| ID         | Título   | clasico (default) | neon | retro | Estado   |
| ---------- | -------- | ----------------- | ---- | ----- | -------- |
| `arkanoid` | ARKANOID | ✅                | ✅   | ✅    | 3/3      |
| `rocas`    | ROCAS    | ✅                | ❌   | ❌    | 1/3      |
| `snake`    | SNAKE    | ✅                | ✅   | ✅    | 3/3      |
| `tetris`   | TETRIS   | ✅                | ❌   | ❌    | 1/3      |

## Notas

- Todavía no hay sistema de skins en el código (sin `skin`/`theme`/`palette` en `components/`). El `clasico` es el look actual con colores hardcodeados en cada `*-engine.ts`.
- Actualizar este archivo al agregar un juego (`references/implemented-games.md`) o una skin.
