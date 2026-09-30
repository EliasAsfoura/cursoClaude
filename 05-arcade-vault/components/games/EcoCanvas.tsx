"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { draw, endGame, H, initGame, update, W, type GameState, type Input } from "./eco-engine";
import type { GameCanvasHandle, GameCanvasProps } from "./registry";

const KEY_MAP: Record<string, keyof Input> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

const EcoCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(function EcoCanvas(
  { paused, onScoreChange, onLivesChange, onLevelChange, onGameOver },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GameState>(initGame());
  const pausedRef = useRef(paused);
  const inputRef = useRef<Input>({ left: false, right: false, up: false, down: false });
  const gameOverFiredRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useImperativeHandle(ref, () => ({
    forceGameOver() {
      const gs = gsRef.current;
      if (gs.state === "gameover" || gs.state === "win") return;
      endGame(gs);
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const input = inputRef.current;

    const onKeyDown = (e: KeyboardEvent) => {
      const key = KEY_MAP[e.code];
      if (!key) return;
      e.preventDefault();
      input[key] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const key = KEY_MAP[e.code];
      if (!key) return;
      e.preventDefault();
      input[key] = false;
    };
    const onBlur = () => {
      input.left = input.right = input.up = input.down = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    let prevScore = gsRef.current.score;
    let prevLives = gsRef.current.lives;
    let prevLevel = gsRef.current.level;
    onScoreChange(prevScore);
    onLivesChange(prevLives);
    onLevelChange(prevLevel);

    let lastTime: number | null = null;
    let rafId: number;

    const loop = (ts: number) => {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;

      const gs = gsRef.current;
      if (!pausedRef.current) update(gs, dt, input);
      draw(ctx, gs, W, H);

      if (gs.score !== prevScore) {
        prevScore = gs.score;
        onScoreChange(prevScore);
      }
      if (gs.lives !== prevLives) {
        prevLives = gs.lives;
        onLivesChange(prevLives);
      }
      if (gs.level !== prevLevel) {
        prevLevel = gs.level;
        onLevelChange(prevLevel);
      }
      if ((gs.state === "gameover" || gs.state === "win") && !gameOverFiredRef.current) {
        gameOverFiredRef.current = true;
        onGameOver(gs.score);
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} width={W} height={H} />;
});

export default EcoCanvas;
