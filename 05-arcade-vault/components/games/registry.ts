import type { ForwardRefExoticComponent, RefAttributes } from "react";
import ArkanoidCanvas from "./ArkanoidCanvas";
import AsteroidsCanvas from "./AsteroidsCanvas";
import type { Skin } from "@/lib/skins";
import type { TouchButton } from "@/components/player/TouchControls";
import FroggerCanvas from "./FroggerCanvas";
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
  touch?: TouchButton[];
};

export const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
  rocas: {
    Canvas: AsteroidsCanvas,
    hasLives: true,
    initialLives: 3,
    skins: true,
    touch: [
      { code: "ArrowLeft", label: "◀", mode: "hold", area: "left" },
      { code: "ArrowRight", label: "▶", mode: "hold", area: "left" },
      { code: "ArrowUp", label: "▲", mode: "hold", area: "right" },
      { code: "Space", label: "DISPARO", mode: "tap", area: "right" },
    ],
  },
  tetris: {
    Canvas: TetrisCanvas,
    hasLives: false,
    initialLives: 0,
    touch: [
      { code: "ArrowLeft", label: "◀", mode: "repeat", area: "left" },
      { code: "ArrowDown", label: "▼", mode: "repeat", area: "left" },
      { code: "ArrowRight", label: "▶", mode: "repeat", area: "left" },
      { code: "ArrowUp", label: "ROTAR", mode: "tap", area: "right" },
      { code: "Space", label: "CAÍDA", mode: "tap", area: "right" },
    ],
  },
  arkanoid: {
    Canvas: ArkanoidCanvas,
    hasLives: true,
    initialLives: 3,
    skins: true,
    touch: [
      { code: "ArrowLeft", label: "◀", mode: "hold", area: "left", wide: true },
      { code: "ArrowRight", label: "▶", mode: "hold", area: "right", wide: true },
    ],
  },
  snake: {
    Canvas: SnakeCanvas,
    hasLives: false,
    initialLives: 0,
    skins: true,
    touch: [
      { code: "ArrowLeft", label: "◀", mode: "tap", area: "left" },
      { code: "ArrowRight", label: "▶", mode: "tap", area: "left" },
      { code: "ArrowUp", label: "▲", mode: "tap", area: "right" },
      { code: "ArrowDown", label: "▼", mode: "tap", area: "right" },
    ],
  },
  frogger: {
    Canvas: FroggerCanvas,
    hasLives: true,
    initialLives: 3,
    skins: true,
    touch: [
      { code: "ArrowLeft", label: "◀", mode: "tap", area: "left" },
      { code: "ArrowRight", label: "▶", mode: "tap", area: "left" },
      { code: "ArrowUp", label: "▲", mode: "tap", area: "right" },
      { code: "ArrowDown", label: "▼", mode: "tap", area: "right" },
    ],
  },
};
