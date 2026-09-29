// Motor puro de Frogger, diseñado desde cero (sin game.js fuente de referencia).
// Todo se dibuja con primitivas canvas (sin sprites bitmap).
// Sin document/window/DOM: recibe ctx, W, H, el input y la paleta por parámetro.

import type { Skin } from "@/lib/skins";

export const COLS = 16;
export const ROWS = 14;
export const CELL = 40;
export const CANVAS_W = COLS * CELL; // 640
export const CANVAS_H = ROWS * CELL; // 560

// Zonas (índice de fila, 0 = arriba)
export const ROW_GOALS = 0;
export const ROW_RIVER_TOP = 1;
export const ROW_RIVER_BOT = 6;
export const ROW_SAFE_MID = 7;
export const ROW_ROAD_TOP = 8;
export const ROW_ROAD_BOT = 12;
export const ROW_START = 13;

export type Direction = "up" | "down" | "left" | "right";

export type EntityType = "car" | "truck" | "log" | "turtle";

export type Entity = {
  col: number;
  width: number;
  type: EntityType;
  submerged?: boolean;
  /** Solo tortugas: ms transcurridos dentro del ciclo de inmersión. */
  phase?: number;
};

export type Lane = {
  row: number;
  speed: number;
  dir: 1 | -1;
  entities: Entity[];
};

export type Frog = {
  col: number;
  row: number;
  animating: boolean;
  animT: number;
  targetCol: number;
  targetRow: number;
};

// Cada carril es periódico: las entidades reaparecen al salir sumando/restando LANE_WRAP,
// así los huecos del diseño inicial se conservan indefinidamente.
export const LANE_WRAP = COLS + 4;

export const LEVEL_SPEED_FACTOR = 1.15;
export const TURTLE_VISIBLE_MS = 3000;
export const TURTLE_SUBMERGED_MS = 1500;
export const TURTLE_CYCLE_MS = TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS;

type LaneSpec = {
  row: number;
  speed: number; // px/frame (a 16 ms) en nivel 1
  dir: 1 | -1;
  type: EntityType;
  widths: number[];
};

const ROAD_LANES: LaneSpec[] = [
  { row: 12, speed: 1.5, dir: 1, type: "car", widths: [2, 2, 2] },
  { row: 11, speed: 2.0, dir: -1, type: "truck", widths: [3, 3] },
  { row: 10, speed: 2.5, dir: 1, type: "car", widths: [1, 2, 1, 2] },
  { row: 9, speed: 3.0, dir: -1, type: "car", widths: [2, 2, 2, 2] },
  { row: 8, speed: 4.0, dir: 1, type: "car", widths: [1, 1, 1, 1, 1] },
];

const RIVER_LANES: LaneSpec[] = [
  { row: 6, speed: 1.5, dir: 1, type: "log", widths: [3, 3, 3] },
  { row: 5, speed: 1.0, dir: -1, type: "turtle", widths: [2, 2, 2, 2] },
  { row: 4, speed: 2.5, dir: 1, type: "log", widths: [4, 4] },
  { row: 3, speed: 1.8, dir: -1, type: "log", widths: [2, 2, 2] },
  { row: 2, speed: 3.0, dir: 1, type: "log", widths: [4, 4, 4] },
  { row: 1, speed: 2.0, dir: -1, type: "turtle", widths: [3, 3, 3] },
];

function buildLane(spec: LaneSpec, factor: number): Lane {
  const total = spec.widths.reduce((a, b) => a + b, 0);
  const gap = (LANE_WRAP - total) / spec.widths.length; // siempre >= 1 celda
  let col = 0;
  const entities = spec.widths.map((width, i) => {
    const entity: Entity = { col, width, type: spec.type };
    if (spec.type === "turtle") {
      entity.phase = (i * TURTLE_CYCLE_MS) / spec.widths.length;
      entity.submerged = entity.phase >= TURTLE_VISIBLE_MS;
    }
    col += width + gap;
    return entity;
  });
  return { row: spec.row, speed: spec.speed * factor, dir: spec.dir, entities };
}

/** Carriles de carretera (filas 8–12) y río (filas 1–6); cada nivel sube la velocidad un 15 %. */
export function buildLanes(level: number): Lane[] {
  const factor = LEVEL_SPEED_FACTOR ** (level - 1);
  return [...RIVER_LANES, ...ROAD_LANES].map((spec) => buildLane(spec, factor));
}

// ===== Estado y game loop =====

export type GameStatus = "playing" | "gameover";

export type GameState = {
  frog: Frog;
  lanes: Lane[];
  goals: boolean[];
  score: number;
  level: number;
  lives: number;
  state: GameStatus;
  timeLeft: number; // ms restantes de la ronda
  pendingDir: Direction | null;
  maxRow: number; // fila más avanzada alcanzada en esta ronda (puntuación por avance)
};

export const INITIAL_LIVES = 3;
export const JUMP_MS = 120;
export const GOAL_COUNT = 5;
export const GOAL_COLS = [1, 4, 7, 10, 13]; // cada boca ocupa 2 columnas
const START_COL = COLS / 2;
const FRAME_MS = 16;

const DIR_DELTA: Record<Direction, { dc: number; dr: number }> = {
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
};

/** 15 s en nivel 1; -1 s por nivel con mínimo de 8 s. */
export function roundTimeMs(level: number): number {
  return Math.max(8000, 15000 - (level - 1) * 1000);
}

function newFrog(): Frog {
  return {
    col: START_COL,
    row: ROW_START,
    animating: false,
    animT: 0,
    targetCol: START_COL,
    targetRow: ROW_START,
  };
}

export function initGame(): GameState {
  return {
    frog: newFrog(),
    lanes: buildLanes(1),
    goals: Array<boolean>(GOAL_COUNT).fill(false),
    score: 0,
    level: 1,
    lives: INITIAL_LIVES,
    state: "playing",
    timeLeft: roundTimeMs(1),
    pendingDir: null,
    maxRow: ROW_START,
  };
}

export function queueMove(gs: GameState, dir: Direction) {
  if (gs.state === "gameover") return;
  gs.pendingDir = dir;
}

export function endGame(gs: GameState) {
  gs.state = "gameover";
}

function inRiver(row: number): boolean {
  return row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT;
}

function laneAt(lanes: Lane[], row: number): Lane | undefined {
  return lanes.find((l) => l.row === row);
}

/** Desplazamiento (en celdas) de un carril durante dtMs. */
function laneDelta(lane: Lane, dtMs: number): number {
  return (lane.speed * lane.dir * (dtMs / FRAME_MS)) / CELL;
}

/** Entidad de río que sostiene a la rana (por su centro), o null. Tortugas sumergidas no sostienen. */
export function getSupport(frog: Frog, lanes: Lane[]): Entity | null {
  const lane = laneAt(lanes, frog.row);
  if (!lane || !inRiver(frog.row)) return null;
  const center = frog.col + 0.5;
  for (const e of lane.entities) {
    if (center >= e.col && center < e.col + e.width) {
      return e.type === "turtle" && e.submerged ? null : e;
    }
  }
  return null;
}

function moveLanes(gs: GameState, dtMs: number) {
  for (const lane of gs.lanes) {
    const delta = laneDelta(lane, dtMs);
    for (const e of lane.entities) {
      e.col += delta;
      if (lane.dir === 1 && e.col >= COLS) e.col -= LANE_WRAP;
      else if (lane.dir === -1 && e.col + e.width <= 0) e.col += LANE_WRAP;
      if (e.type === "turtle") {
        e.phase = ((e.phase ?? 0) + dtMs) % TURTLE_CYCLE_MS;
        e.submerged = e.phase >= TURTLE_VISIBLE_MS;
      }
    }
  }
}

function startJump(gs: GameState) {
  const frog = gs.frog;
  const dir = gs.pendingDir;
  gs.pendingDir = null;
  if (!dir) return;
  const { dc, dr } = DIR_DELTA[dir];
  const targetCol = Math.round(frog.col) + dc;
  const targetRow = frog.row + dr;
  if (targetCol < 0 || targetCol >= COLS) return;
  if (targetRow < ROW_GOALS || targetRow > ROW_START) return;
  frog.animating = true;
  frog.animT = 0;
  frog.targetCol = targetCol;
  frog.targetRow = targetRow;
}

/** true si algún vehículo de la carretera solapa el cuerpo de la rana (28 px de ancho). */
export function checkRoadCollision(frog: Frog, lanes: Lane[]): boolean {
  if (frog.row < ROW_ROAD_TOP || frog.row > ROW_ROAD_BOT) return false;
  const lane = laneAt(lanes, frog.row);
  if (!lane) return false;
  const left = frog.col + 0.15;
  const right = frog.col + 0.85;
  return lane.entities.some((e) => left < e.col + e.width && right > e.col);
}

/**
 * Al llegar a la fila de metas: marca la boca libre y suma puntos.
 * "death" si la rana no está sobre una boca o la boca ya estaba ocupada.
 */
export function checkGoal(gs: GameState): "none" | "goal" | "death" {
  if (gs.frog.row !== ROW_GOALS) return "none";
  const center = gs.frog.col + 0.5;
  const i = GOAL_COLS.findIndex((c) => center >= c && center < c + 2);
  if (i === -1 || gs.goals[i]) return "death";
  gs.goals[i] = true;
  gs.score += 50 + Math.floor(gs.timeLeft / 1000) * 10;
  return "goal";
}

// Paso 5: resuelve la celda de destino tras completar un salto.
function resolveLanding(gs: GameState) {
  const frog = gs.frog;

  if (checkRoadCollision(frog, gs.lanes)) return killFrog(gs);
  if (inRiver(frog.row) && !getSupport(frog, gs.lanes)) return killFrog(gs);

  if (frog.row < gs.maxRow) {
    gs.score += (gs.maxRow - frog.row) * 10;
    gs.maxRow = frog.row;
  }

  const goal = checkGoal(gs);
  if (goal === "death") return killFrog(gs);
  if (goal === "goal") {
    if (gs.goals.every(Boolean)) completeRound(gs);
    else respawnFrog(gs);
  }
}

/** Rana de vuelta a la fila de inicio (columna central) con el temporizador reiniciado. */
function respawnFrog(gs: GameState) {
  gs.frog = newFrog();
  gs.pendingDir = null;
  gs.timeLeft = roundTimeMs(gs.level);
}

// Paso 6: las 5 bocas llenas → +200, siguiente nivel con carriles más rápidos.
function completeRound(gs: GameState) {
  gs.score += 200;
  gs.level += 1;
  gs.goals = Array<boolean>(GOAL_COUNT).fill(false);
  gs.lanes = buildLanes(gs.level);
  gs.maxRow = ROW_START;
  respawnFrog(gs);
}

// Paso 7: resta una vida; sin vidas → game over, si no la rana reaparece.
function killFrog(gs: GameState) {
  if (gs.state === "gameover") return;
  gs.lives -= 1;
  if (gs.lives <= 0) {
    gs.lives = 0;
    endGame(gs);
    return;
  }
  respawnFrog(gs);
}

export function update(gs: GameState, dtMs: number) {
  if (gs.state === "gameover") return;
  const frog = gs.frog;

  moveLanes(gs, dtMs);

  if (!frog.animating && gs.pendingDir) startJump(gs);

  if (frog.animating) {
    frog.animT += dtMs;
    if (frog.animT >= JUMP_MS) {
      frog.col = frog.targetCol;
      frog.row = frog.targetRow;
      frog.animating = false;
      frog.animT = 0;
      resolveLanding(gs);
    }
  } else if (checkRoadCollision(frog, gs.lanes)) {
    killFrog(gs);
  } else if (inRiver(frog.row)) {
    const support = getSupport(frog, gs.lanes);
    if (support) {
      frog.col += laneDelta(laneAt(gs.lanes, frog.row)!, dtMs);
      if (frog.col + 0.5 < 0 || frog.col + 0.5 > COLS) killFrog(gs);
    } else {
      killFrog(gs);
    }
  }

  gs.timeLeft -= dtMs;
  if (gs.timeLeft <= 0) {
    gs.timeLeft = 0;
    killFrog(gs);
  }
}

// ===== Dibujo =====

export type Palette = {
  goalsBg: string;
  goalMouth: string;
  goalBorder: string;
  river: string;
  safe: string;
  road: string;
  roadLine: string;
  log: string;
  logLine: string;
  turtle: string;
  turtleScale: string;
  turtleSubmerged: string;
  truck: string;
  truckCab: string;
  cars: string[];
  wheel: string;
  frog: string;
  frogEye: string;
  frogPupil: string;
  hudText: string;
  overlay: string;
  gameOver: string;
  timeBar: [string, string, string]; // >50 %, >25 %, resto
  /** Radio de shadowBlur (0 = sin glow). */
  glow: number;
  /** Retro: ruedas y ojos cuadrados, trazos gruesos. */
  blocky: boolean;
  lineWidth: number;
};

export const PALETTES: Record<Skin, Palette> = {
  clasico: {
    goalsBg: "#0b3d1e",
    goalMouth: "#4caf50",
    goalBorder: "#d4af37",
    river: "#0a2a5a",
    safe: "#14532d",
    road: "#111116",
    roadLine: "#2a2a35",
    log: "#7a4a1e",
    logLine: "#5a3512",
    turtle: "#2e9e4a",
    turtleScale: "#1c6b30",
    turtleSubmerged: "rgba(46,158,74,0.35)",
    truck: "#8a8a99",
    truckCab: "#55556a",
    cars: ["#e53935", "#fdd835", "#1e88e5"],
    wheel: "#000000",
    frog: "#39ff14",
    frogEye: "#ffffff",
    frogPupil: "#000000",
    hudText: "#ffffff",
    overlay: "rgba(10,10,20,0.85)",
    gameOver: "#e57373",
    timeBar: ["#39ff14", "#fdd835", "#e53935"],
    glow: 0,
    blocky: false,
    lineWidth: 2,
  },
  neon: {
    goalsBg: "#05010f",
    goalMouth: "#00ffd0",
    goalBorder: "#ff2bd6",
    river: "#020818",
    safe: "#0a0620",
    road: "#05050a",
    roadLine: "#00e5ff",
    log: "#ff9100",
    logLine: "#ffd180",
    turtle: "#00ff9c",
    turtleScale: "#00b36e",
    turtleSubmerged: "rgba(0,255,156,0.3)",
    truck: "#b388ff",
    truckCab: "#7c4dff",
    cars: ["#ff1744", "#ffea00", "#00e5ff"],
    wheel: "#000000",
    frog: "#39ff14",
    frogEye: "#ffffff",
    frogPupil: "#000000",
    hudText: "#e0f7ff",
    overlay: "rgba(2,0,12,0.88)",
    gameOver: "#ff1744",
    timeBar: ["#39ff14", "#ffea00", "#ff1744"],
    glow: 12,
    blocky: false,
    lineWidth: 2,
  },
  retro: {
    goalsBg: "#003300",
    goalMouth: "#00aa00",
    goalBorder: "#ffff55",
    river: "#0000aa",
    safe: "#005500",
    road: "#000000",
    roadLine: "#555555",
    log: "#aa5500",
    logLine: "#552a00",
    turtle: "#00aa00",
    turtleScale: "#005500",
    turtleSubmerged: "#000088",
    truck: "#aaaaaa",
    truckCab: "#555555",
    cars: ["#ff5555", "#ffff55", "#5555ff"],
    wheel: "#000000",
    frog: "#55ff55",
    frogEye: "#ffffff",
    frogPupil: "#000000",
    hudText: "#ffffff",
    overlay: "#000000",
    gameOver: "#ff5555",
    timeBar: ["#55ff55", "#ffff55", "#ff5555"],
    glow: 0,
    blocky: true,
    lineWidth: 4,
  },
};

/** Activa glow del color dado (no-op si la paleta no lo usa). Llamar a noGlow al terminar. */
function glowOn(ctx: CanvasRenderingContext2D, pal: Palette, color: string) {
  if (!pal.glow) return;
  ctx.shadowColor = color;
  ctx.shadowBlur = pal.glow;
}

function noGlow(ctx: CanvasRenderingContext2D) {
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
}

function dot(ctx: CanvasRenderingContext2D, pal: Palette, x: number, y: number, r: number) {
  if (pal.blocky) ctx.fillRect(x - r, y - r, r * 2, r * 2);
  else {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, pal: Palette) {
  const band = (r0: number, r1: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, r0 * CELL, CANVAS_W, (r1 - r0 + 1) * CELL);
  };
  band(ROW_GOALS, ROW_GOALS, pal.goalsBg);
  band(ROW_RIVER_TOP, ROW_RIVER_BOT, pal.river);
  band(ROW_SAFE_MID, ROW_SAFE_MID, pal.safe);
  band(ROW_ROAD_TOP, ROW_ROAD_BOT, pal.road);
  band(ROW_START, ROW_START, pal.safe);

  ctx.strokeStyle = pal.roadLine;
  ctx.setLineDash([16, 16]);
  ctx.lineWidth = pal.lineWidth;
  glowOn(ctx, pal, pal.roadLine);
  for (let r = ROW_ROAD_TOP + 1; r <= ROW_ROAD_BOT; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL);
    ctx.lineTo(CANVAS_W, r * CELL);
    ctx.stroke();
  }
  noGlow(ctx);
  ctx.setLineDash([]);
}

function drawFrogShape(
  ctx: CanvasRenderingContext2D,
  pal: Palette,
  cx: number,
  cy: number,
  legs: boolean,
) {
  glowOn(ctx, pal, pal.frog);
  ctx.fillStyle = pal.frog;
  if (legs) {
    ctx.strokeStyle = pal.frog;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 8);
    ctx.lineTo(cx - 18, cy - 14);
    ctx.moveTo(cx + 12, cy - 8);
    ctx.lineTo(cx + 18, cy - 14);
    ctx.moveTo(cx - 12, cy + 8);
    ctx.lineTo(cx - 18, cy + 14);
    ctx.moveTo(cx + 12, cy + 8);
    ctx.lineTo(cx + 18, cy + 14);
    ctx.stroke();
  }
  if (pal.blocky) ctx.fillRect(cx - 14, cy - 12, 28, 24);
  else {
    ctx.beginPath();
    ctx.ellipse(cx, cy, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  noGlow(ctx);
  for (const dx of [-6, 6]) {
    ctx.fillStyle = pal.frogEye;
    dot(ctx, pal, cx + dx, cy - 8, 4);
    ctx.fillStyle = pal.frogPupil;
    dot(ctx, pal, cx + dx, cy - 8, 2);
  }
}

function drawEntity(
  ctx: CanvasRenderingContext2D,
  pal: Palette,
  e: Entity,
  row: number,
  dir: 1 | -1,
) {
  const x = e.col * CELL;
  const y = row * CELL;
  const w = e.width * CELL;

  switch (e.type) {
    case "car": {
      const color = pal.cars[(row + e.width) % pal.cars.length];
      glowOn(ctx, pal, color);
      ctx.fillStyle = color;
      ctx.fillRect(x + 3, y + 8, w - 6, 24);
      noGlow(ctx);
      ctx.fillStyle = pal.wheel;
      for (const wx of [x + 10, x + w - 10]) dot(ctx, pal, wx, y + 32, 4);
      break;
    }
    case "truck": {
      glowOn(ctx, pal, pal.truck);
      ctx.fillStyle = pal.truck;
      ctx.fillRect(x + 3, y + 6, w - 6, 28);
      noGlow(ctx);
      ctx.fillStyle = pal.truckCab;
      const cabX = dir === 1 ? x + w - 3 - CELL * 0.8 : x + 3;
      ctx.fillRect(cabX, y + 6, CELL * 0.8, 28);
      ctx.fillStyle = pal.wheel;
      for (let i = 0; i < e.width; i++) dot(ctx, pal, x + CELL * i + 20, y + 34, 4);
      break;
    }
    case "log": {
      glowOn(ctx, pal, pal.log);
      ctx.fillStyle = pal.log;
      ctx.fillRect(x + 2, y + 6, w - 4, 28);
      noGlow(ctx);
      ctx.strokeStyle = pal.logLine;
      ctx.lineWidth = pal.lineWidth;
      for (let lx = x + 12; lx < x + w - 6; lx += 16) {
        ctx.beginPath();
        ctx.moveTo(lx, y + 8);
        ctx.lineTo(lx, y + 32);
        ctx.stroke();
      }
      break;
    }
    case "turtle": {
      for (let i = 0; i < e.width; i++) {
        const cx = x + CELL * i + 20;
        const cy = y + 20;
        if (e.submerged) {
          ctx.strokeStyle = pal.turtleSubmerged;
          ctx.lineWidth = pal.lineWidth;
          if (pal.blocky) ctx.strokeRect(cx - 14, cy - 14, 28, 28);
          else {
            ctx.beginPath();
            ctx.arc(cx, cy, 14, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else {
          glowOn(ctx, pal, pal.turtle);
          ctx.fillStyle = pal.turtle;
          if (pal.blocky) ctx.fillRect(cx - 14, cy - 14, 28, 28);
          else {
            ctx.beginPath();
            ctx.arc(cx, cy, 14, 0, Math.PI * 2);
            ctx.fill();
          }
          noGlow(ctx);
          ctx.strokeStyle = pal.turtleScale;
          ctx.lineWidth = pal.lineWidth;
          ctx.beginPath();
          if (!pal.blocky) ctx.arc(cx, cy, 7, 0, Math.PI * 2);
          ctx.moveTo(cx - 14, cy);
          ctx.lineTo(cx + 14, cy);
          ctx.moveTo(cx, cy - 14);
          ctx.lineTo(cx, cy + 14);
          ctx.stroke();
        }
      }
      break;
    }
  }
}

function drawGoals(ctx: CanvasRenderingContext2D, gs: GameState, pal: Palette) {
  GOAL_COLS.forEach((col, i) => {
    const x = col * CELL;
    ctx.fillStyle = pal.goalMouth;
    ctx.fillRect(x, 16, CELL * 2, CELL - 16);
    ctx.strokeStyle = pal.goalBorder;
    ctx.lineWidth = pal.lineWidth;
    glowOn(ctx, pal, pal.goalBorder);
    ctx.strokeRect(x + 1, 17, CELL * 2 - 2, CELL - 18);
    noGlow(ctx);
    if (gs.goals[i]) drawFrogShape(ctx, pal, x + CELL, 28, false);
  });
}

function drawFrog(ctx: CanvasRenderingContext2D, frog: Frog, pal: Palette) {
  const t = frog.animating ? Math.min(frog.animT / JUMP_MS, 1) : 0;
  const col = frog.col + (frog.targetCol - frog.col) * t;
  const row = frog.row + (frog.targetRow - frog.row) * t;
  drawFrogShape(ctx, pal, col * CELL + CELL / 2, row * CELL + CELL / 2, frog.animating);
}

function drawHud(ctx: CanvasRenderingContext2D, gs: GameState, pal: Palette) {
  const ratio = gs.timeLeft / roundTimeMs(gs.level);
  const barColor = ratio > 0.5 ? pal.timeBar[0] : ratio > 0.25 ? pal.timeBar[1] : pal.timeBar[2];
  ctx.fillStyle = barColor;
  glowOn(ctx, pal, barColor);
  ctx.fillRect(0, 0, CANVAS_W * ratio, 4);
  noGlow(ctx);

  ctx.fillStyle = pal.hudText;
  ctx.font = "bold 12px 'Courier New', monospace";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(`PUNTOS ${gs.score}`, 8, 11);
  ctx.textAlign = "center";
  ctx.fillText(`NIVEL ${gs.level}`, CANVAS_W / 2, 11);

  ctx.fillStyle = pal.frog;
  glowOn(ctx, pal, pal.frog);
  for (let i = 0; i < gs.lives; i++) dot(ctx, pal, CANVAS_W - 14 - i * 18, 11, 6);
  noGlow(ctx);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

export function draw(
  ctx: CanvasRenderingContext2D,
  gs: GameState,
  W: number,
  H: number,
  pal: Palette = PALETTES.clasico,
) {
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, pal);
  drawGoals(ctx, gs, pal);
  for (const lane of gs.lanes) {
    for (const e of lane.entities) drawEntity(ctx, pal, e, lane.row, lane.dir);
  }
  drawFrog(ctx, gs.frog, pal);
  drawHud(ctx, gs, pal);

  if (gs.state === "gameover") {
    ctx.fillStyle = pal.overlay;
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = pal.gameOver;
    glowOn(ctx, pal, pal.gameOver);
    ctx.font = "bold 32px 'Courier New', monospace";
    ctx.fillText("GAME OVER", W / 2, H / 2 - 16);
    ctx.fillStyle = pal.frog;
    glowOn(ctx, pal, pal.frog);
    ctx.font = "bold 18px 'Courier New', monospace";
    ctx.fillText(`PUNTOS: ${gs.score}`, W / 2, H / 2 + 24);
    noGlow(ctx);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}
