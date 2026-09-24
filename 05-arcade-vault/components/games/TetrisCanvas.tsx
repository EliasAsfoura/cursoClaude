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
  hardDrop,
  initGame,
  moveLeft,
  moveRight,
  rotate,
  softDrop,
  update,
  type GameState,
} from "./tetris-engine";
import type { GameCanvasHandle, GameCanvasProps } from "./registry";

const W = 800;
const H = 600;

const TetrisCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(
  function TetrisCanvas(
    { paused, onScoreChange, onLivesChange, onLevelChange, onGameOver },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gsRef = useRef<GameState>(initGame());
    const pausedRef = useRef(paused);
    const gameOverFiredRef = useRef(false);

    useEffect(() => {
      pausedRef.current = paused;
    }, [paused]);

    useEffect(() => {
      onLivesChange(0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({
      forceGameOver() {
        const gs = gsRef.current;
        if (gs.state === "gameover") return;
        endGame(gs);
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const onKeyDown = (e: KeyboardEvent) => {
        if (pausedRef.current) return;
        const gs = gsRef.current;
        if (gs.state === "gameover") return;
        switch (e.code) {
          case "ArrowLeft":
            moveLeft(gs);
            break;
          case "ArrowRight":
            moveRight(gs);
            break;
          case "ArrowDown":
            softDrop(gs);
            break;
          case "ArrowUp":
          case "KeyX":
            rotate(gs);
            break;
          case "Space":
            e.preventDefault();
            hardDrop(gs);
            break;
          default:
            return;
        }
      };

      window.addEventListener("keydown", onKeyDown);

      let lastTime: number | null = null;
      let rafId: number;

      const loop = (ts: number) => {
        const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
        lastTime = ts;

        const gs = gsRef.current;
        const prevScore = gs.score;
        const prevLevel = gs.level;

        if (!pausedRef.current) {
          update(gs, dt * 1000);
        }
        draw(ctx, gs, W, H);

        if (gs.score !== prevScore) onScoreChange(gs.score);
        if (gs.level !== prevLevel) onLevelChange(gs.level);
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

    return <canvas ref={canvasRef} width={W} height={H} />;
  },
);

export default TetrisCanvas;
