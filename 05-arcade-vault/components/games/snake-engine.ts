// Motor puro de Snake, diseñado desde cero (sin game.js fuente de referencia).
// Sprites de frutas portados de references/source-assets/snake-assets/sprites.js.
// Sin document/window/DOM: recibe ctx, W, H, la imagen ya cargada y acciones por parámetro.

export type Vec2 = { x: number; y: number };

export type FruitKind = keyof typeof FRUIT_ATLAS;

export type Fruit = Vec2 & { kind: FruitKind };

export type GameStatus = "playing" | "gameover";

export type GameState = {
  snake: Vec2[];
  dir: Vec2;
  nextDir: Vec2;
  fruit: Fruit;
  score: number;
  level: number;
  lives: 0;
  state: GameStatus;
  moveAccum: number;
  moveInterval: number;
};

const COLS = 20;
const ROWS = 20;
const CELL = 30;

const BOARD_W = COLS * CELL;
const BOARD_H = ROWS * CELL;
const BOARD_X = 40;
const BOARD_Y = 0;
const PANEL_X = BOARD_X + BOARD_W + 40;

const GRID_LINE = "#22222e";
const BOARD_BG = "#1a1a25";
const SNAKE_BODY = "#7aa2f7";
const SNAKE_HEAD = "#a9c1ff";

const POINTS_PER_FRUIT = 10;
const LEVEL_UP_FRUITS = 5;
const BASE_MOVE_INTERVAL = 140;
const MIN_MOVE_INTERVAL = 60;
const INTERVAL_STEP_PER_LEVEL = 10;

// Hoja fuente: fruits.png, 3790x442px, fondo transparente. Fila usada: y=136-295 (160px alto).
export const FRUIT_ATLAS: Record<string, { x: number; y: number; w: number; h: number }> = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  garlic: { x: 540, y: 136, w: 130, h: 160 },
  eggplant: { x: 712, y: 136, w: 130, h: 160 },
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  carrot: { x: 1228, y: 136, w: 130, h: 160 },
  mushroom: { x: 1400, y: 136, w: 130, h: 160 },
  broccoli: { x: 1582, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  pepper: { x: 1906, y: 136, w: 150, h: 160 },
  kiwi: { x: 2068, y: 136, w: 170, h: 160 },
  lemon: { x: 2250, y: 136, w: 140, h: 160 },
  peach: { x: 2432, y: 136, w: 130, h: 160 },
  peanut: { x: 2604, y: 136, w: 130, h: 160 },
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  tomato: { x: 2948, y: 136, w: 130, h: 160 },
  berries: { x: 3110, y: 136, w: 150, h: 160 },
  grapes2: { x: 3302, y: 136, w: 110, h: 160 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160 },
  melon: { x: 3637, y: 136, w: 130, h: 160 },
};

const FRUIT_KINDS = Object.keys(FRUIT_ATLAS) as FruitKind[];

function randomFruitKind(): FruitKind {
  return FRUIT_KINDS[Math.floor(Math.random() * FRUIT_KINDS.length)];
}

function randomFreeCell(snake: Vec2[]): Vec2 {
  let cell: Vec2;
  do {
    cell = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some((s) => s.x === cell.x && s.y === cell.y));
  return cell;
}

function spawnFruit(snake: Vec2[]): Fruit {
  const cell = randomFreeCell(snake);
  return { x: cell.x, y: cell.y, kind: randomFruitKind() };
}

function moveIntervalForLevel(level: number): number {
  return Math.max(MIN_MOVE_INTERVAL, BASE_MOVE_INTERVAL - (level - 1) * INTERVAL_STEP_PER_LEVEL);
}

export function initGame(): GameState {
  const startX = Math.floor(COLS / 2);
  const startY = Math.floor(ROWS / 2);
  const snake: Vec2[] = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ];
  const gs: GameState = {
    snake,
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    fruit: spawnFruit(snake),
    score: 0,
    level: 1,
    lives: 0,
    state: "playing",
    moveAccum: 0,
    moveInterval: moveIntervalForLevel(1),
  };
  return gs;
}

export function setDirection(gs: GameState, dx: number, dy: number) {
  if (gs.state === "gameover") return;
  if (dx === 0 && dy === 0) return;
  if (dx === -gs.dir.x && dy === -gs.dir.y) return;
  gs.nextDir = { x: dx, y: dy };
}

export function endGame(gs: GameState) {
  gs.state = "gameover";
}

function tick(gs: GameState) {
  gs.dir = gs.nextDir;
  const head = gs.snake[0];
  const newHead: Vec2 = { x: head.x + gs.dir.x, y: head.y + gs.dir.y };

  if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
    endGame(gs);
    return;
  }

  const ateFruit = newHead.x === gs.fruit.x && newHead.y === gs.fruit.y;
  const bodyToCheck = ateFruit ? gs.snake : gs.snake.slice(0, -1);
  if (bodyToCheck.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
    endGame(gs);
    return;
  }

  gs.snake.unshift(newHead);
  if (ateFruit) {
    gs.score += POINTS_PER_FRUIT;
    gs.level = Math.floor(gs.score / (POINTS_PER_FRUIT * LEVEL_UP_FRUITS)) + 1;
    gs.moveInterval = moveIntervalForLevel(gs.level);
    gs.fruit = spawnFruit(gs.snake);
  } else {
    gs.snake.pop();
  }
}

export function update(gs: GameState, dtMs: number) {
  if (gs.state === "gameover") return;
  gs.moveAccum += dtMs;
  while (gs.moveAccum >= gs.moveInterval && gs.state === "playing") {
    gs.moveAccum -= gs.moveInterval;
    tick(gs);
  }
}

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(BOARD_X + c * CELL, BOARD_Y);
    ctx.lineTo(BOARD_X + c * CELL, BOARD_Y + BOARD_H);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(BOARD_X, BOARD_Y + r * CELL);
    ctx.lineTo(BOARD_X + BOARD_W, BOARD_Y + r * CELL);
    ctx.stroke();
  }
}

function drawSnake(ctx: CanvasRenderingContext2D, gs: GameState) {
  gs.snake.forEach((seg, i) => {
    ctx.fillStyle = i === 0 ? SNAKE_HEAD : SNAKE_BODY;
    ctx.fillRect(BOARD_X + seg.x * CELL + 1, BOARD_Y + seg.y * CELL + 1, CELL - 2, CELL - 2);
  });
}

function drawFruit(ctx: CanvasRenderingContext2D, gs: GameState, fruitImg: HTMLImageElement | null) {
  if (!fruitImg || !fruitImg.complete) return;
  const atlas = FRUIT_ATLAS[gs.fruit.kind];
  if (!atlas) return;
  ctx.drawImage(
    fruitImg,
    atlas.x,
    atlas.y,
    atlas.w,
    atlas.h,
    BOARD_X + gs.fruit.x * CELL,
    BOARD_Y + gs.fruit.y * CELL,
    CELL,
    CELL,
  );
}

function drawPanel(ctx: CanvasRenderingContext2D, gs: GameState) {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#555570";
  ctx.font = "10px 'Courier New', monospace";
  ctx.fillText("NIVEL", PANEL_X, 20);
  ctx.fillStyle = "#7aa2f7";
  ctx.font = "bold 22px 'Courier New', monospace";
  ctx.fillText(String(gs.level), PANEL_X, 36);
}

function drawGameOverOverlay(ctx: CanvasRenderingContext2D, gs: GameState) {
  ctx.fillStyle = "rgba(10,10,20,0.85)";
  ctx.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);

  const cx = BOARD_X + BOARD_W / 2;
  const cy = BOARD_Y + BOARD_H / 2;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#e57373";
  ctx.font = "bold 32px 'Courier New', monospace";
  ctx.fillText("GAME OVER", cx, cy - 20);

  ctx.fillStyle = "#7aa2f7";
  ctx.font = "bold 18px 'Courier New', monospace";
  ctx.fillText(`PUNTOS: ${gs.score}`, cx, cy + 24);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

export function draw(
  ctx: CanvasRenderingContext2D,
  gs: GameState,
  W: number,
  H: number,
  fruitImg: HTMLImageElement | null,
) {
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = BOARD_BG;
  ctx.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);

  drawGrid(ctx);
  drawFruit(ctx, gs, fruitImg);
  drawSnake(ctx, gs);
  drawPanel(ctx, gs);

  if (gs.state === "gameover") {
    drawGameOverOverlay(ctx, gs);
  }
}
