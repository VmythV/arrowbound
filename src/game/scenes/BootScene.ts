import * as Phaser from "phaser";
import { createGameServices, GAME_SERVICES_REGISTRY_KEY } from "../GameServices";
import { VISUAL_ASSETS } from "../config/asset-manifest";
import { SCENE_KEYS } from "../config/game.constants";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  preload(): void {
    for (const asset of VISUAL_ASSETS) {
      if (asset.loadPhase === "boot") {
        this.load.svg(asset.key, asset.path, { width: asset.width, height: asset.height });
      }
    }
  }

  create(): void {
    this.registry.set(GAME_SERVICES_REGISTRY_KEY, createGameServices());
    this.scene.start(SCENE_KEYS.preload);
  }
}
