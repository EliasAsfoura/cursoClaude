import type { ForwardRefExoticComponent, RefAttributes } from "react";
import AsteroidsCanvas from "./AsteroidsCanvas";
import TetrisCanvas from "./TetrisCanvas";

export type GameCanvasProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

export type GameCanvasHandle = {
  forceGameOver: () => void;
};

type GameRegistryEntry = {
  Canvas: ForwardRefExoticComponent<GameCanvasProps & RefAttributes<GameCanvasHandle>>;
  hasLives: boolean;
  initialLives: number;
};

export const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
  rocas: { Canvas: AsteroidsCanvas, hasLives: true, initialLives: 3 },
  tetris: { Canvas: TetrisCanvas, hasLives: false, initialLives: 0 },
};
