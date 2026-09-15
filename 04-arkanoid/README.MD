
# Juego de Arkanoid

Arkanoid hecho con HTML, CSS y JavaScript puro, cero dependencias. Sin build step, sin package manager.

## Cómo jugarlo

1. Abrí `index.html` directo en el navegador, o serví la carpeta con cualquier server estático.
2. Movés la paleta para rebotar la bola y romper todos los bloques del nivel.
3. Si la bola cae debajo de la paleta perdés una vida (3 en total). Al perder todas, Game Over.
4. Al romper todos los bloques de un nivel, pasás al siguiente. Completar los 5 niveles = victoria.
5. Desde Game Over o Victoria, `Espacio` reinicia la partida desde el nivel 1.

## Controles

| Tecla | Acción |
|---|---|
| `←` / `A` | Mover paleta a la izquierda |
| `→` / `D` | Mover paleta a la derecha |
| `P` / `Escape` | Abrir/cerrar menú de pausa |
| `1`-`5` (en pausa) | Saltar directo a ese nivel |
| `M` (en pausa) | Silenciar/activar sonido |
| `Espacio` (en Game Over/Victoria) | Reiniciar partida |

## Características

- 5 niveles con distintos patrones de bloques y colores (`gray`, `red`, `yellow`, `cyan`, `magenta`, `hotpink`, `green`).
- Velocidad de la bola aumenta 15% por nivel al avanzar.
- Power-up de paleta ancha: 20% de probabilidad al romper un bloque, dura 10s.
- Animación de explosión por sprite al romper bloques, más partículas y screen shake.
- HUD con puntaje, mejor puntaje (`localStorage`) y vidas dibujadas como corazones pixelados.
- Menú de pausa dibujado en canvas con selección de nivel y mute (persistido en `localStorage`).
- Sonidos de rebote y rotura de bloque, más efecto sintetizado de Game Over vía Web Audio API.

## Niveles

| Nivel | Patrón |
|---|---|
| 1 | 5 filas sólidas, una por color (red, yellow, cyan, magenta, green) |
| 2 | Filas con huecos alternados (gray/red) y bandas sólidas (hotpink, yellow, cyan) |
| 3 | Bandas con huecos centrales, mezcla de colores por fila |
| 4 | Patrón en tablero (cyan/gray, hotpink/yellow) con huecos centrales en magenta |
| 5 | Patrón en tablero (red/yellow, magenta/hotpink) con bandas sólidas gray/cyan/green |

## Estructura del proyecto

```
04-arkanoid/
├── index.html              # canvas del juego
├── style.css                # estilos de la página
├── game.js                  # lógica del juego: estado, física, niveles, render
├── assets/
│   ├── spritesheet.js        # helper de render sobre el spritesheet (loadSpritesheet, drawSprite, drawFrame)
│   ├── spritesheet-breakout.png
│   └── sounds/                # ball-bounce.mp3, break-sound.mp3
├── specs/                    # specs del flujo spec-driven (/spec → /spec-impl)
│   ├── 01-mvp-jugable.md
│   ├── 02-mejora-animacion-destruccion-bloques.md
│   └── 03-menu-pausa-seleccion-nivel.md
├── .claude/skills/            # skills /spec y /spec-impl
├── .agents/skills/            # espejo de las mismas skills (compat cross-agent)
└── skills-lock.json           # versionado de las skills vendorizadas
```

Ver `CLAUDE.md` para detalles del flujo de trabajo spec-driven y la API del spritesheet.
