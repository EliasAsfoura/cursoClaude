"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  CANVAS_H,
  CANVAS_W,
  PALETTES,
  draw,
  endGame,
  initGame,
  queueMove,
  update,
  type Direction,
  type GameState,
} from "./frogger-engine";
import type { GameCanvasHandle, GameCanvasProps } from "./registry";

const KEY_DIRS: Record<string, Direction> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

const FroggerCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(function FroggerCanvas(
  { paused, skin = "clasico", onScoreChange, onLivesChange, onLevelChange, onGameOver },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GameState>(initGame());
  const pausedRef = useRef(paused);
  const skinRef = useRef(skin);
  const gameOverFiredRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    skinRef.current = skin;
  }, [skin]);

  useImperativeHandle(ref, () => ({
    forceGameOver() {
      const gs = gsRef.current;
      if (gs.state === "gameover") return;
      gs.lives = 0;
      endGame(gs);
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const dir = KEY_DIRS[e.code];
      if (!dir) return;
      if (e.code.startsWith("Arrow")) e.preventDefault();
      if (pausedRef.current) return;
      queueMove(gsRef.current, dir);
    };

    window.addEventListener("keydown", onKeyDown);

    let lastTime: number | null = null;
    let rafId: number;

    const loop = (ts: number) => {
      const dtMs = lastTime === null ? 0 : Math.min(ts - lastTime, 50);
      lastTime = ts;

      const gs = gsRef.current;
      const prevScore = gs.score;
      const prevLevel = gs.level;
      const prevLives = gs.lives;

      if (!pausedRef.current) update(gs, dtMs);
      draw(ctx, gs, CANVAS_W, CANVAS_H, PALETTES[skinRef.current]);

      if (gs.score !== prevScore) onScoreChange(gs.score);
      if (gs.level !== prevLevel) onLevelChange(gs.level);
      if (gs.lives !== prevLives) onLivesChange(gs.lives);
      if (gs.state === "gameover" && !gameOverFiredRef.current) {
        gameOverFiredRef.current = true;
        onGameOver(gs.score);
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} />;
});

export default FroggerCanvas;
