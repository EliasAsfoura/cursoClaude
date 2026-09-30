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
  NEON_SPRITE_SIZE,
  PALETTES,
  renderNeonSegment,
  setDirection,
  update,
  type GameState,
  type NeonSprites,
} from "./snake-engine";
import type { GameCanvasHandle, GameCanvasProps } from "./registry";

const W = 800;
const H = 600;

const SnakeCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(
  function SnakeCanvas(
    { paused, skin = "clasico", onScoreChange, onLivesChange, onLevelChange, onGameOver },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gsRef = useRef<GameState>(initGame());
    const pausedRef = useRef(paused);
    const gameOverFiredRef = useRef(false);
    const fruitImgRef = useRef<HTMLImageElement | null>(null);
    const skinRef = useRef(skin);
    const neonRef = useRef<NeonSprites | null>(null);

    useEffect(() => {
      pausedRef.current = paused;
    }, [paused]);

    useEffect(() => {
      skinRef.current = skin;
      if (skin === "neon") {
        const pal = PALETTES.neon;
        const make = (isHead: boolean): HTMLCanvasElement => {
          const c = document.createElement("canvas");
          c.width = NEON_SPRITE_SIZE;
          c.height = NEON_SPRITE_SIZE;
          const c2 = c.getContext("2d");
          if (c2) renderNeonSegment(c2, pal, isHead);
          return c;
        };
        neonRef.current = { head: make(true), body: make(false) };
      } else {
        neonRef.current = null;
      }
    }, [skin]);

    useEffect(() => {
      onLivesChange(0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const img = new Image();
      img.src = "/games/snake/fruits.png";
      fruitImgRef.current = img;
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
          case "ArrowUp":
          case "KeyW":
            if (e.code === "ArrowUp") e.preventDefault();
            setDirection(gs, 0, -1);
            break;
          case "ArrowDown":
          case "KeyS":
            if (e.code === "ArrowDown") e.preventDefault();
            setDirection(gs, 0, 1);
            break;
          case "ArrowLeft":
          case "KeyA":
            if (e.code === "ArrowLeft") e.preventDefault();
            setDirection(gs, -1, 0);
            break;
          case "ArrowRight":
          case "KeyD":
            if (e.code === "ArrowRight") e.preventDefault();
            setDirection(gs, 1, 0);
            break;
          default:
            return;
        }
      };

      window.addEventListener("keydown", onKeyDown);

      let lastTime: number | null = null;
      let rafId: number;
      let pauseDrawn = false;

      const loop = (ts: number) => {
        const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
        lastTime = ts;

        const gs = gsRef.current;
        const prevScore = gs.score;
        const prevLevel = gs.level;

        if (pausedRef.current) {
          if (!pauseDrawn || gs.state === "gameover") {
            draw(ctx, gs, W, H, fruitImgRef.current, PALETTES[skinRef.current], neonRef.current);
            pauseDrawn = true;
          }
        } else {
          pauseDrawn = false;
          update(gs, dt * 1000);
          draw(ctx, gs, W, H, fruitImgRef.current, PALETTES[skinRef.current], neonRef.current);
        }

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

export default SnakeCanvas;
