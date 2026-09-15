# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del proyecto

Juego funcional: `index.html`, `style.css`, `game.js`. Implementado vía specs 01-03 (MVP jugable, animación destrucción bloques, menú pausa con selección nivel). No hay `package.json`, build, ni tests. Ver `specs/*.md` para historial de features (status `Implemented`).

## Restricciones

- Cero dependencias: HTML, CSS y JS puro. Sin npm, sin bundler, sin framework.
- Sin build step. Se corre abriendo `index.html` directo o con un server estático cualquiera.
- No existe test runner. Verificar cambios jugando el juego en el navegador.

## Flujo de trabajo: spec-driven

Este repo usa el par de skills `/spec` → `/spec-impl` (vendorizadas desde `Klerith/fernando-skills`, ver `skills-lock.json`):

1. `/spec <descripción>` hace preguntas de clarificación y escribe `specs/NN-slug.md` en estado `Draft`. Nunca escribe código.
2. El humano revisa y cambia el estado a `Approved` manualmente.
3. `/spec-impl NN-slug` solo avanza si el estado es `Approved`. Crea (o reusa) la branch `spec-NN-slug`, muestra objetivo/alcance/plan/criterios, e implementa paso a paso pausando para revisión de diff tras cada paso. Nunca commitea automáticamente.
4. `AutoCreateBranch` en `specs/.spec-config.yml` controla si la branch se crea sin preguntar (default `true`).

Las definiciones de estas skills viven en `.claude/skills/{spec,spec-impl}/` y están espejadas byte-a-byte en `.agents/skills/{spec,spec-impl}/` (compat cross-agent). Si se edita una copia, replicar el cambio en la otra.

## Assets / API del spritesheet

`assets/spritesheet.js` (globals, sin módulos) ya trae listo el helper de render sobre `assets/spritesheet-breakout.png`:

- `loadSpritesheet(cb)` — carga la imagen a un canvas offscreen; llama `cb` cuando está lista (si ya cargó, llama `cb` de inmediato).
- `drawSprite(ctx, name, x, y, w, h)` — dibuja por nombre. `name` es `'paddle'`, `'ball'`, o `'block_<color>'` (colores: `gray`, `red`, `yellow`, `cyan`, `magenta`, `hotpink`, `green`). No hace nada si el spritesheet no cargó todavía.
- `drawFrame(ctx, frame, x, y, w, h)` — dibuja un frame crudo `{sx,sy,sw,sh}`, usado para animar explosiones vía `EXPLOSION_FRAMES[color][i]` (4 frames por color, `EXPLOSION_DURATION = 150` ms por frame).

Sonidos en `assets/sounds/`: `ball-bounce.mp3`, `break-sound.mp3`.

## Convenciones

- Responder y escribir specs en español (el README y las skills están en español/inglés mixto, pero el contenido del proyecto es en español).
