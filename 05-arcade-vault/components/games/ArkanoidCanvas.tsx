"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import {
  draw,
  endGame,
  initGame,
  update,
  type GameState,
  type Keys,
} from "./arkanoid-engine";
import type { GameCanvasHandle, GameCanvasProps } from "./registry";

const W = 800;
const H = 600;

const ArkanoidCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(
  function ArkanoidCanvas(
    { paused, onScoreChange, onLivesChange, onLevelChange, onGameOver },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gsRef = useRef<GameState>(initGame(W, H));
    const pausedRef = useRef(paused);
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

      const keys: Keys = {};

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.code === "ArrowLeft" || e.code === "ArrowRight") keys[e.code] = true;
      };
      const onKeyUp = (e: KeyboardEvent) => {
        if (e.code === "ArrowLeft" || e.code === "ArrowRight") keys[e.code] = false;
      };

      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);

      let lastTime: number | null = null;
      let rafId: number;

      const loop = (ts: number) => {
        const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
        lastTime = ts;

        const gs = gsRef.current;
        const prevScore = gs.score;
        const prevLives = gs.lives;
        const prevLevel = gs.level;
        const prevState = gs.state;

        if (!pausedRef.current) {
          update(gs, dt, W, H, keys);
        }
        draw(ctx, gs, W, H);

        if (gs.score !== prevScore) onScoreChange(gs.score);
        if (gs.lives !== prevLives) onLivesChange(gs.lives);
        if (gs.level !== prevLevel) onLevelChange(gs.level);
        const isOver = gs.state === "gameover" || gs.state === "win";
        const wasOver = prevState === "gameover" || prevState === "win";
        if (isOver && !wasOver && !gameOverFiredRef.current) {
          gameOverFiredRef.current = true;
          onGameOver(gs.score);
        }
        if (!isOver) gameOverFiredRef.current = false;

        rafId = requestAnimationFrame(loop);
      };

      rafId = requestAnimationFrame(loop);

      return () => {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        cancelAnimationFrame(rafId);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <canvas ref={canvasRef} width={W} height={H} />;
  },
);

export default ArkanoidCanvas;
