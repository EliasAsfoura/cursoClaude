# Sugerencias de juegos — To-do

> Mantenido por el agente `game-planner`. Estados: pendiente → aprobado → en spec → implementado | descartado.

## Pendientes

- [ ] **fusion** (FUSION — 2048) — PUZZLE/yellow — puntaje 33/40 — sugerido por game-planner, 2026-09-28 — RECOMENDADO
  - Razón: mecánica nueva (deslizar/fusionar grilla), score numérico natural, solo flechas, canvas trivial, cero assets. Refuerza PUZZLE (1 juego).
  - Riesgo: partidas pueden alargarse; mitigar con game over rápido si tablero lleno y animaciones cortas.
  - Referencia: desde cero
- [ ] **ciclos** (CICLOS — Tron light cycles vs CPU) — VERSUS/magenta — puntaje 33/40 — sugerido por game-planner, 2026-09-28
  - Razón: inaugura VERSUS (vacía), rondas de segundos, teclado. Score menos natural (rondas ganadas / supervivencia); estela parecida a snake.
  - Referencia: desde cero
- [ ] **invasores** (INVASORES — Space Invaders) — SHOOTER/cyan — puntaje 31/40 — sugerido por game-planner, 2026-09-28
  - Razón: clásico, score ideal. Solapa en parte con rocas (shooter).
  - Referencia: desde cero
- [ ] **rana** (RANA — Frogger) — ARCADE/green — puntaje 31/40 — sugerido por game-planner, 2026-09-28
  - Razón: mecánica de cruce/timing única. ARCADE ya tiene 2; sprites más trabajosos.
  - Referencia: desde cero
- [ ] **pong** (PONG vs CPU) — VERSUS/magenta — puntaje 31/40 — sugerido por game-planner, 2026-09-28
  - Razón: llena VERSUS, muy simple. Duplica pala/rebote de arkanoid; score pobre para leaderboard.
  - Referencia: desde cero
- [ ] **aleteo** (ALETEO — Flappy) — ARCADE/yellow — 36/40 — sugerido por game-planner, 2026-09-28 — un botón, score = tubos, cero assets, baja
- [ ] **boxeo** (BOXEO — Atari Boxing vs CPU) — VERSUS/cyan — 35/40 — sugerido por game-planner, 2026-09-28 — score = golpes + bonus KO, media
- [ ] **sumo** (SUMO — empujar al rival) — VERSUS/green — 35/40 — sugerido por game-planner, 2026-09-28 — rondas cortas, sin assets, baja-media; riesgo: CPU simple
- [ ] **gemas** (GEMAS — match-3, timer 60 s) — PUZZLE/cyan — 35/40 — sugerido por game-planner, 2026-09-28 — combos/cascadas, media
- [ ] **salto** (SALTO — dino runner) — ARCADE/yellow — 35/40 — sugerido por game-planner, 2026-09-28 — score = distancia, baja; ARCADE ya cargado
- [ ] **saltarin** (SALTARÍN — Doodle Jump) — ARCADE/magenta — 35/40 — sugerido por game-planner, 2026-09-28 — score = altura, baja-media (agente "torre" propuso lo mismo, 35/40; fusionados)
- [ ] **secuencia** (SECUENCIA — Simon) — PUZZLE/green — 34/40 — sugerido por game-planner, 2026-09-28 — flechas + WebAudio, baja; score plano → bonus velocidad (agente "eco" propuso lo mismo, 34/40; fusionados)
- [ ] **topo** (TOPO — whack-a-mole) — ARCADE/cyan — 34/40 — sugerido por game-planner, 2026-09-28 — 60 s, combos, baja; teclas 1-9 poco intuitivas
- [ ] **burbujas** (BURBUJAS — Puzzle Bobble) — PUZZLE/green — 33/40 — sugerido por game-planner, 2026-09-28 — grilla hex + rebote, media-alta
- [ ] **ciempies** (CIEMPIÉS — Centipede) — SHOOTER/green — 33/40 — sugerido por game-planner, 2026-09-28 — mejor SHOOTER, media
- [ ] **misiles** (MISILES — Missile Command) — SHOOTER/magenta — 33/40 — sugerido por game-planner, 2026-09-28 — pensado para mouse, media
- [ ] **penales** (PENALES — tanda vs CPU) — VERSUS/green — 33/40 — sugerido por game-planner, 2026-09-28 — por turnos, baja
- [ ] **lunar** (LUNAR — Lunar Lander) — ARCADE/green — 33/40 — sugerido por game-planner, 2026-09-28 — física simple, media
- [ ] **horizonte** (HORIZONTE — shmup lateral) — SHOOTER/cyan — 32/40 — sugerido por game-planner, 2026-09-28 — media-alta; se parece a rocas/invasores
- [ ] **encastre** (ENCASTRE — 1010!) — PUZZLE/cyan — 32/40 — sugerido por game-planner, 2026-09-28 — media; parecido a tetris
- [ ] **bombas** (BOMBAS — Bomberman vs CPU) — VERSUS/yellow — 32/40 — sugerido por game-planner, 2026-09-28 — alta (IA + cadenas)
- [ ] **duelo** (DUELO — pistoleros) — VERSUS/magenta — 32/40 — sugerido por game-planner, 2026-09-28 — media; parecido a rocas, cambiar color
- [ ] **minas** (MINAS — Buscaminas) — PUZZLE/green — 31/40 — sugerido por game-planner, 2026-09-28 — baja-media; score por tiempo encaja mal

## Aprobados / en spec

## Implementados

- [x] **arkanoid** (ARKANOID) — ARCADE/green
- [x] **rocas** (ROCAS) — SHOOTER/yellow
- [x] **snake** (SNAKE) — ARCADE/cyan
- [x] **tetris** (TETRIS) — PUZZLE/magenta

## Descartados

## Preferencias aprendidas

- 2026-09-28: todas las referencias de `references/started-games/` (02–04) ya portadas; próximos juegos son desde cero.
- 2026-09-28: VERSUS vacía → foco VERSUS vs CPU con score acumulable.
