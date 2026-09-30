// Motor puro de ECO (game jam, tema "eco"): tu recorrido grabado vuelve como fantasma.
// Sin document/window/DOM: recibe ctx, W, H, input y dt por parámetro.
// Única lectura de reloj: initGame() cuando no se pasa seed. El resto es determinista (PRNG en gs.rng).

export type Input = { left: boolean; right: boolean; up: boolean; down: boolean };

export type Echo = { path: number[] };

export type Orb = { x: number; y: number; age: number };

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
};

export type GameStatus = "playing" | "intermission" | "gameover" | "win";

export type GameState = {
  state: GameStatus;
  px: number;
  py: number;
  lives: number;
  score: number;
  level: number;
  roundT: number;
  interT: number;
  invuln: number;
  streak: number;
  hitThisRound: boolean;
  orb: Orb | null;
  echoes: Echo[];
  rec: number[];
  recAcc: number;
  particles: Particle[];
  shake: number;
  flash: number;
  rng: number;
};

export const W = 800;
export const H = 600;
const MARGIN = 20;
const PLAYER_R = 10;
const ECHO_R = 10;
const HIT_DIST = PLAYER_R + ECHO_R - 2;
const ORB_R = 9;
const PLAYER_SPEED = 230;
const ROUND_TIME = 12;
const SAMPLE_HZ = 30;
const SAMPLE_DT = 1 / SAMPLE_HZ;
const MAX_SAMPLES = 360;
const MAX_ECHOES = 5;
const MAX_LEVEL = 12;
const INITIAL_LIVES = 3;
const HIT_INVULN = 1.5;
const INTERMISSION = 1.2;
const PHASE_GRACE = 1.0;
const ORB_MIN_DIST_PLAYER = 140;
const ORB_MIN_DIST_ECHO = 60;
const ORB_SPAWN_TRIES = 20;
const MAX_PARTICLES = 200;

const CX = W / 2;
const CY = H / 2;
const MIN_X = MARGIN + PLAYER_R;
const MAX_X = W - MARGIN - PLAYER_R;
const MIN_Y = MARGIN + PLAYER_R;
const MAX_Y = H - MARGIN - PLAYER_R;
const ORB_MIN_X = MARGIN + ORB_R;
const ORB_MAX_X = W - MARGIN - ORB_R;
const ORB_MIN_Y = MARGIN + ORB_R;
const ORB_MAX_Y = H - MARGIN - ORB_R;

export function rand(gs: GameState): number {
  // mulberry32
  gs.rng = (gs.rng + 0x6d2b79f5) >>> 0;
  let t = gs.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

type LevelParams = { echoSpeed: number; orbLife: number; grace: number };

const LEVELS: LevelParams[] = [
  { echoSpeed: 1.0, orbLife: 6.0, grace: PHASE_GRACE },
  { echoSpeed: 1.0, orbLife: 6.0, grace: PHASE_GRACE },
  { echoSpeed: 1.0, orbLife: 5.5, grace: PHASE_GRACE },
  { echoSpeed: 1.0, orbLife: 5.5, grace: PHASE_GRACE },
  { echoSpeed: 1.05, orbLife: 5.0, grace: 0.9 },
  { echoSpeed: 1.05, orbLife: 5.0, grace: 0.9 },
  { echoSpeed: 1.1, orbLife: 4.5, grace: 0.8 },
  { echoSpeed: 1.1, orbLife: 4.5, grace: 0.8 },
  { echoSpeed: 1.15, orbLife: 4.0, grace: 0.7 },
  { echoSpeed: 1.15, orbLife: 4.0, grace: 0.7 },
  { echoSpeed: 1.2, orbLife: 3.5, grace: 0.6 },
  { echoSpeed: 1.2, orbLife: 3.5, grace: 0.6 },
];

export function levelParams(level: number): LevelParams {
  return LEVELS[Math.min(Math.max(level, 1), MAX_LEVEL) - 1];
}

export function echoPos(echo: Echo, t: number, speed: number): { x: number; y: number } {
  const n = echo.path.length / 2;
  const f = Math.max(0, t) * speed * SAMPLE_HZ;
  const i = Math.floor(f);
  if (i + 1 >= n) {
    return { x: echo.path[(n - 1) * 2], y: echo.path[(n - 1) * 2 + 1] };
  }
  const k = f - i;
  const x0 = echo.path[i * 2];
  const y0 = echo.path[i * 2 + 1];
  return {
    x: x0 + (echo.path[i * 2 + 2] - x0) * k,
    y: y0 + (echo.path[i * 2 + 3] - y0) * k,
  };
}

export function spawnOrb(gs: GameState): Orb {
  const { echoSpeed } = levelParams(gs.level);
  const echoPositions = gs.echoes.map((e) => echoPos(e, gs.roundT, echoSpeed));
  for (let i = 0; i < ORB_SPAWN_TRIES; i++) {
    const x = ORB_MIN_X + rand(gs) * (ORB_MAX_X - ORB_MIN_X);
    const y = ORB_MIN_Y + rand(gs) * (ORB_MAX_Y - ORB_MIN_Y);
    if (Math.hypot(x - gs.px, y - gs.py) < ORB_MIN_DIST_PLAYER) continue;
    if (echoPositions.some((p) => Math.hypot(x - p.x, y - p.y) < ORB_MIN_DIST_ECHO)) continue;
    return { x, y, age: 0 };
  }
  return {
    x: gs.px < CX ? ORB_MAX_X : ORB_MIN_X,
    y: gs.py < CY ? ORB_MAX_Y : ORB_MIN_Y,
    age: 0,
  };
}

export function initGame(seed?: number): GameState {
  const gs: GameState = {
    state: "playing",
    px: CX,
    py: CY,
    lives: INITIAL_LIVES,
    score: 0,
    level: 1,
    roundT: 0,
    interT: 0,
    invuln: 0,
    streak: 0,
    hitThisRound: false,
    orb: null,
    echoes: [],
    rec: [CX, CY],
    recAcc: 0,
    particles: [],
    shake: 0,
    flash: 0,
    rng: seed ?? Date.now() >>> 0,
  };
  gs.orb = spawnOrb(gs);
  return gs;
}

export function endGame(gs: GameState): void {
  gs.lives = 0;
  gs.state = "gameover";
}

function spawnBurst(gs: GameState, x: number, y: number, color: string, n: number): void {
  for (let i = 0; i < n && gs.particles.length < MAX_PARTICLES; i++) {
    const ang = rand(gs) * Math.PI * 2;
    const speed = 60 + rand(gs) * 120;
    const life = 0.4 + rand(gs) * 0.4;
    gs.particles.push({
      x,
      y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      life,
      maxLife: life,
      color,
    });
  }
}

function updateParticles(gs: GameState, dt: number): void {
  for (const p of gs.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  gs.particles = gs.particles.filter((p) => p.life > 0);
}

function collectOrb(gs: GameState): void {
  if (!gs.orb) return;
  const base = 100 + Math.floor(Math.max(0, 50 - gs.orb.age * 10));
  const mult = 1 + 0.25 * Math.min(gs.streak, 8);
  gs.score += Math.round(base * mult);
  gs.streak += 1;
  spawnBurst(gs, gs.orb.x, gs.orb.y, "#f5ff00", 12);
  gs.orb = spawnOrb(gs);
}

function hitPlayer(gs: GameState): void {
  gs.lives -= 1;
  gs.invuln = HIT_INVULN;
  gs.streak = 0;
  gs.hitThisRound = true;
  spawnBurst(gs, gs.px, gs.py, "#ff006e", 24);
  gs.flash = 0.6;
  gs.shake = 8;
  if (gs.lives <= 0) endGame(gs);
}

function endRound(gs: GameState): void {
  gs.score += 50 * gs.level;
  if (!gs.hitThisRound) gs.score += 200;
  spawnBurst(gs, gs.px, gs.py, "#00f5ff", 30);
  gs.flash = 0.3;
  gs.echoes.push({ path: gs.rec });
  if (gs.echoes.length > MAX_ECHOES) gs.echoes.shift();
  if (gs.level >= MAX_LEVEL) {
    gs.state = "win";
    return;
  }
  gs.level += 1;
  gs.state = "intermission";
  gs.interT = INTERMISSION;
  gs.px = CX;
  gs.py = CY;
  gs.orb = null;
  gs.invuln = 0;
}

export function update(gs: GameState, dt: number, input: Input): void {
  if (gs.state === "gameover" || gs.state === "win") return;

  updateParticles(gs, dt);
  gs.flash *= Math.max(0, 1 - 4 * dt);
  gs.shake = Math.max(0, gs.shake - 30 * dt);

  if (gs.state === "intermission") {
    gs.interT -= dt;
    if (gs.interT <= 0) {
      gs.state = "playing";
      gs.roundT = 0;
      gs.rec = [gs.px, gs.py];
      gs.recAcc = 0;
      gs.hitThisRound = false;
      gs.orb = spawnOrb(gs);
    }
    return;
  }

  const { echoSpeed, orbLife, grace } = levelParams(gs.level);

  gs.roundT += dt;

  let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (dx !== 0 && dy !== 0) {
    dx *= 0.7071;
    dy *= 0.7071;
  }
  gs.px = Math.min(MAX_X, Math.max(MIN_X, gs.px + dx * PLAYER_SPEED * dt));
  gs.py = Math.min(MAX_Y, Math.max(MIN_Y, gs.py + dy * PLAYER_SPEED * dt));

  gs.recAcc += dt;
  while (gs.recAcc >= SAMPLE_DT) {
    if (gs.rec.length < MAX_SAMPLES * 2) gs.rec.push(gs.px, gs.py);
    gs.recAcc -= SAMPLE_DT;
  }

  gs.invuln = Math.max(0, gs.invuln - dt);

  if (gs.orb) {
    gs.orb.age += dt;
    if (gs.orb.age >= orbLife) {
      gs.orb = spawnOrb(gs);
    } else if (Math.hypot(gs.px - gs.orb.x, gs.py - gs.orb.y) <= PLAYER_R + ORB_R) {
      collectOrb(gs);
    }
  }

  if (gs.roundT >= grace && gs.invuln === 0) {
    for (const echo of gs.echoes) {
      const pos = echoPos(echo, gs.roundT, echoSpeed);
      if (Math.hypot(gs.px - pos.x, gs.py - pos.y) < HIT_DIST) {
        hitPlayer(gs);
        break;
      }
    }
  }

  if (gs.state === "playing" && gs.roundT >= ROUND_TIME) endRound(gs);
}

export function draw(ctx: CanvasRenderingContext2D, gs: GameState, w: number, h: number): void {
  const { echoSpeed, orbLife, grace } = levelParams(gs.level);
  const intermission = gs.state === "intermission";
  const t = intermission ? 0 : gs.roundT;

  // Fondo + grilla
  ctx.fillStyle = "#0a0a18";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 40) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
  }
  for (let y = 0; y <= h; y += 40) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
  }
  ctx.stroke();

  // Shake: desplaza la escena (no el fondo) con offset aleatorio del PRNG del estado
  ctx.save();
  if (gs.shake > 0) {
    ctx.translate((rand(gs) * 2 - 1) * gs.shake, (rand(gs) * 2 - 1) * gs.shake);
  }

  // Borde de arena
  ctx.strokeStyle = "#ff006e";
  ctx.lineWidth = 2;
  ctx.strokeRect(MARGIN, MARGIN, w - MARGIN * 2, h - MARGIN * 2);

  // Ecos con estela de 8 muestras previas
  const echoAlpha = t < grace ? 0.35 : 0.9;
  ctx.fillStyle = "#ff006e";
  for (const echo of gs.echoes) {
    for (let k = 8; k >= 1; k--) {
      const p = echoPos(echo, t - (k * SAMPLE_DT) / echoSpeed, echoSpeed);
      ctx.globalAlpha = echoAlpha * (1 - k / 9) * 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, ECHO_R, 0, Math.PI * 2);
      ctx.fill();
    }
    const pos = echoPos(echo, t, echoSpeed);
    ctx.globalAlpha = echoAlpha;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, ECHO_R, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Orbe con halo y anillo que se encoge
  if (gs.orb) {
    const life = Math.min(1, gs.orb.age / orbLife);
    ctx.save();
    ctx.shadowColor = "#f5ff00";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#f5ff00";
    ctx.beginPath();
    ctx.arc(gs.orb.x, gs.orb.y, ORB_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#f5ff00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(gs.orb.x, gs.orb.y, ORB_R + 3 + (1 - life) * 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Partículas
  for (const p of gs.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
  }
  ctx.globalAlpha = 1;

  // Estela del jugador: últimas 10 muestras de la grabación
  if (gs.state === "playing") {
    const n = gs.rec.length / 2;
    const from = Math.max(0, n - 10);
    ctx.fillStyle = "#00f5ff";
    for (let i = from; i < n; i++) {
      ctx.globalAlpha = ((i - from + 1) / 10) * 0.3;
      ctx.beginPath();
      ctx.arc(gs.rec[i * 2], gs.rec[i * 2 + 1], PLAYER_R * (0.5 + (i - from) / 20), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Jugador (parpadea con invulnerabilidad)
  ctx.globalAlpha = gs.invuln > 0 && Math.floor(gs.invuln / 0.1) % 2 === 0 ? 0.3 : 1;
  ctx.fillStyle = "#00f5ff";
  ctx.beginPath();
  ctx.arc(gs.px, gs.py, PLAYER_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Barra de tiempo de ronda
  const frac = intermission ? 1 : Math.max(0, 1 - gs.roundT / ROUND_TIME);
  ctx.fillStyle = "#00f5ff";
  ctx.fillRect(0, h - 4, frac * w, 4);

  // Texto en canvas
  ctx.fillStyle = "#e8e8f5";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`RONDA ${gs.level} · ECOS ${gs.echoes.length}`, MARGIN + 8, MARGIN + 8);

  if (intermission) {
    ctx.font = "bold 48px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ff006e";
    ctx.fillText(`RONDA ${gs.level}`, w / 2, h / 2 - 60);
    if (!gs.hitThisRound) {
      ctx.font = "bold 22px monospace";
      ctx.fillStyle = "#f5ff00";
      ctx.fillText("¡RONDA PERFECTA +200!", w / 2, h / 2 - 10);
    }
  }

  if (gs.state === "win") {
    ctx.font = "bold 40px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f5ff00";
    ctx.fillText("¡SOBREVIVISTE A TU ECO!", w / 2, h / 2 - 60);
  }

  ctx.restore();

  // Flash magenta sobre toda la arena
  if (gs.flash > 0.01) {
    ctx.fillStyle = `rgba(255,0,110,${gs.flash * 0.5})`;
    ctx.fillRect(0, 0, w, h);
  }
}
