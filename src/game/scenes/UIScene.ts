import * as Phaser from "phaser";
import { getGameServices, type GameServices } from "../GameServices";
import { ASSET_KEYS } from "../config/asset-manifest";
import { GAME_WIDTH, SCENE_KEYS } from "../config/game.constants";
import { LEVEL_CONFIGS } from "../config/level.config";

export class UIScene extends Phaser.Scene {
  private services: GameServices | undefined;
  private statusText: Phaser.GameObjects.Text | undefined;

  constructor() {
    super(SCENE_KEYS.ui);
  }

  create(): void {
    this.services = getGameServices(this.registry);
    this.add.image(GAME_WIDTH / 2, 52, ASSET_KEYS.hudPanel);
    this.add.text(42, 29, "ARROWBOUND", {
      color: "#fff1bd",
      fontFamily: "Georgia, serif",
      fontSize: "24px",
      fontStyle: "bold",
      letterSpacing: 2,
    });

    const firstLevel = LEVEL_CONFIGS[0];
    this.add
      .text(GAME_WIDTH - 42, 31, firstLevel === undefined ? "" : `第 1 关  ${firstLevel.name}`, {
        color: "#f8f1dc",
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
        fontSize: "20px",
      })
      .setOrigin(1, 0);

    this.statusText = this.add
      .text(GAME_WIDTH / 2, 675, "正在进入靶场", {
        color: "#e8ddc3",
        fontFamily: 'Inter, "Noto Sans SC", sans-serif',
        fontSize: "18px",
      })
      .setOrigin(0.5);

    this.services.events.on("game:ready", this.handleGameReady, this);
    this.services.events.on("shot:fired", this.handleShotFired, this);
    this.services.events.on("arrow:resolved", this.handleArrowResolved, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  private handleGameReady(): void {
    this.statusText?.setText("点击靶场或按空格键射箭");
  }

  private handleShotFired(): void {
    this.statusText?.setText("箭矢已射出");
  }

  private handleArrowResolved({ hit }: { hit: boolean }): void {
    this.statusText?.setText(hit ? "命中靶面" : "脱靶");
  }

  private handleShutdown(): void {
    this.services?.events.off("game:ready", this.handleGameReady, this);
    this.services?.events.off("shot:fired", this.handleShotFired, this);
    this.services?.events.off("arrow:resolved", this.handleArrowResolved, this);
    this.services = undefined;
    this.statusText = undefined;
  }
}
