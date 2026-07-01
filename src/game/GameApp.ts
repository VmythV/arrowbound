import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "./config/game.constants";
import { BootScene } from "./scenes/BootScene";
import { MainGameScene } from "./scenes/MainGameScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { UIScene } from "./scenes/UIScene";

export function createGame(parent: string | HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    title: "arrowbound",
    parent,
    backgroundColor: "#17253b",
    render: {
      antialias: true,
      roundPixels: false,
      powerPreference: "high-performance",
    },
    input: {
      keyboard: true,
      mouse: true,
      touch: false,
      gamepad: false,
      activePointers: 1,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    scene: [BootScene, PreloadScene, MainGameScene, UIScene],
  };

  return new Phaser.Game(config);
}
