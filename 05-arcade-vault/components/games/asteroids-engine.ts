// Motor puro de Rocas (Asteroids), portado de references/started-games/02-asteroids/game.js.
// Sin document/window globales: recibe ctx, W, H y las teclas por parámetro.

export type Keys = Record<string, boolean>;
export type JustPressed = Record<string, boolean>;

export type GameStatus = "playing" | "dead" | "gameover";

const POWERUP_DROP_CHANCE = 0.15;
const POWERUP_DURATION = 5;
const POWERUP_TTL = 12;
const TRIPLE_SPREAD = 0.18;

const RADII = [0, 16, 30, 50]; // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32]; // velocidad base por tamaño
const POINTS = [0, 100, 50, 20]; // puntos por tamaño

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

function consumePressed(justPressed: JustPressed, code: string): boolean {
  const val = justPressed[code];
  justPressed[code] = false;
  return !!val;
}

// ── Bullet ────────────────────────────────────────────────────────────────────
export class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
  radius: number;
  dead: boolean;

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt: number, W: number, H: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
export class Asteroid {
  x: number;
  y: number;
  size: number;
  radius: number;
  dead: boolean;
  vx: number;
  vy: number;
  rotSpeed: number;
  rot: number;
  verts: [number, number][];

  constructor(x: number, y: number, size = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt: number, W: number, H: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split(): Asteroid[] {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── PowerUp ───────────────────────────────────────────────────────────────────
export class PowerUp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  ttl: number;
  dead: boolean;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 12;
    this.ttl = POWERUP_TTL;
    this.dead = false;
  }

  update(dt: number, W: number, H: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
    const pulse = 0.85 + Math.sin(performance.now() / 150) * 0.15;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = "#0ff";
    ctx.lineWidth = 2;
    const r = this.radius * pulse;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.fillStyle = "#0ff";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("3x", this.x, this.y);
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
export class Ship {
  tripleShot: number;
  x = 0;
  y = 0;
  angle = 0;
  vx = 0;
  vy = 0;
  radius = 12;
  thrusting = false;
  invincible = 0;
  shootCooldown = 0;
  dead = false;

  constructor() {
    this.tripleShot = 0;
    this.reset(W_DEFAULT, H_DEFAULT);
  }

  reset(W: number, H: number) {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.radius = 12;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.dead = false;
  }

  update(dt: number, W: number, H: number, keys: Keys) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot > 0) this.tripleShot -= dt;

    const ROT = 3.5; // rad/s
    const THRUST = 260; // px/s²
    const DRAG = 0.987;

    if (keys["ArrowLeft"]) this.angle -= ROT * dt;
    if (keys["ArrowRight"]) this.angle += ROT * dt;

    this.thrusting = !!keys["ArrowUp"];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot > 0) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo(20, 0); // nariz
    ctx.lineTo(-12, -9); // ala izquierda
    ctx.lineTo(-7, 0); // muesca trasera
    ctx.lineTo(-12, 9); // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      ctx.strokeStyle = "rgba(255, 130, 0, 0.85)";
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead: boolean;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
    this.dead = false;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
const W_DEFAULT = 800;
const H_DEFAULT = 600;

export interface GameState {
  ship: Ship;
  bullets: Bullet[];
  asteroids: Asteroid[];
  particles: Particle[];
  powerUps: PowerUp[];
  score: number;
  lives: number;
  level: number;
  state: GameStatus;
  deadTimer: number;
  powerUpSpawned: boolean;
  killsSinceSpawn: number;
}

export function spawnAsteroids(gs: GameState, W: number, H: number, count: number) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    gs.asteroids.push(new Asteroid(x, y, 3));
  }
}

export function initGame(W: number = W_DEFAULT, H: number = H_DEFAULT): GameState {
  const gs: GameState = {
    ship: new Ship(),
    bullets: [],
    asteroids: [],
    particles: [],
    powerUps: [],
    score: 0,
    lives: 3,
    level: 1,
    state: "playing",
    deadTimer: 0,
    powerUpSpawned: false,
    killsSinceSpawn: 0,
  };
  gs.ship.reset(W, H);
  spawnAsteroids(gs, W, H, 4);
  return gs;
}

export function nextLevel(gs: GameState, W: number, H: number) {
  gs.level++;
  gs.bullets = [];
  gs.particles = [];
  gs.powerUps = [];
  gs.powerUpSpawned = false;
  gs.killsSinceSpawn = 0;
  gs.ship.reset(W, H);
  spawnAsteroids(gs, W, H, 3 + gs.level);
}

export function explode(gs: GameState, x: number, y: number, count = 8) {
  for (let i = 0; i < count; i++) gs.particles.push(new Particle(x, y));
}

export function killShip(gs: GameState) {
  explode(gs, gs.ship.x, gs.ship.y, 14);
  gs.ship.dead = true;
  gs.lives--;
  if (gs.lives <= 0) {
    gs.state = "gameover";
  } else {
    gs.state = "dead";
    gs.deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
export function update(
  gs: GameState,
  dt: number,
  W: number,
  H: number,
  keys: Keys,
  justPressed: JustPressed,
) {
  if (gs.state === "gameover") {
    if (consumePressed(justPressed, "Space")) Object.assign(gs, initGame(W, H));
    gs.particles.forEach((p) => p.update(dt));
    gs.particles = gs.particles.filter((p) => !p.dead);
    return;
  }

  if (gs.state === "dead") {
    gs.deadTimer -= dt;
    gs.particles.forEach((p) => p.update(dt));
    gs.particles = gs.particles.filter((p) => !p.dead);
    gs.asteroids.forEach((a) => a.update(dt, W, H));
    if (gs.deadTimer <= 0) {
      gs.state = "playing";
      gs.ship.reset(W, H);
    }
    return;
  }

  // Disparar
  if (consumePressed(justPressed, "Space")) {
    gs.bullets.push(...gs.ship.tryShoot());
  }

  gs.ship.update(dt, W, H, keys);
  gs.bullets.forEach((b) => b.update(dt, W, H));
  gs.asteroids.forEach((a) => a.update(dt, W, H));
  gs.particles.forEach((p) => p.update(dt));
  gs.powerUps.forEach((p) => p.update(dt, W, H));

  gs.bullets = gs.bullets.filter((b) => !b.dead);
  gs.particles = gs.particles.filter((p) => !p.dead);
  gs.powerUps = gs.powerUps.filter((p) => !p.dead);

  for (const p of gs.powerUps) {
    if (!p.dead && dist(gs.ship, p) < gs.ship.radius + p.radius) {
      p.dead = true;
      gs.ship.tripleShot = POWERUP_DURATION;
    }
  }

  // Bala vs asteroide
  const newAsteroids: Asteroid[] = [];
  for (const b of gs.bullets) {
    for (const a of gs.asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        gs.score += POINTS[a.size];
        explode(gs, a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        if (!gs.powerUpSpawned) {
          gs.killsSinceSpawn++;
          const guaranteed = gs.killsSinceSpawn >= 5;
          if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
            gs.powerUps.push(new PowerUp(a.x, a.y));
            gs.powerUpSpawned = true;
          }
        }
      }
    }
  }
  gs.asteroids = gs.asteroids.filter((a) => !a.dead).concat(newAsteroids);
  gs.bullets = gs.bullets.filter((b) => !b.dead);

  // Nave vs asteroide
  if (gs.ship.invincible <= 0) {
    for (const a of gs.asteroids) {
      if (dist(gs.ship, a) < gs.ship.radius + a.radius * 0.82) {
        killShip(gs);
        break;
      }
    }
  }

  // Nivel completado
  if (gs.asteroids.length === 0) nextLevel(gs, W, H);
}

// ── Draw ──────────────────────────────────────────────────────────────────────
export function draw(ctx: CanvasRenderingContext2D, gs: GameState, W: number, H: number) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  gs.particles.forEach((p) => p.draw(ctx));
  gs.asteroids.forEach((a) => a.draw(ctx));
  gs.powerUps.forEach((p) => p.draw(ctx));
  gs.bullets.forEach((b) => b.draw(ctx));
  gs.ship.draw(ctx);

  if (gs.state === "gameover") {
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 46px monospace";
    ctx.fillText("GAME OVER", W / 2, H / 2 - 18);
    ctx.font = "18px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillText(
      `PUNTAJE: ${gs.score}   —   ESPACIO PARA REINICIAR`,
      W / 2,
      H / 2 + 22,
    );
  }
}
