import * as Phaser from "phaser";
import { getGameServices } from "../GameServices";
import { ASSET_KEYS, VISUAL_ASSETS } from "../config/asset-manifest";
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../config/game.constants";

export class PreloadScene extends Phaser.Scene {
  private loadingFill: Phaser.GameObjects.Image | undefined;
  private percentageText: Phaser.GameObjects.Text | undefined;

  constructor() {
    super(SCENE_KEYS.preload);
  }

  preload(): void {
    this.cameras.main.setBackgroundColor("#17253b");
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 25, ASSET_KEYS.loadingTrack);
    this.loadingFill = this.add
      .image(GAME_WIDTH / 2 - 232, GAME_HEIGHT / 2 + 25, ASSET_KEYS.loadingFill)
      .setOrigin(0, 0.5)
      .setScale(0, 1);
    this.percentageText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 34, "正在准备靶场 0%", {
        color: "#f8f1dc",
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
        fontSize: "24px",
      })
      .setOrigin(0.5);

    this.load.on(Phaser.Loader.Events.PROGRESS, this.handleProgress, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    for (const asset of VISUAL_ASSETS) {
      if (asset.loadPhase === "preload") {
        this.load.svg(asset.key, asset.path, { width: asset.width, height: asset.height });
      }
    }
  }

  create(): void {
    this.scene.start(SCENE_KEYS.mainGame);
  }

  private handleProgress(progress: number): void {
    this.loadingFill?.setScale(progress, 1);
    this.percentageText?.setText(`正在准备靶场 ${Math.round(progress * 100)}%`);
    getGameServices(this.registry).events.emit("assets:progress", { progress });
  }

  private handleShutdown(): void {
    this.load.off(Phaser.Loader.Events.PROGRESS, this.handleProgress, this);
    this.loadingFill = undefined;
    this.percentageText = undefined;
  }
}
