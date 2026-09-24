// Motor puro de Arkanoid, portado de references/started-games/04-arkanoid/game.js + levels.js.
// Sin document/window/Audio globales: recibe ctx, W, H y las teclas por parámetro.

export type Keys = Record<string, boolean>;

export type GameStatus = "playing" | "gameover" | "win";

const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (800 - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;
const EXPLOSION_DURATION = 300; // ms

const BLOCK_COLOR_HEX: Record<string, string> = {
  gray: "#808080",
  red: "#ff0000",
  yellow: "#ffff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  hotpink: "#ff69b4",
  green: "#008000",
};

interface LevelBlock {
  col: number;
  row: number;
  color: string;
}

interface Level {
  speed: number;
  blocks: LevelBlock[];
}

const LEVELS: Level[] = (() => {
  const rowColors1 = ["red", "yellow", "cyan", "magenta", "hotpink", "green"];
  const rowColors2 = ["gray", "cyan", "hotpink", "yellow", "magenta", "green"];
  const rowColors4 = ["cyan", "magenta", "green", "yellow", "hotpink", "red"];

  const l1: LevelBlock[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) l1.push({ col, row, color: rowColors1[row] });

  const l2: LevelBlock[] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < 6; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      l2.push({ col, row, color: rowColors2[row] });

  const l3: LevelBlock[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if ((col + row) % 2 === 0) l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });

  const gaps4 = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: LevelBlock[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if (!gaps4[row].includes(col)) l4.push({ col, row, color: rowColors4[row] });

  const l5: LevelBlock[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        l5.push({ col, row, color: isCross && !isFrame ? "hotpink" : "cyan" });
    }

  return [
    { speed: 1.0, blocks: l1 },
    { speed: 1.1, blocks: l2 },
    { speed: 1.21, blocks: l3 },
    { speed: 1.33, blocks: l4 },
    { speed: 1.46, blocks: l5 },
  ];
})();

export interface Paddle {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Ball {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}

export interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  alive: boolean;
}

export interface Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  elapsed: number;
}

export interface GameState {
  paddle: Paddle;
  ball: Ball;
  blocks: Block[];
  explosions: Explosion[];
  lives: number;
  score: number;
  level: number;
  state: GameStatus;
}

function initPaddle(W: number, H: number): Paddle {
  const w = 81;
  const h = 14;
  return { x: (W - w) / 2, y: H - 40, w, h };
}

function collideAABB(ball: Ball, block: Block): boolean {
  return (
    ball.x < block.x + block.w &&
    ball.x + ball.w > block.x &&
    ball.y < block.y + block.h &&
    ball.y + ball.h > block.y
  );
}

export function loadLevel(gs: GameState, n: number) {
  gs.level = n;
  const level = LEVELS[n - 1];
  gs.blocks = level.blocks.map((b) => ({
    x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
    y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
    w: BLOCK_W,
    h: BLOCK_H,
    color: b.color,
    alive: true,
  }));
  gs.explosions = [];
  gs.ball.x = gs.paddle.x + (gs.paddle.w - gs.ball.w) / 2;
  gs.ball.y = gs.paddle.y - gs.ball.h;
  gs.ball.vx = BASE_BALL_VX * level.speed;
  gs.ball.vy = BASE_BALL_VY * level.speed;
}

function initBall(gs: GameState) {
  const speed = LEVELS[gs.level - 1].speed;
  gs.ball.x = gs.paddle.x + (gs.paddle.w - gs.ball.w) / 2;
  gs.ball.y = gs.paddle.y - gs.ball.h;
  gs.ball.vx = BASE_BALL_VX * speed;
  gs.ball.vy = BASE_BALL_VY * speed;
}

export function initGame(W = 800, H = 600): GameState {
  const paddle = initPaddle(W, H);
  const gs: GameState = {
    paddle,
    ball: { x: 0, y: 0, w: 16, h: 16, vx: BASE_BALL_VX, vy: BASE_BALL_VY },
    blocks: [],
    explosions: [],
    lives: 3,
    score: 0,
    level: 1,
    state: "playing",
  };
  loadLevel(gs, 1);
  return gs;
}

export function endGame(gs: GameState) {
  gs.lives = 0;
  gs.state = "gameover";
}

export function update(gs: GameState, dt: number, W: number, H: number, keys: Keys) {
  if (gs.state !== "playing") return;

  const { paddle, ball } = gs;

  if (keys["ArrowLeft"]) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
  if (keys["ArrowRight"]) paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.x <= 0) {
    ball.x = 0;
    ball.vx = Math.abs(ball.vx);
  }
  if (ball.x + ball.w >= W) {
    ball.x = W - ball.w;
    ball.vx = -Math.abs(ball.vx);
  }
  if (ball.y <= 0) {
    ball.y = 0;
    ball.vy = Math.abs(ball.vy);
  }

  if (
    ball.vy > 0 &&
    ball.x + ball.w > paddle.x &&
    ball.x < paddle.x + paddle.w &&
    ball.y + ball.h >= paddle.y &&
    ball.y + ball.h <= paddle.y + paddle.h + 8
  ) {
    ball.y = paddle.y - ball.h;
    ball.vy = -Math.abs(ball.vy);
  }

  for (const block of gs.blocks) {
    if (!block.alive) continue;
    if (collideAABB(ball, block)) {
      block.alive = false;
      gs.explosions.push({ x: block.x, y: block.y, w: block.w, h: block.h, color: block.color, elapsed: 0 });
      gs.score += 10;
      ball.vy = -ball.vy;
      if (gs.blocks.every((b) => !b.alive)) {
        if (gs.level < 5) loadLevel(gs, gs.level + 1);
        else gs.state = "win";
      }
      break;
    }
  }

  for (const exp of gs.explosions) exp.elapsed += dt * 1000;
  gs.explosions = gs.explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

  if (ball.y > H) {
    gs.lives--;
    if (gs.lives <= 0) {
      gs.lives = 0;
      gs.state = "gameover";
    } else {
      initBall(gs);
    }
  }
}

export function draw(ctx: CanvasRenderingContext2D, gs: GameState, W: number, H: number) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  for (const block of gs.blocks) {
    if (!block.alive) continue;
    ctx.fillStyle = BLOCK_COLOR_HEX[block.color] ?? block.color;
    ctx.fillRect(block.x, block.y, block.w, block.h);
  }

  for (const exp of gs.explosions) {
    const alpha = Math.max(0, 1 - exp.elapsed / EXPLOSION_DURATION);
    ctx.fillStyle = BLOCK_COLOR_HEX[exp.color] ?? exp.color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(exp.x, exp.y, exp.w, exp.h);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = "#fff";
  ctx.fillRect(gs.paddle.x, gs.paddle.y, gs.paddle.w, gs.paddle.h);

  ctx.beginPath();
  ctx.arc(gs.ball.x + gs.ball.w / 2, gs.ball.y + gs.ball.h / 2, gs.ball.w / 2, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();

  if (gs.state === "gameover" || gs.state === "win") {
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 46px monospace";
    ctx.fillText(gs.state === "win" ? "GANASTE" : "GAME OVER", W / 2, H / 2 - 18);
    ctx.font = "18px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillText(`PUNTAJE: ${gs.score}`, W / 2, H / 2 + 22);
  }
}
