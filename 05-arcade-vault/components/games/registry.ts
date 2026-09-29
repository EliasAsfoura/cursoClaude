import type { ForwardRefExoticComponent, RefAttributes } from "react";
import ArkanoidCanvas from "./ArkanoidCanvas";
import AsteroidsCanvas from "./AsteroidsCanvas";
import type { Skin } from "@/lib/skins";
import SnakeCanvas from "./SnakeCanvas";
import TetrisCanvas from "./TetrisCanvas";

export type GameCanvasProps = {
  paused: boolean;
  skin?: Skin;
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
  skins?: boolean;
};

export const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
  rocas: { Canvas: AsteroidsCanvas, hasLives: true, initialLives: 3, skins: true },
  tetris: { Canvas: TetrisCanvas, hasLives: false, initialLives: 0 },
  arkanoid: { Canvas: ArkanoidCanvas, hasLives: true, initialLives: 3, skins: true },
  snake: { Canvas: SnakeCanvas, hasLives: false, initialLives: 0, skins: true },
};
