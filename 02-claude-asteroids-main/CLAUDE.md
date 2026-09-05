# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a vanilla JavaScript/HTML5 Canvas clone of the classic Asteroids arcade game. It runs without frameworks, bundlers, or external dependencies — everything is a single script (`game.js`) served directly from `index.html`. The project uses Spanish language identifiers and UI text (e.g., `NIVEL`, `PUNTAJE`).

## Running the Game

**Option 1: Direct file**
Open `index.html` directly in a browser.

**Option 2: Static server**
```bash
npx serve .
```
Then visit `http://localhost:3000`.

There is no build step, test framework, or linter configuration in this repo.

## Architecture Overview

All game logic lives in `game.js` (~424 lines), organized into clearly commented sections:

### Core Game Loop
- `requestAnimationFrame`-driven loop (`loop()`) running `update(dt)` then `draw()`
- Delta-time clamped to 50ms to prevent spiral-of-death physics on frame drops
- Global canvas context `ctx` and dimensions `W`/`H` (800×600)

### Entity Classes
- **Bullet** — spawned from the ship's nose, wraps at screen edges, dies after 1.1 seconds
- **Asteroid** — three size tiers (3→2→1, stored in RADII/SPEEDS/POINTS lookup tables); splits into two smaller asteroids on hit (size 1 yields nothing); drawn as irregular polygons with rotation
- **Ship** — player-controlled; rotation via arrow keys, thrust via up arrow, shoots via space; includes drag/momentum physics; has temporary invincibility (flashing) on respawn; 3 lives total
- **Particle** — short-lived explosion effects (trails), spawned when asteroids or ship are destroyed

### Game State
Mutable globals `ship`, `bullets`, `asteroids`, `particles`, `score`, `lives`, `level`, and `state`:
- `state` is a three-state machine: `'playing'` (normal), `'dead'` (waiting for respawn), `'gameover'` (waiting for restart)
- `deadTimer` controls the 2-second respawn delay
- No level design beyond "spawn N asteroids" — N increases with level

### Collision & Physics
- Toroidal (wraparound) screen space: `wrap()` utility keeps all entities in bounds
- Circle-based collision: `dist()` function + radius checks for bullet→asteroid and ship→asteroid
- Bullet vs. asteroid: bullet and asteroid mark themselves `dead`; asteroid splits and generates particles; score awarded per size
- Ship vs. asteroid (outside invincibility frames): calls `killShip()`; explodes with particles; decrements lives or triggers game over

### Input Handling
- `keys` object tracks persistent key state (is key down *now*)
- `justPressed` object tracks one-frame edges (was key just pressed *this frame*)
- `pressed()` utility reads and clears `justPressed` for one-shot actions like firing

### Rendering
- `drawHUD()` — score, level, remaining lives (as small ship icons)
- `drawOverlay()` — "GAME OVER" screen (reuses this for other text overlays)
- Entity `draw()` methods handle their own rendering via canvas transforms

## Key Implementation Details

**Screen Wrap:** All moving entities (ship, bullets, asteroids) use `wrap()` to stay in bounds. The ship's `vx`/`vy` momentum persists when it wraps.

**Asteroid Scoring:** Intentionally inverted (large = 20 points, small = 100) to reward harder targets.

**Invincibility Frames:** The ship flashes (every other frame during `invincible > 0`); collision is skipped entirely during this window.

**Particle System:** Explosions spawn particles with random velocity/lifetime. Particles fade out and are culled when `ttl <= 0`.

When adding features or debugging, trace through `update()` and `draw()` — they're the central control flow.
