const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const BOARD_W = COLS * BLOCK;
const BOARD_H = ROWS * BLOCK;
const BOARD_X = 165;
const BOARD_Y = 0;
const PANEL_X = BOARD_X + BOARD_W + 60;
const NEXT_BLOCK = 24;

const GRID_LINE = "#22222e";

const COLORS = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca (gris metálico)
] as const;

const PIECES: readonly (readonly number[][] | null)[] = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                              // O
  [[0,3,0],[3,3,3],[0,0,0]],                 // T
  [[0,4,4],[4,4,0],[0,0,0]],                 // S
  [[5,5,0],[0,5,5],[0,0,0]],                 // Z
  [[6,0,0],[6,6,6],[0,0,0]],                 // J
  [[0,0,7],[7,7,7],[0,0,0]],                 // L
  [[8,8,8],[8,0,8],[8,8,8]],                 // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

export type Board = number[][];

export type Piece = {
  type: number;
  shape: number[][];
  x: number;
  y: number;
};

export type GameStatus = "playing" | "gameover";

export type GameState = {
  board: Board;
  current: Piece;
  next: Piece;
  score: number;
  lines: number;
  level: number;
  lives: 0;
  state: GameStatus;
  dropAccum: number;
  dropInterval: number;
};

function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function cloneShape(shape: readonly number[][]): number[][] {
  return shape.map((row) => [...row]);
}

function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = cloneShape(PIECES[type] as readonly number[][]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

function collide(board: Board, shape: number[][], ox: number, oy: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: number[][] = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

export function rotate(gs: GameState) {
  if (gs.state === "gameover") return;
  const rotated = rotateCW(gs.current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(gs.board, rotated, gs.current.x + kick, gs.current.y)) {
      gs.current.shape = rotated;
      gs.current.x += kick;
      return;
    }
  }
}

function merge(gs: GameState) {
  for (let r = 0; r < gs.current.shape.length; r++)
    for (let c = 0; c < gs.current.shape[r].length; c++)
      if (gs.current.shape[r][c])
        gs.board[gs.current.y + r][gs.current.x + c] = gs.current.shape[r][c];
}

function clearLines(gs: GameState) {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (gs.board[r].every((v) => v !== 0)) {
      gs.board.splice(r, 1);
      gs.board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    gs.lines += cleared;
    gs.score += (LINE_SCORES[cleared] || 0) * gs.level;
    gs.level = Math.floor(gs.lines / 10) + 1;
    gs.dropInterval = Math.max(100, 1000 - (gs.level - 1) * 90);
  }
}

function ghostY(gs: GameState): number {
  let gy = gs.current.y;
  while (!collide(gs.board, gs.current.shape, gs.current.x, gy + 1)) gy++;
  return gy;
}

export function hardDrop(gs: GameState) {
  if (gs.state === "gameover") return;
  const gy = ghostY(gs);
  gs.score += (gy - gs.current.y) * 2;
  gs.current.y = gy;
  lockPiece(gs);
}

export function softDrop(gs: GameState) {
  if (gs.state === "gameover") return;
  if (!collide(gs.board, gs.current.shape, gs.current.x, gs.current.y + 1)) {
    gs.current.y++;
    gs.score += 1;
  } else {
    lockPiece(gs);
  }
}

export function moveLeft(gs: GameState) {
  if (gs.state === "gameover") return;
  if (!collide(gs.board, gs.current.shape, gs.current.x - 1, gs.current.y)) gs.current.x--;
}

export function moveRight(gs: GameState) {
  if (gs.state === "gameover") return;
  if (!collide(gs.board, gs.current.shape, gs.current.x + 1, gs.current.y)) gs.current.x++;
}

function lockPiece(gs: GameState) {
  merge(gs);
  clearLines(gs);
  spawn(gs);
}

function spawn(gs: GameState) {
  gs.current = gs.next;
  gs.next = randomPiece();
  if (collide(gs.board, gs.current.shape, gs.current.x, gs.current.y)) {
    endGame(gs);
  }
}

export function endGame(gs: GameState) {
  gs.state = "gameover";
}

export function update(gs: GameState, dtMs: number) {
  if (gs.state === "gameover") return;
  gs.dropAccum += dtMs;
  if (gs.dropAccum >= gs.dropInterval) {
    gs.dropAccum = 0;
    if (!collide(gs.board, gs.current.shape, gs.current.x, gs.current.y + 1)) {
      gs.current.y++;
    } else {
      lockPiece(gs);
    }
  }
}

export function initGame(): GameState {
  const gs: GameState = {
    board: createBoard(),
    current: randomPiece(),
    next: randomPiece(),
    score: 0,
    lines: 0,
    level: 1,
    lives: 0,
    state: "playing",
    dropAccum: 0,
    dropInterval: 1000,
  };
  return gs;
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorIndex: number,
  originX: number,
  originY: number,
  size: number,
  alpha = 1,
) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  if (!color) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(originX + x * size + 1, originY + y * size + 1, size - 2, size - 2);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(originX + x * size + 1, originY + y * size + 1, size - 2, 4);
  ctx.globalAlpha = 1;
}

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(BOARD_X + c * BLOCK, BOARD_Y);
    ctx.lineTo(BOARD_X + c * BLOCK, BOARD_Y + BOARD_H);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(BOARD_X, BOARD_Y + r * BLOCK);
    ctx.lineTo(BOARD_X + BOARD_W, BOARD_Y + r * BLOCK);
    ctx.stroke();
  }
}

function drawPanel(ctx: CanvasRenderingContext2D, gs: GameState) {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#555570";
  ctx.font = "10px 'Courier New', monospace";
  ctx.fillText("NEXT", PANEL_X, 20);

  const nextBoxY = 40;
  const nextShape = gs.next.shape;
  const offX = Math.floor((4 - nextShape[0].length) / 2);
  const offY = Math.floor((4 - nextShape.length) / 2);
  for (let r = 0; r < nextShape.length; r++)
    for (let c = 0; c < nextShape[r].length; c++)
      drawBlock(ctx, offX + c, offY + r, nextShape[r][c], PANEL_X, nextBoxY, NEXT_BLOCK);

  const linesY = nextBoxY + 4 * NEXT_BLOCK + 30;
  ctx.fillStyle = "#555570";
  ctx.font = "10px 'Courier New', monospace";
  ctx.fillText("LINEAS", PANEL_X, linesY);
  ctx.fillStyle = "#7aa2f7";
  ctx.font = "bold 22px 'Courier New', monospace";
  ctx.fillText(String(gs.lines), PANEL_X, linesY + 16);
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

export function draw(ctx: CanvasRenderingContext2D, gs: GameState, W: number, H: number) {
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = "#1a1a25";
  ctx.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);

  drawGrid(ctx);

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, gs.board[r][c], BOARD_X, BOARD_Y, BLOCK);

  const gy = ghostY(gs);
  for (let r = 0; r < gs.current.shape.length; r++)
    for (let c = 0; c < gs.current.shape[r].length; c++)
      if (gs.current.shape[r][c])
        drawBlock(ctx, gs.current.x + c, gy + r, gs.current.shape[r][c], BOARD_X, BOARD_Y, BLOCK, 0.2);

  for (let r = 0; r < gs.current.shape.length; r++)
    for (let c = 0; c < gs.current.shape[r].length; c++)
      drawBlock(ctx, gs.current.x + c, gs.current.y + r, gs.current.shape[r][c], BOARD_X, BOARD_Y, BLOCK);

  drawPanel(ctx, gs);

  if (gs.state === "gameover") {
    drawGameOverOverlay(ctx, gs);
  }
}
